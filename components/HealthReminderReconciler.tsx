"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { reconcileHealthReminderNotifications } from "@/lib/health-reminders/scheduler";

export const HEALTH_REMINDERS_RECONCILE_EVENT = "vault:health-reminders-reconcile";

export function HealthReminderReconciler() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePersonId, changePerson } = useActivePersonId();
  const reminders = useLiveQuery(
    () => user
      ? db.health_reminders.where("user_id").equals(user.id).toArray()
      : [],
    [user?.id]
  );

  const reconcile = useCallback(() => {
    if (!reminders) return;
    void reconcileHealthReminderNotifications(reminders).catch((error) =>
      console.error("[Health reminders] Falha ao reconciliar:", error)
    );
  }, [reminders]);

  useEffect(() => {
    reconcile();
  }, [reconcile]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handleManualReconcile = () => reconcile();
    window.addEventListener(HEALTH_REMINDERS_RECONCILE_EVENT, handleManualReconcile);
    let removeResume: (() => void) | undefined;
    void App.addListener("resume", reconcile).then((handle) => {
      removeResume = () => void handle.remove();
    });
    return () => {
      window.removeEventListener(HEALTH_REMINDERS_RECONCILE_EVENT, handleManualReconcile);
      removeResume?.();
    };
  }, [reconcile]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;
    let removeAction: (() => void) | undefined;
    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      ({ notification }) => {
        const extra = notification.extra as { reminderId?: string } | undefined;
        void (async () => {
          if (!extra?.reminderId) return;
          const rule = await db.health_reminders.get(extra.reminderId);
          if (!rule || rule.user_id !== user.id || rule.status !== "active") return;
          const person = await db.persons.get(rule.person_id);
          if (!person || person.user_id !== user.id) return;
          if (rule.person_id !== activePersonId) await changePerson(rule.person_id);
          router.push(rule.target_route);
        })().catch((error) =>
          console.error("[Health reminder navigation]", error)
        );
      }
    ).then((handle) => {
      removeAction = () => void handle.remove();
    });
    return () => removeAction?.();
  }, [user, activePersonId, changePerson, router]);

  return null;
}
