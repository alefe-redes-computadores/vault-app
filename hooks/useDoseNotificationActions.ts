"use client";
import { isVaultNative } from "@/lib/native-runtime";
import { useRouter } from "next/navigation";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useToast } from "@/components/ToastProvider";
import { db } from "@/lib/db";
import { getLocalFirstAuthUser } from "@/lib/supabase/local-auth";
import { stageNativeDoseReview } from "@/lib/dose-premium/native-review";
import { captureHomeDoseReview } from "@/lib/dose-premium/home-review";
import { runAfterVaultBiometricUnlock } from "@/lib/notification-navigation";
// hooks/useDoseNotificationActions.ts

import {
  useEffect, useRef,
} from "react";

import {
  Capacitor,
} from "@capacitor/core";

import {
  LocalNotifications,
} from "@capacitor/local-notifications";

import {
  doseLogsRepository,
} from "@/lib/repositories/doseLogs";

import { cancelOverdueDoseNotification } from "@/lib/overdue-dose-notifications";
import { snoozeDoseReminderM99P3 } from "@/lib/dose-snooze-m99p3";
import { canApplyNativeDoseActionM103 } from "@/lib/dose-action-safety-m103";

import {
  addDaysToLocalDate,
  getLocalTodayISO,
} from "@/lib/health-utils";

type DoseReminderExtra = {
  type?: string;
  medicamentoId?: string;
  personId?: string;
  horario?: string;
  data?: string;
};

function isValidHorario(
  value: unknown
): value is string {
  if (
    typeof value !==
    "string" ||
    !/^\d{2}:\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    hour,
    minute,
  ] =
    value
      .split(":")
      .map(Number);

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function resolveDoseNotificationSlotDate(
  horario:
    string,
  now:
    Date = new Date()
): string {
  const today =
    getLocalTodayISO();

  const [
    scheduledHour,
    scheduledMinute,
  ] =
    horario
      .split(
        ":"
      )
      .map(
        Number
      );

  const currentMinutes =
    now.getHours() *
      60 +
    now.getMinutes();

  const scheduledMinutes =
    scheduledHour *
      60 +
    scheduledMinute;

  /*
   * A notificação é recorrente e não carrega uma data de slot
   * diferente a cada repetição.
   *
   * Portanto associamos a ação ao slot MAIS RECENTE daquele
   * horário no relógio local:
   *
   * - 23:00 clicado às 00:20 -> ontem;
   * - 08:00 clicado às 08:30 -> hoje;
   * - 08:00 clicado às 07:30 -> ontem.
   *
   * Isso impede que uma notificação pendente atravessando
   * meia-noite crie uma dose no dia errado.
   */
  if (
    currentMinutes <
    scheduledMinutes
  ) {
    const yesterday =
      addDaysToLocalDate(
        today,
        -1
      );

    return (
      yesterday ||
      today
    );
  }

  return today;
}

function getDoseReminderExtra(
  value: unknown
): DoseReminderExtra | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  return value as DoseReminderExtra;
}

export function useDoseNotificationActions() {
  const router=useRouter();
  const {activePersonId,changePerson}=useActivePersonId();
  const {showToast}=useToast();
  const currentNavigation=useRef({router,activePersonId,changePerson,showToast});
  currentNavigation.current={router,activePersonId,changePerson,showToast};
  useEffect(
    () => {
      if (
        !isVaultNative()
      ) {
        return;
      }

      let cancelled =
        false;

      const listenerPromise =
        LocalNotifications.addListener(
          "localNotificationActionPerformed",
          async (
            event
          ) => {
            try {
              if (
                cancelled
              ) {
                return;
              }

              const extra =
                getDoseReminderExtra(
                  event.notification
                    ?.extra
                );

              if (
                !extra ||
                (
                  extra.type !== "dose_reminder" &&
                  extra.type !== "dose_planned" &&
                  extra.type !== "dose_overdue"
                )
              ) {
                return;
              }

              const medicamentoId =
                extra.medicamentoId
                  ?.trim();

              const personId =
                extra.personId
                  ?.trim();

              const horario =
                extra.horario;

              /*
               * Nunca tentamos inferir a pessoa a partir da
               * pessoa ativa do aplicativo.
               *
               * A própria notificação precisa carregar o dono
               * do registro clínico.
               */
              if (
                !medicamentoId ||
                !personId ||
                !isValidHorario(
                  horario
                )
              ) {
                console.warn(
                  "[useDoseNotificationActions] Notificação de dose sem dados suficientes.",
                  {
                    medicamentoId,
                    personId,
                    horario,
                  }
                );

                return;
              }

              // VAULT_NOTIFICATION_EXACT_SLOT_V51
              const exactNotificationDate =
                (extra.type === "dose_overdue" || extra.type === "dose_reminder" || extra.type === "dose_planned") &&
                typeof extra.data === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(extra.data)
                  ? extra.data
                  : null;

              const slotDate =
                exactNotificationDate ??
                resolveDoseNotificationSlotDate(
                  horario
                );

              // M99 P3: nenhuma escrita clínica, exige data exata da notificação.
              if (event.actionId === "ADIAR") {
                if (!exactNotificationDate) return;
                await snoozeDoseReminderM99P3({
                  type: extra.type, personId, medicamentoId,
                  data: exactNotificationDate, horario,
                });
                return;
              }

              // M103 P2: nunca gravar em data inferida de alarme legado ou
              // obsoleto; revisão histórica continua disponível no app.
              if ((event.actionId === "TOMEI" || event.actionId === "IGNORAR") &&
                  !canApplyNativeDoseActionM103({data: exactNotificationDate, horario, personId, medicamentoId})) return;

              if(event.actionId!=="TOMEI"&&event.actionId!=="IGNORAR")return;
              // A native action does not carry the administered quantity or unit.
              // Verify real ownership first; never infer a person from the active profile.
              const {data:session,error:sessionError}=await getLocalFirstAuthUser();
              const uid=session.user?.id;
              if(cancelled||sessionError||!uid)return;
              const [person,medication]=await Promise.all([db.persons.get(personId),db.medicamentos.get(medicamentoId)]);
              if(cancelled||!person||person.user_id!==uid||!medication||medication.user_id!==uid||medication.person_id!==personId)return;
              const scope={user_id:uid,person_id:personId,medicamento_id:medicamentoId,data:slotDate,horario};
              const rows=await doseLogsRepository.getAll(personId,slotDate,uid);
              const review=captureHomeDoseReview(scope,rows,undefined);
              if(review.blocked)return;
              const latest=await getLocalFirstAuthUser();
              if(cancelled||latest.error||latest.data.user?.id!==uid)return;
              if(event.actionId==="TOMEI"){
                // The foreground review uses today's canonical timeline. No fabricated
                // quantity, no automatic debit and no cancellation before a real save.
                if(currentNavigation.current.activePersonId!==personId)await currentNavigation.current.changePerson(personId);
                const afterSwitch=await getLocalFirstAuthUser();
                if(cancelled||afterSwitch.error||afterSwitch.data.user?.id!==uid)return;
                const href=stageNativeDoseReview({user_id:uid,person_id:personId,medicationId:medicamentoId,day:slotDate,hour:horario});
                runAfterVaultBiometricUnlock(()=>currentNavigation.current.router.push(href));
                return;
              }
              // Ignorar is an explicit non-administration, but not a future clinical fact.
              if(new Date(`${slotDate}T${horario}:00`).getTime()>Date.now())return;
              // A stale recurring notification is not proof of an expected slot.
              // For absent rows, require an active current schedule on the current day.
              // Older absent slots are reviewed in Hoje, never reconstructed here.
              if(!review.expected&&(slotDate!==getLocalTodayISO()||medication.status==='descontinuado'||medication.tipo_uso==='temporario'||medication.tipo_uso==='sos'||medication.tipo_uso==='esporadico'||!medication.estoque_horarios?.includes(horario)||[medication.created_at?.slice(0,10),medication.estoque_data_referencia,medication.data_receita].some(start=>start&&start>slotDate)))return;
              await doseLogsRepository.setStatus({personId,medicamentoId,data:slotDate,horario,status:"ignored",expected:review.expected,onlyIfPending:true,adjustStock:false});
              await cancelOverdueDoseNotification({personId,medicamentoId,data:slotDate,horario});
            } catch (
              error
            ) {
              console.error(
                "[useDoseNotificationActions] Erro ao processar ação da notificação:",
                error
              );
              if(!cancelled)currentNavigation.current.showToast("Não foi possível resolver a dose pela notificação. Confira em Hoje.","error");
            }
          }
        );

      return () => {
        cancelled =
          true;

        void listenerPromise
          .then(
            (
              listener
            ) =>
              listener.remove()
          )
          .catch(
            (
              error
            ) => {
              console.error(
                "[useDoseNotificationActions] Erro ao remover listener:",
                error
              );
            }
          );
      };
    },
    []
  );
}
