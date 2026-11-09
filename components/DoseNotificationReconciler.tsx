"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { reconcileScheduledDoseNotifications } from "@/lib/dose-notifications";
import { reconcileOverdueDoseNotifications } from "@/lib/overdue-dose-notifications";
import { createDoseNotificationPipeline } from "@/lib/dose-notification-pipeline";
import { reconcileSnoozedDoseNotificationsM99P3 } from "@/lib/dose-snooze-m99p3";
import { VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";
import { useNotificationRecoveryM99P2 } from "@/hooks/useNotificationRecoveryM99P2";

// VAULT_DOSE_NOTIFICATION_RECONCILER_V91
// V228: pipeline singleton sequencial; preserva apenas o snapshot mais novo.
// M99 P3: a mesma fila, o mesmo snapshot e a mesma assinatura transacional V91.
const doseNotificationPipeline = createDoseNotificationPipeline(
  async snapshot => {
    await reconcileScheduledDoseNotifications(snapshot);
    await reconcileSnoozedDoseNotificationsM99P3(snapshot);
  },
  reconcileOverdueDoseNotifications
);
export function DoseNotificationReconciler() {
  const { activePersonId } = useActivePersonId();
  const { user } = useAuth();
  const [preferenceRevision, setPreferenceRevision] = useState(0);
  const recoveryRevision = useNotificationRecoveryM99P2();

  useEffect(() => {
    if (recoveryRevision > 0) setPreferenceRevision((value) => value + 1);
  }, [recoveryRevision]);

  const snapshot = useLiveQuery(async()=>{
    if(!activePersonId||!user?.id)return null;
    const owner=[user.id,activePersonId] as [string,string];
    const [medicamentos,logs]=await db.transaction("r",[db.medicamentos,db.doseLogs],()=>Promise.all([
      db.medicamentos.where("[user_id+person_id]").equals(owner).toArray(),
      db.doseLogs.where("[user_id+person_id]").equals(owner).toArray(),
    ]));
    return {userId:user.id,personId:activePersonId,medicamentos,logs};
  },[activePersonId,user?.id]);

  useEffect(() => {
    const refresh = () => setPreferenceRevision((value) => value + 1);
    window.addEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
    return () => window.removeEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT, refresh);
  }, []);

  // M66: invalidate only on owner change or unmount. Invalidation on every
  // Dexie emission would defeat idempotent reconciliation of identical data.
  useEffect(() => {
    if (!activePersonId || !user?.id) doseNotificationPipeline.invalidate();
    return () => doseNotificationPipeline.invalidate();
  }, [activePersonId, user?.id]);

  useEffect(() => {
    if (!activePersonId || !user?.id || !snapshot || snapshot.userId!==user.id || snapshot.personId!==activePersonId) return;

    void doseNotificationPipeline.enqueue({
      userId: user.id,
      refreshKey: preferenceRevision,
      personId: activePersonId,
      medicamentos:snapshot.medicamentos,
      logs:snapshot.logs,
    }).catch((error) => {
      console.error("[DoseNotificationReconciler V228]", error);
    });
  }, [activePersonId, user?.id, snapshot, preferenceRevision]);

  return null;
}
