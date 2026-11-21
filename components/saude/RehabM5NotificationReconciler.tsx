'use client';
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { reconcileRehabNotificationsM5 } from '@/lib/rehab-m5/notifications';
import { HEALTH_REMINDERS_RECONCILE_EVENT } from '@/components/HealthReminderReconciler';
export function RehabM5NotificationReconciler(){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();
 const uid=user?.id||'',pid=activePersonId||'';
 const snapshot=useLiveQuery(async()=>{
  if(!uid||!pid)return {uid,pid,programs:[],sessions:[]};
  const [person,programs,sessions]=await Promise.all([db.persons.get(pid),
   db.rehab_programs_m5.where('user_id').equals(uid).toArray(),db.rehab_sessions_m5.where('user_id').equals(uid).toArray()]);
  if(person?.user_id!==uid)return {uid,pid,programs:[],sessions:[]};
  return {uid,pid,programs:programs.filter(p=>p.person_id===pid),sessions:sessions.filter(s=>s.person_id===pid)};
 },[uid,pid]);
 useEffect(()=>{
  if(!snapshot||snapshot.uid!==uid||snapshot.pid!==pid)return;
  let cancelled=false;
  const run=()=>{if(!cancelled)void reconcileRehabNotificationsM5({userId:uid,personId:pid,
   programs:snapshot.programs,sessions:snapshot.sessions}).catch(()=>{/* native settings may deny; never mark delivered */});};
  run();window.addEventListener(HEALTH_REMINDERS_RECONCILE_EVENT,run);
  return ()=>{cancelled=true;window.removeEventListener(HEALTH_REMINDERS_RECONCILE_EVENT,run);};
 },[snapshot,uid,pid]);
 return null;
}
