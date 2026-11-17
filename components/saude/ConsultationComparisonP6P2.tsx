'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, Activity } from 'lucide-react';
import type { Consulta, Medicamento } from '@/lib/types';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { consultationBeforeAfterEvidenceP6P2 } from '@/lib/consultations/consultation-timeline-p6p2';

export function ConsultationComparisonP6P2({consultation,medications}:{consultation:Consulta;medications:readonly Medicamento[]}){
  const {user}=useAuth();const {activePersonId}=useActivePersonId();
  const userId=user?.id||'',personId=activePersonId||'';
  const scope=`${userId}:${personId}`;
  const allowed=Boolean(userId&&personId&&consultation.id&&consultation.user_id===userId&&consultation.person_id===personId);
  const data=useLiveQuery(async()=>{
    if(!allowed)return {scope,logs:[],records:[]};
    const [logs,records]=await Promise.all([db.doseLogs.where('person_id').equals(personId).toArray(),db.registros_saude.where('person_id').equals(personId).toArray()]);
    return {scope,logs,records};
  },[allowed,scope,consultation.id]);
  if(!allowed||!data||data.scope!==scope)return null;
  const snapshot=consultationBeforeAfterEvidenceP6P2({owner:{user_id:userId,person_id:personId},consultation,medications,doses:data.logs,records:data.records,today:(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})(),days:7});
  if(snapshot.state!=='ready'||!snapshot.before||!snapshot.after)return null;
  const fmt=(x:{from:string;through:string;confirmed:number;ignored:number;sosExtra:number;observations:number})=>[
    ['Doses confirmadas',x.confirmed],['Ignoradas explicitamente',x.ignored],['SOS/extra confirmados',x.sosExtra],['Relatos ligados ao medicamento',x.observations]
  ] as const;
  return <section aria-label="Comparação factual da consulta" className="space-y-3 rounded-[22px] border border-violet-300/20 bg-violet-300/[.04] p-4">
    <div className="flex items-start gap-2"><Activity size={17} className="mt-0.5 shrink-0 text-violet-300"/><div><h3 className="text-sm font-semibold text-ink-primary">Antes e depois: registros</h3><p className="mt-1 text-xs text-ink-muted">Sete dias antes e até sete depois. Somente medicamentos ligados explicitamente e eventos desta conta e pessoa.</p></div></div>
    <div className="grid grid-cols-2 gap-2">{([['Antes',snapshot.before],['Depois',snapshot.after]] as const).map(([label,x])=><div key={label} className="rounded-xl border border-surface-border/40 bg-surface p-3"><p className="mb-1 text-xs font-bold text-ink-primary">{label}</p><p className="mb-2 text-[10px] text-ink-muted">{x.from} → {x.through}</p>{fmt(x).map(([name,value])=><p key={name} className="flex items-start justify-between gap-1 py-0.5 text-[11px] text-ink-secondary"><span>{name}</span><strong className="text-ink-primary">{value}</strong></p>)}</div>)}</div>
    <div className="flex items-start gap-2 text-[11px] text-ink-muted"><ClipboardList size={14} className="mt-0.5 shrink-0"/><span>{snapshot.comparable?'Duas janelas com registros confirmados.':'Comparação limitada: janela futura ou ausência de evidência em um período.'} {snapshot.limitation}</span></div>
  </section>;
}
