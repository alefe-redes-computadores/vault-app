'use client';
/** Read-only reverse relation; surgical/consultation/hospital authorities remain untouched. */
import Link from 'next/link';
import { Activity, ArrowUpRight, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { rehabReverseProgramsM5, REHAB_M5_STATES } from '@/lib/rehab-m5/projection';
import { withReturnTarget } from '@/lib/navigation/return-context';
export function RehabM5ReverseLinks({kind,recordId,returnTo}:{kind:'cirurgia'|'consulta'|'tratamento'|'hospital'|'local'|'profissional';recordId:string;returnTo:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const result=useLiveQuery(async()=>{
  if(!uid||!pid||!recordId)return {scope,programs:[],sessions:[]};
  const [person,programs,origins,sessions,team]=await Promise.all([db.persons.get(pid),db.rehab_programs_m5.where('user_id').equals(uid).toArray(),
   db.rehab_origin_links_m5.where('user_id').equals(uid).toArray(),db.rehab_sessions_m5.where('user_id').equals(uid).toArray(),
   db.rehab_program_team_m5.where('user_id').equals(uid).toArray()]);
  if(person?.user_id!==uid)return {scope,programs:[],sessions:[]};
  const direct=(kind==='hospital'||kind==='local'||kind==='profissional')?[]:rehabReverseProgramsM5({userId:uid,personId:pid,originType:kind,originId:recordId,origins,programs});
  const hosted=kind==='hospital'?sessions.filter(s=>s.user_id===uid&&s.person_id===pid&&!s.deleted_at&&s.hospital_id===recordId):[];
  const placed=kind==='local'?sessions.filter(s=>s.user_id===uid&&s.person_id===pid&&!s.deleted_at&&s.local_id===recordId):[];
  const assigned=kind==='profissional'?team.filter(t=>t.user_id===uid&&t.person_id===pid&&!t.deleted_at&&t.professional_id===recordId):[];
  const primary=programs.filter(p=>p.user_id===uid&&p.person_id===pid&&!p.deleted_at&&(
   kind==='profissional'?p.primary_professional_id===recordId:kind==='local'?p.primary_facility_id===recordId:false));
  const ids=new Set([...direct.map(p=>p.id),...hosted.map(s=>s.program_id),...placed.map(s=>s.program_id),
   ...assigned.map(t=>t.program_id),...primary.map(p=>p.id)]);
  return {scope,programs:programs.filter(p=>p.user_id===uid&&p.person_id===pid&&!p.deleted_at&&ids.has(p.id)),sessions};
 },[uid,pid,recordId,kind]);
 if(!uid||!pid||!recordId||!result||result.scope!==scope)return null;
 const start=withReturnTarget(`/saude/reabilitacao/novo?origem_tipo=${kind}&origem_id=${encodeURIComponent(recordId)}`,returnTo);
 return <section className="mt-3 min-w-0 rounded-[20px] border border-teal-300/20 bg-teal-300/[.045] p-3.5 text-ink-primary" aria-label="Reabilitação vinculada">
  <div className="flex items-start gap-2"><Activity className="mt-0.5 shrink-0 text-teal-300" size={19}/>
   <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Reabilitação vinculada</h2><p className="text-[11px] leading-relaxed text-ink-muted">Ciclos relacionados por identificador real, sem inferir vínculo por data.</p></div></div>
  {result.programs.length===0?<p className="mt-2 text-xs text-ink-muted">Nenhum ciclo vinculado a este registro.</p>:
   result.programs.map(p=>{const total=result.sessions.filter(s=>s.program_id===p.id&&!s.deleted_at&&s.status==='performed').length;
    return <Link key={p.id} href={withReturnTarget(`/saude/reabilitacao/detalhes?id=${encodeURIComponent(p.id)}`,returnTo)}
     className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-surface-border bg-surface-raised/70 px-3 py-2.5 text-left">
     <span className="min-w-0 flex-1"><strong className="block break-words text-xs">{p.title}</strong>
     <span className="block text-[11px] text-ink-muted">{REHAB_M5_STATES[p.status]} · {total===1?'1 sessão realizada':`${total} sessões realizadas`}</span></span><ArrowUpRight className="shrink-0 text-teal-300" size={17}/></Link>})}
  {(kind==='cirurgia'||kind==='consulta'||kind==='tratamento')&&<Link href={start} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/30 px-3 py-2 text-xs font-semibold text-teal-200">
   <Plus size={16}/> Iniciar ou vincular reabilitação</Link>}
 </section>;
}
