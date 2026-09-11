"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { reconcileHealthReminderNotifications } from "@/lib/health-reminders/scheduler";

export function HealthReminderReconciler(){
  const router=useRouter();const{user}=useAuth();const{activePersonId,changePerson}=useActivePersonId();
  const reminders=useLiveQuery(()=>user?db.health_reminders.where("user_id").equals(user.id).toArray():[],[user?.id]);
  useEffect(()=>{if(reminders)void reconcileHealthReminderNotifications(reminders).catch(e=>console.error("[Health reminders]",e))},[reminders]);
  useEffect(()=>{if(!Capacitor.isNativePlatform()||!user)return;let remove:(()=>void)|undefined;void LocalNotifications.addListener("localNotificationActionPerformed",({notification})=>{const extra=notification.extra as {reminderId?:string}|undefined;void(async()=>{if(!extra?.reminderId)return;const rule=await db.health_reminders.get(extra.reminderId);if(!rule||rule.user_id!==user.id||rule.status!=="active")return;if(rule.person_id!==activePersonId)await changePerson(rule.person_id);router.push(rule.target_route)})().catch(e=>console.error("[Health reminder navigation]",e))}).then(h=>{remove=()=>void h.remove()});return()=>remove?.()},[user,activePersonId,changePerson,router]);
  return null;
}
