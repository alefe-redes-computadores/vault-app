"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { isVaultNative } from "@/lib/native-runtime";
import { reconcileHealthReminderNotifications } from "@/lib/health-reminders/scheduler";
import {
  reconcileHealthEventNotifications,
  type HealthEventNotificationInput,
} from "@/lib/health-reminders/event-scheduler";

export const HEALTH_REMINDERS_RECONCILE_EVENT =
  "vault:health-reminders-reconcile";

type NotificationExtra = {
  reminderId?: string;
  vaultHealthEvent?: boolean;
  userId?: string;
  personId?: string;
  targetRoute?: string;
  vaultHealthInsight?: boolean;
  insightId?: string;
};

export function HealthReminderReconciler() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId, changePerson } = useActivePersonId();

  const notificationContext = useLiveQuery(
    async () => {
      if (!user) {
        return {
          reminders: [],
          events: [] as HealthEventNotificationInput[],
        };
      }

      const [reminders, consultas, exames, retiradas] = await Promise.all([
        db.health_reminders.where("user_id").equals(user.id).toArray(),
        db.consultas.where("user_id").equals(user.id).toArray(),
        db.exames.where("user_id").equals(user.id).toArray(),
        db.retiradas.where("user_id").equals(user.id).toArray(),
      ]);

      /*
       * V36.1:
       * Os tipos históricos de Consulta/Exame/Retirada ainda admitem
       * id/person_id opcionais, embora os repositories persistam ambos.
       * Não usamos non-null assertion: registro incompleto simplesmente
       * não vira alarme nativo.
       *
       * Exame não possui campo status no contrato atual. Para ele,
       * existência + data/hora futura é o contrato de agenda. A exclusão
       * remove o registro e a próxima reconciliação remove o alarme.
       */
      const events: HealthEventNotificationInput[] = [];

      for (const item of consultas) {
        const id = item.id?.trim();
        const personId = item.person_id?.trim();
        const eventUserId = item.user_id?.trim();
        if (!id || !personId || !eventUserId) continue;

        events.push({
          id,
          userId: eventUserId,
          personId,
          kind: "consulta",
          title: item.motivo?.trim() || "Consulta agendada",
          date: item.data,
          time: item.horario,
          status: item.status,
          targetRoute: `/saude/consultas/detalhes?id=${encodeURIComponent(id)}`,
        });
      }

      for (const item of exames) {
        const id = item.id?.trim();
        const personId = item.person_id?.trim();
        const eventUserId = item.user_id?.trim();
        if (!id || !personId || !eventUserId) continue;

        events.push({
          id,
          userId: eventUserId,
          personId,
          kind: "exame",
          title: item.nome?.trim() || "Exame agendado",
          date: item.data,
          time: item.horario,
          status: "agendada",
          targetRoute: `/saude/exames/detalhes?id=${encodeURIComponent(id)}`,
        });
      }

      for (const item of retiradas) {
        const id = item.id?.trim();
        const personId = item.person_id?.trim();
        const eventUserId = item.user_id?.trim();
        if (!id || !personId || !eventUserId) continue;

        events.push({
          id,
          userId: eventUserId,
          personId,
          kind: "retirada",
          title:
            item.medicamento_nome?.trim() ||
            item.medicamento_dosagem?.trim() ||
            "Retirada de medicamento",
          date: item.data,
          time: item.horario,
          status: item.status,
          targetRoute: `/saude/retiradas/detalhes?id=${encodeURIComponent(id)}`,
        });
      }

      return { reminders, events };
    },
    [user?.id]
  );

  const reconcile = useCallback(() => {
    if (!notificationContext) return;

    void Promise.all([
      reconcileHealthReminderNotifications(notificationContext.reminders),
      reconcileHealthEventNotifications(notificationContext.events),
    ]).catch((error) =>
      console.error("[Health notifications] Falha ao reconciliar:", error)
    );
  }, [notificationContext]);

  useEffect(() => {
    reconcile();
  }, [reconcile]);

  useEffect(() => {
    if (!isVaultNative()) return;

    const handleManualReconcile = () => reconcile();
    window.addEventListener(
      HEALTH_REMINDERS_RECONCILE_EVENT,
      handleManualReconcile
    );

    let removeResume: (() => void) | undefined;

    void App.addListener("resume", reconcile).then((handle) => {
      removeResume = () => void handle.remove();
    });

    return () => {
      window.removeEventListener(
        HEALTH_REMINDERS_RECONCILE_EVENT,
        handleManualReconcile
      );
      removeResume?.();
    };
  }, [reconcile]);

  useEffect(() => {
    if (!isVaultNative() || !user) return;

    let removeAction: (() => void) | undefined;

    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      ({ notification }) => {
        const extra = notification.extra as NotificationExtra | undefined;

        void (async () => {
          if (extra?.reminderId) {
            const rule = await db.health_reminders.get(extra.reminderId);

            if (
              !rule ||
              rule.user_id !== user.id ||
              rule.status !== "active"
            ) {
              return;
            }

            const person = await db.persons.get(rule.person_id);
            if (!person || person.user_id !== user.id) return;

            if (rule.person_id !== activePersonId) {
              await changePerson(rule.person_id);
            }

            router.push(rule.target_route);
            return;
          }

          // VAULT_NOTIFICATION_INSIGHT_DEEPLINK_V51
          if (
            extra?.vaultHealthInsight === true &&
            extra.personId &&
            extra.targetRoute?.startsWith("/")
          ) {
            const person = await db.persons.get(extra.personId);
            if (!person || person.user_id !== user.id) return;
            if (extra.personId !== activePersonId) {
              await changePerson(extra.personId);
            }
            router.push(extra.targetRoute);
            return;
          }

          if (
            extra?.vaultHealthEvent === true &&
            extra.userId === user.id &&
            extra.personId &&
            extra.targetRoute?.startsWith("/saude/")
          ) {
            const person = await db.persons.get(extra.personId);
            if (!person || person.user_id !== user.id) return;

            if (extra.personId !== activePersonId) {
              await changePerson(extra.personId);
            }

            router.push(extra.targetRoute);
          }
        })().catch((error) =>
          console.error("[Health notification navigation]", error)
        );
      }
    ).then((handle) => {
      removeAction = () => void handle.remove();
    });

    return () => removeAction?.();
  }, [user, activePersonId, changePerson, router]);

  return null;
}
