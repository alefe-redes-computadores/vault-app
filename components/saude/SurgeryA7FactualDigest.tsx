'use client';
/** Brain observational companion; reads A7 canonical ledger without writing parallel facts. */
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {ClipboardList,ArrowUpRight,ShieldCheck} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {db} from '@/lib/db';
import {A7_EVENT_LABEL,A7_SOURCE_LABEL,displayDayA7} from '@/lib/surgery-a7/types';
import {withReturnTarget} from '@/lib/navigation/return-context';
export function SurgeryA7FactualDigest({returnTo}:{returnTo:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId(),uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const state=useLiveQuery(async()=>{
  if(!uid||!pid)return {scope,authorized:false,rows:[]};
  const [person,events,surgeries]=await Promise.all([db.persons.get(pid),
   db.surgery_journey_events_a7.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   db.cirurgias.where('person_id').equals(pid).toArray()]);
  if(person?.user_id!==uid)return {scope,authorized:false,rows:[]};
  const ids=new Set(surgeries.filter(s=>s.user_id===uid&&s.person_id===pid).map(s=>s.id));
  const rows=events.filter(e=>e.user_id===uid&&e.person_id===pid&&!e.deleted_at&&ids.has(e.cirurgia_id))
   .sort((a,b)=>(b.occurred_on||b.created_at).localeCompare(a.occurred_on||a.created_at));
  return {scope,authorized:true,rows};
 },[uid,pid]);
 if(!state||!state.authorized||state.scope!==scope||state.rows.length===0)return null;
 return <section className="rounded-2xl border border-emerald-300/20 bg-surface p-3.5" aria-label="Histórico cirúrgico documentado">
  <div className="flex items-center gap-2"><ClipboardList size={18} className="text-emerald-300"/><h2 className="text-sm font-bold text-ink-primary">Jornada cirúrgica registrada</h2></div>
  <p className="mt-1 flex items-start gap-2 text-[11px] leading-5 text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Fatos declarados no cadastro da cirurgia; sem concluir recuperação, alta ou liberação automaticamente.</p>
  <div className="mt-3 space-y-2">{state.rows.slice(0,8).map(e=><Link key={e.id} href={withReturnTarget(`/saude/cirurgias/jornada?id=${encodeURIComponent(e.cirurgia_id)}#a7-event-${encodeURIComponent(e.id)}`,returnTo)} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised/70 px-3 py-2.5">
   <span className="min-w-0 flex-1"><strong className="block break-words text-xs text-ink-primary">{e.title}</strong><span className="mt-1 block break-words text-[11px] text-ink-muted">{A7_EVENT_LABEL[e.kind]} · {A7_SOURCE_LABEL[e.source]} · {displayDayA7(e.occurred_on)}</span></span><ArrowUpRight size={15} className="shrink-0 text-emerald-300"/>
  </Link>)}</div>
  {state.rows.length>8?<p className="mt-2 text-[11px] text-ink-muted">Outros fatos disponíveis no cadastro da jornada cirúrgica.</p>:null}
 </section>;
}
