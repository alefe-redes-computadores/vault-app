"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { DoseLog, Medicamento } from "@/lib/types";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { VAULT_NOTIFICATION_PREFERENCES_EVENT } from "@/lib/notification-preferences";
import { reconcileScheduledDoseNotifications } from "@/lib/dose-notifications";

// VAULT_SCHEDULED_DOSE_RECONCILER_COMPONENT_V51
export function ScheduledDoseNotificationReconciler(){
  const {activePersonId}=useActivePersonId();
  const [preferenceRevision,setPreferenceRevision]=useState(0);
  const medicamentos=useLiveQuery(
    ()=>activePersonId ? db.medicamentos.where("person_id").equals(activePersonId).toArray() : Promise.resolve([] as Medicamento[]),
    [activePersonId],[] as Medicamento[]
  ) || [];
  const logs=useLiveQuery(
    ()=>activePersonId ? db.doseLogs.where("person_id").equals(activePersonId).toArray() : Promise.resolve([] as DoseLog[]),
    [activePersonId],[] as DoseLog[]
  ) || [];

  useEffect(()=>{
    const refresh=()=>setPreferenceRevision(v=>v+1);
    window.addEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT,refresh);
    return()=>window.removeEventListener(VAULT_NOTIFICATION_PREFERENCES_EVENT,refresh);
  },[]);

  useEffect(()=>{
    if(!activePersonId) return;
    void reconcileScheduledDoseNotifications({personId:activePersonId,medicamentos,logs})
      .catch(error=>console.error("[ScheduledDoseNotificationReconciler]",error));
  },[activePersonId,medicamentos,logs,preferenceRevision]);
  return null;
}
