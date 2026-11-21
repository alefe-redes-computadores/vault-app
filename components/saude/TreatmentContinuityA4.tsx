'use client';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { History, ChevronRight, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useLocalDay } from '@/hooks/useLocalDay';
import { projectA4ClinicalFacts } from '@/lib/treatment-a4/clinical-bridge';

function recentCivilDay(today:string,days:number):string {
  const [y,m,d]=today.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d-days+1,12)).toISOString().slice(0,10);
}
/** Read-only, scoped clinical bridge. Empty = hidden to preserve the premium Home/Hoje density. */
export function TreatmentContinuityA4({context='careflow',maxItems=2,medicationId}:{context?:'home'|'today'|'careflow'|'brain';maxItems?:number;medicationId?:string}) {
  const {user}=useAuth();const {activePersonId}=useActivePersonId();
  const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
  const today=useLocalDay(),compact=context==='home'||context==='today';
  const snapshot=useLiveQuery(async()=>{
    if(!uid||!pid)return {scope,facts:[]};
    const phases=await db.a1_treatment_phases.where('[user_id+person_id]').equals([uid,pid]).toArray();
    // The Home/Hoje should not hydrate large clinical directories when there are no phases.
    if(!phases.some(p=>!p.deleted_at && p.user_id===uid && p.person_id===pid))return {scope,facts:[]};
    const [treatments,medications,professionals]=await Promise.all([
      db.tratamentos.where('user_id').equals(uid).toArray(),
      db.medicamentos.where('user_id').equals(uid).toArray(),
      db.medicos.where('user_id').equals(uid).toArray(),
    ]);
    const facts=projectA4ClinicalFacts({userId:uid,personId:pid,phases,treatments,medications,professionals,
      from:compact?recentCivilDay(today,30):undefined,through:compact?today:undefined,max:2000});
    return {scope,facts:facts.filter(f=>!medicationId||f.medicationId===medicationId).slice(0,Math.max(1,Math.min(8,maxItems)))};
  },[uid,pid,maxItems,medicationId,compact,today]);
  if(!uid||!pid||snapshot?.scope!==scope||!snapshot.facts.length)return null;
  return <section aria-label="Mudanças declaradas dos tratamentos" className={`min-w-0 rounded-[22px] border border-violet-400/20 bg-surface/85 ${compact?'p-3':'p-4'} vault-deferred`}>
    <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-200"><History size={18}/></span>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-bold leading-5 text-ink-primary">Mudanças de tratamentos</h2><p className="text-[11px] leading-relaxed text-ink-muted">Somente fases informadas e registradas. Não altera doses nem receitas.</p></div></div>
    <div className="mt-3 space-y-2">{snapshot.facts.map(f=><Link key={f.id} href={f.href} className="flex min-h-12 min-w-0 items-start gap-2 rounded-xl border border-surface-border/60 bg-surface-raised/65 px-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold text-ink-primary">{f.treatmentName} · {f.kindLabel}</span><span className="mt-1 block break-words text-[11px] text-ink-muted">{f.date.slice(8)}/{f.date.slice(5,7)}/{f.date.slice(0,4)} · {f.sourceLabel}{f.medicationName?` · ${f.medicationName}`:''}{!f.synced?' · Pendente de sincronização':''}</span></span>
      <ChevronRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-violet-300"/></Link>)}</div>
    {!compact&&<p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>A cronologia preserva cada evento. Não representa a prescrição em vigor.</p>}
  </section>;
}
