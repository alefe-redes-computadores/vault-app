'use client';
/** A5: one contextual card, not a second agenda authority. No reminder or admission inferred. */
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Hospital,ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { getLocalTodayISO } from '@/lib/health-utils';
import { displayDayA5,A5_STATUS_LABEL } from '@/lib/hospitalizations-a5/types';
import { hospitalizationTodayA5 } from '@/lib/hospitalizations-a5/projection';
export function HospitalizationA5AgendaStrip({day}:{day?:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const today=getLocalTodayISO();
 const selected=day||today;
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope,rows:[]};const person=await db.persons.get(pid);
  if(person?.user_id!==uid)return {scope,rows:[]};
  const list=await db.hospitalizations_a5.where('person_id').equals(pid).toArray();
  const own=list.filter(e=>e.user_id===uid&&e.person_id===pid&&!e.deleted_at);
  return {scope,rows:own};
 },[uid,pid]);
 if(!data||data.scope!==scope||!data.rows.length)return null;
 const pending=hospitalizationTodayA5(data.rows,uid,pid,selected);
 const admitted=selected===today?data.rows.filter(e=>e.status==='admitted'||e.status==='on_leave'):[];
 if(!pending.length&&!admitted.length)return null;
 return <section aria-label="Contexto de internações" className="mx-auto mt-2 w-full max-w-3xl px-4">
  <div className="space-y-2 rounded-2xl border border-surface-border/70 bg-surface-raised/65 p-3">
   <div className="flex items-center gap-2 text-xs font-bold"><Hospital size={17} className="text-emerald-300"/>Internações em contexto</div>
   {[...admitted.map(e=>({id:e.id,title:A5_STATUS_LABEL[e.status],subtitle:`Admissão: ${displayDayA5(e.admitted_on)}`})),
    ...pending.map(e=>({id:e.id,title:e.title,subtitle:e.description}))].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).map(e=><Link
    key={e.id} href={`/saude/internacoes/detalhes?id=${encodeURIComponent(e.id)}`}
    className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/50 px-3 text-xs text-ink-primary">
    <span className="min-w-0 flex-1"><strong className="block">{e.title}</strong><span className="mt-1 block text-[11px] text-ink-muted">{e.subtitle}</span></span>
    <ChevronRight size={16} className="shrink-0 text-ink-muted"/></Link>)}
   <p className="text-[11px] leading-5 text-ink-muted">Planejamento não confirma admissão. A passagem do tempo nunca registra alta.</p>
  </div>
 </section>;
}
