"use client";
import { useCallback,useEffect,useMemo,useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";
import { db } from "@/lib/db";
import { brainV5Counters,rankBrainV5,reconcileBrainV5,type BrainV5Alert,type BrainV5Feedback,type BrainV5State } from "@/lib/health-intelligence/brain-v5";
import { brainV5AlertLedgerRepository as repo } from "@/lib/repositories/brainV5AlertLedger";

export function useBrainV5Alerts(){
  const {user}=useAuth(); const {activePersonId}=useActivePersonId(); const health=useHealthIntelligence(); const writing=useRef(false);
  const settings=useLiveQuery(()=>user?.id?db.settings.where("user_id").equals(user.id).first():undefined,[user?.id]) as ({brain_v5_alert_ledger?:BrainV5Alert[]}|undefined);
  const stored=useMemo(()=>Array.isArray(settings?.brain_v5_alert_ledger)?settings!.brain_v5_alert_ledger!:[],[settings]);
  const scoped=useMemo(()=>activePersonId?stored.filter(x=>x.person_id===activePersonId):[],[stored,activePersonId]);

  useEffect(()=>{
    if(!user?.id||!activePersonId||health.isLoading||writing.current)return;
    const next=reconcileBrainV5(activePersonId,health.insights,stored);
    const shape=(xs:BrainV5Alert[])=>JSON.stringify(xs.map(x=>[x.key,x.state,x.feedback,x.severity_rank,x.material_fingerprint,x.occurrences,x.episode,x.resolved_at]));
    if(shape(next)===shape(stored))return;
    writing.current=true; repo.replace(user.id,next).finally(()=>{writing.current=false;});
  },[user?.id,activePersonId,health.isLoading,health.insights,stored]);

  const ranked=useMemo(()=>rankBrainV5(scoped),[scoped]);
  const feedback=useCallback((k:string,f:BrainV5Feedback)=>user?.id&&activePersonId?repo.feedback(user.id,activePersonId,k,f):Promise.resolve([]),[user?.id,activePersonId]);
  const state=useCallback((k:string,s:BrainV5State)=>user?.id&&activePersonId?repo.state(user.id,activePersonId,k,s):Promise.resolve([]),[user?.id,activePersonId]);
  const seen=useCallback((k:string)=>user?.id&&activePersonId?repo.markSeen(user.id,activePersonId,k):Promise.resolve([]),[user?.id,activePersonId]);
  return {records:scoped,ranked,counters:brainV5Counters(scoped),feedback,state,seen,isLoading:health.isLoading||Boolean(user?.id&&settings===undefined)};
}
