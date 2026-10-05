"use client";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { db } from "@/lib/db";
import { brainV5Counters,rankBrainV5,type BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
export function useBrainV5Pulse(){
 const {user}=useAuth(); const {activePersonId}=useActivePersonId();
 const settings=useLiveQuery(()=>user?.id?db.settings.where("user_id").equals(user.id).first():undefined,[user?.id]) as ({brain_v5_alert_ledger?:BrainV5Alert[]}|undefined);
 const records=useMemo(()=>activePersonId&&Array.isArray(settings?.brain_v5_alert_ledger)?settings!.brain_v5_alert_ledger!.filter(x=>x.person_id===activePersonId):[],[settings,activePersonId]);
 const ranked=useMemo(()=>rankBrainV5(records.filter(x=>x.state!=="resolved")),[records]);
 return {counters:brainV5Counters(records),top:ranked[0]??null,isLoading:Boolean(user?.id&&settings===undefined)};
}
