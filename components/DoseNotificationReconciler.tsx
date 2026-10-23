"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { reconcileScheduledDoseNotifications } from "@/lib/dose-notifications";
import { reconcileOverdueDoseNotifications } from "@/lib/overdue-dose-notifications";
import { createDoseNotificationPipeline } from "@/lib/dose-notification-pipeline";
import { VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";
import type { DoseLog, Medicamento } from "@/lib/types";

// VAULT_DOSE_NOTIFICATION_RECONCILER_V91
// V228: pipeline singleton sequencial; preserva apenas o snapshot mais novo.
const doseNotificationPipeline = createDoseNotificationPipeline(
  reconcileScheduledDoseNotifications,
  reconcileOverdueDoseNotifications
);
export function DoseNotificationReconciler() {
  const { activePersonId } = useActivePersonId();
  const [preferenceRevision, setPreferenceRevision] = useState(0);

  const medicamentos = useLiveQuery(
    () =>
      activePersonId
        ? db.medicamentos.where("person_id").equals(activePersonId).toArray()
        : Promise.resolve([] as Medicamento[]),
    [activePersonId]
  );

  const logs = useLiveQuery(
    () =>
      activePersonId
        ? db.doseLogs.where("person_id").equals(activePersonId).toArray()
        : Promise.resolve([] as DoseLog[]),
    [activePersonId]
  );

  useEffect(() => {
    const refresh = () => setPreferenceRevision((value) => value + 1);
    window.addEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
    return () => window.removeEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!activePersonId || medicamentos === undefined || logs === undefined) return;

    void doseNotificationPipeline.enqueue({
      personId: activePersonId,
      medicamentos,
      logs,
    }).catch((error) => {
      console.error("[DoseNotificationReconciler V228]", error);
    });
    return () => doseNotificationPipeline.invalidate();
  }, [activePersonId, medicamentos, logs, preferenceRevision]);

  return null;
}
