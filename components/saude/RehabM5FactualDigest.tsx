'use client';
/** The longitudinal Brain consumes M5 facts; never creates parallel CareFlow records. */
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { rehabFactsM5, localDayRehabM5 } from '@/lib/rehab-m5/projection';
import { withReturnTarget } from '@/lib/navigation/return-context';
export function RehabM5FactualDigest({returnTo}:{returnTo:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const state=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope,valid:false,facts:[]};
  const [person,programs,sessions,milestones]=await Promise.all([db.persons.get(pid),
   db.rehab_programs_m5.where('user_id').equals(uid).toArray(),db.rehab_sessions_m5.where('user_id').equals(uid).toArray(),
   db.rehab_milestones_m5.where('user_id').equals(uid).toArray()]);
  if(person?.user_id!==uid)return {scope,valid:false,facts:[]};
  return {scope,valid:true,facts:rehabFactsM5({userId:uid,personId:pid,programs,sessions,milestones})};
 },[uid,pid]);
 if(!state||state.scope!==scope||!state.valid||state.facts.length===0)return null;
 return <section aria-label="Reabilitação na história clínica" className="rounded-[20px] border border-teal-300/20 bg-teal-300/[.04] p-3.5 text-ink-primary">
  <h2 className="flex items-center gap-2 text-sm font-bold"><Activity size={18} className="text-teal-300"/> Reabilitação registrada</h2>
  <p className="mt-1 flex gap-1 text-[11px] text-ink-muted"><ShieldCheck size={14} className="shrink-0"/> Registro factual separado de diagnósticos, prescrições e conclusões automáticas.</p>
  <div className="mt-3 space-y-2">{state.facts.slice(0,8).map(f=><Link key={`${f.kind}:${f.id}`} href={withReturnTarget(f.href,returnTo)}
   className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/70 bg-surface-raised/60 px-3 py-2.5 text-left">
   <div className="min-w-0 flex-1"><strong className="block break-words text-xs">{f.title}</strong><span className="mt-0.5 block break-words text-[11px] text-ink-muted">{localDayRehabM5(f.date).split('-').reverse().join('/')} · {f.source}</span></div><ArrowUpRight size={15} className="shrink-0 text-teal-300"/></Link>)}</div>
  {state.facts.length>8&&<p className="mt-2 text-[11px] text-ink-muted">Outros registros disponíveis na área Reabilitação.</p>}
 </section>;
}
