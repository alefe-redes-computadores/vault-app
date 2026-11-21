'use client';
/** Reverse links: never derive inpatient stay from a nearby surgery date. */
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { BedDouble,ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { db } from '@/lib/db';
import { A5_STATUS_LABEL, displayDayA5,type A5Entity } from '@/lib/hospitalizations-a5/types';
export function HospitalizationA5ReverseLinks({kind,recordId,returnTo}:{kind:A5Entity;recordId:string;returnTo?:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const data=useLiveQuery(async()=>{
  if(!uid||!pid||!recordId)return {scope,rows:[]};
  const person=await db.persons.get(pid);if(person?.user_id!==uid)return {scope,rows:[]};
  const [links,episodes]=await Promise.all([
   db.hospitalization_relations_a5.where('entity_id').equals(recordId).toArray(),
   db.hospitalizations_a5.where('person_id').equals(pid).toArray(),
  ]);
  const exact=links.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at&&x.entity_type===kind&&x.entity_id===recordId);
  const ids=new Set(exact.map(x=>x.hospitalization_id));
  return {scope,rows:episodes.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at&&ids.has(x.id))};
 },[uid,pid,kind,recordId]);
 if(!data||data.scope!==scope||data.rows.length===0)return null;
 return <section className="rounded-2xl border border-surface-border/75 bg-surface-raised/70 p-3" aria-label="Internações vinculadas">
  <h2 className="flex items-center gap-2 text-sm font-bold"><BedDouble size={18} className="text-emerald-300"/>Internações vinculadas</h2>
  <p className="mt-1 text-[11px] text-ink-muted">{data.rows.length} {data.rows.length===1?'episódio vinculado':'episódios vinculados'} por identidade real.</p>
  {data.rows.map(x=><Link href={withReturnTarget(`/saude/internacoes/detalhes?id=${encodeURIComponent(x.id)}`,returnTo||'/saude/internacoes')}
   key={x.id} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-xs text-ink-primary">
   <span className="min-w-0 flex-1"><strong className="block break-words">{x.reason||'Motivo não informado'}</strong><span className="mt-1 block text-ink-muted">{A5_STATUS_LABEL[x.status]} · {displayDayA5(x.admitted_on)}</span></span><ChevronRight className="shrink-0" size={16}/>
  </Link>)}
 </section>;
}
