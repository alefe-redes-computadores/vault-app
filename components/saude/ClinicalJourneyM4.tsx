'use client';
/** Read-only M4 clinical journey: explicitly related facts, with original modules as writers. */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ArrowLeft, ArrowUpRight, BookOpenCheck, CalendarDays, ClipboardList, FileText, GitBranch, HeartPulse, LockKeyhole, ShieldCheck, Stethoscope, TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { PageTransition } from '@/components/PageTransition';
import { projectClinicalJourneyM4, type JourneyRowM4 } from '@/lib/clinical-journey-m4/projection';

const humanDay=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)?`${day.slice(8,10)}/${day.slice(5,7)}/${day.slice(0,4)}`:'Data não informada';
const card='rounded-[22px] border border-surface-border/70 bg-surface px-4 py-4';
const tone:Record<JourneyRowM4['kind'],string>={surgery:'text-rose-300',consultation:'text-sky-300',treatment:'text-emerald-300',document:'text-amber-300',exam:'text-cyan-300',session:'text-violet-300',asset:'text-amber-300'};
function RelationRows({rows,title,empty}:{rows:JourneyRowM4[];title:string;empty:string}){
 return <section aria-label={title} className={`${card} space-y-3`}><div className="flex items-center gap-2"><GitBranch size={17} className="text-emerald-300"/><h2 className="text-sm font-bold">{title}</h2><span className="ml-auto text-xs tabular-nums text-ink-muted">{rows.length}</span></div>
 {rows.length===0?<p className="text-xs leading-5 text-ink-muted">{empty}</p>:<div className="space-y-2">{rows.slice(0,70).map(r=><Link href={r.href} key={r.key} className="flex min-h-[64px] min-w-0 items-start gap-2.5 rounded-2xl border border-surface-border/50 bg-surface-raised p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
 <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-void/60 ${tone[r.kind]}`}>{r.kind==='surgery'?<HeartPulse size={17}/>:r.kind==='document'||r.kind==='asset'?<FileText size={17}/>:r.kind==='consultation'?<Stethoscope size={17}/>:r.kind==='exam'||r.kind==='session'?<ClipboardList size={17}/>:<Activity size={17}/>}</span>
 <span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold text-ink-primary">{r.label}</span><span className="mt-1 block break-words text-[11px] leading-4 text-ink-muted">{r.detail}</span>{r.date||r.status?<span className="mt-1 block text-[10px] text-ink-muted">{r.date?humanDay(r.date):''}{r.date&&r.status?' · ':''}{r.status||''}</span>:null}</span><ArrowUpRight size={15} className="mt-1 shrink-0 text-ink-muted"/></Link>)}</div>}
 {rows.length>70?<p className="text-[11px] text-ink-muted">Exibindo 70 de {rows.length} vínculos. Os cadastros originais permanecem disponíveis para consulta completa.</p>:null}</section>
}
export function ClinicalJourneyM4({initialSurgeryId='',initialConsultationId=''}:{initialSurgeryId?:string;initialConsultationId?:string}){
 const {user}=useAuth();const {activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'';
 const [surgeryId,setSurgeryId]=useState(initialSurgeryId);const [consultationId,setConsultationId]=useState(initialConsultationId);
 const loaded=useLiveQuery(async()=>{
  if(!uid||!pid)return null;
  const person=await db.persons.get(pid);
  if(!person||person.user_id!==uid)return null;
  // Preserve the precise Dexie row types (Cirurgia, Consulta, ExamOrderM1, etc.).
  // A generic structural table wrapper widens every result to only {user_id,person_id},
  // hiding id/data/procedimento from TypeScript. Filter *after* each typed query.
  const owned=<T extends {user_id:string;person_id?:string|null}>(rows:T[]):T[]=>
   rows.filter(row=>row.user_id===uid&&row.person_id===pid);
  const [surgeries,consultations,treatments,documents,orders,orderItems,sessions,consultationOrderLinks,assets,assetLinks]=await Promise.all([
   db.cirurgias.where('person_id').equals(pid).toArray().then(owned),
   db.consultas.where('person_id').equals(pid).toArray().then(owned),
   db.tratamentos.where('person_id').equals(pid).toArray().then(owned),
   db.documents.where('person_id').equals(pid).toArray().then(owned),
   db.exam_orders.where('person_id').equals(pid).toArray().then(owned),
   db.exam_order_items.where('person_id').equals(pid).toArray().then(owned),
   db.exam_sessions.where('person_id').equals(pid).toArray().then(owned),
   db.consultation_exam_order_links.where('person_id').equals(pid).toArray().then(owned),
   db.clinical_assets.where('person_id').equals(pid).toArray().then(owned),
   db.clinical_asset_links.where('person_id').equals(pid).toArray().then(owned)]);
  return {surgeries,consultations,treatments,documents,orders,orderItems,sessions,consultationOrderLinks,assets,assetLinks};
 },[uid,pid]);
 const surgeries=useMemo(()=>loaded?.surgeries.filter(s=>s.id).sort((a,b)=>(b.data||'').localeCompare(a.data||''))||[],[loaded]);
 const consultations=useMemo(()=>loaded?.consultations.filter(c=>c.id).sort((a,b)=>(b.data||'').localeCompare(a.data||''))||[],[loaded]);
 const selectedSurgeryId=surgeries.some(s=>s.id===surgeryId)?surgeryId:'';
 const selectedConsultationId=consultations.some(c=>c.id===consultationId)?consultationId:'';
 const result=useMemo(()=>loaded?projectClinicalJourneyM4({userId:uid,personId:pid,surgeryId:selectedSurgeryId,consultationId:selectedConsultationId,...loaded}):null,
  [loaded,uid,pid,selectedSurgeryId,selectedConsultationId]);
 return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-ink-primary header-safe-top vault-adaptive-tail"><div className="mx-auto max-w-3xl space-y-4">
 <header className="flex items-start gap-3"><Link href="/saude/careflow" aria-label="Voltar ao acompanhamento clínico" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-surface-border bg-surface"><ArrowLeft size={19}/></Link>
 <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-emerald-300"><GitBranch size={14}/> VAULT · Jornada Clínica</div><h1 className="mt-1 text-xl font-extrabold tracking-tight">Conexões entre cuidados</h1><p className="mt-1 text-xs leading-5 text-ink-muted">Consultas, cirurgias, exames e documentos em suas autoridades originais. Nada é registrado automaticamente.</p></div></header>
 {!uid||!pid?<section className={card}><p role="status" className="text-sm text-ink-muted">Entre na sua conta e selecione uma pessoa para ver a jornada.</p></section>:
 loaded===undefined?<section className={card}><p role="status" className="text-sm text-ink-muted">Conferindo registros desta conta e pessoa…</p></section>:
 loaded===null?<section className={card}><p role="alert" className="text-sm text-ink-muted">Esta pessoa não pertence à sessão atual. Selecione novamente o perfil autorizado.</p></section>:<>
 <section className={`${card} space-y-3`} aria-label="Selecionar pontos de partida"><div className="flex items-center gap-2"><BookOpenCheck size={18} className="text-sky-300"/><h2 className="text-sm font-bold">Pontos de partida</h2></div>
 <div className="grid min-w-0 gap-3 sm:grid-cols-2"><div><p className="mb-1 text-xs font-semibold text-ink-muted">Cirurgia registrada</p><HealthRelationPicker title="Selecionar cirurgia" value={selectedSurgeryId} onValueChange={setSurgeryId} className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm">
 <option value="">Nenhuma cirurgia selecionada</option>{surgeries.map(s=><option key={s.id} value={s.id}>{humanDay(s.data)} · {s.procedimento} · {s.status}</option>)}</HealthRelationPicker></div>
 <div><p className="mb-1 text-xs font-semibold text-ink-muted">Consulta registrada</p><HealthRelationPicker title="Selecionar consulta" value={selectedConsultationId} onValueChange={setConsultationId} className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm">
 <option value="">Nenhuma consulta selecionada</option>{consultations.map(c=><option key={c.id} value={c.id}>{humanDay(c.data)} · {c.especialidade||c.medico} · {c.status}</option>)}</HealthRelationPicker></div></div>
 <p className="text-[11px] leading-5 text-ink-muted">A seleção de cirurgia e consulta não cria nem comprova ligação entre elas. Os grupos abaixo usam somente IDs explicitamente relacionados.</p></section>
 {!selectedSurgeryId&&!selectedConsultationId?<section className={card}><p className="text-xs leading-5 text-ink-muted">Escolha uma cirurgia ou consulta para montar uma visão factual. Você pode explorar os dois eixos sem alterar o histórico.</p><div className="mt-3 flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-bold" href="/saude/cirurgias">Abrir Cirurgias <ArrowUpRight size={15}/></Link><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-bold" href="/saude/consultas">Abrir Consultas <ArrowUpRight size={15}/></Link></div></section>:null}
 {result?.surgery?<section className={`${card} space-y-2 border-rose-300/20`}><p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Eixo cirúrgico</p><Link href={result.surgery.href} className="flex items-center gap-2 text-sm font-bold"><HeartPulse size={17} className="text-rose-300"/>{result.surgery.label}<ArrowUpRight size={15}/></Link><p className="text-xs text-ink-muted">{humanDay(result.surgery.date)} · {result.surgery.status}. Estado proveniente exclusivamente de Cirurgias.</p></section>:null}
 {result?.surgery?<RelationRows rows={result.surgeryRelations} title="Relações explícitas da cirurgia" empty="Sem tratamento ou documento vinculado diretamente a esta cirurgia. Não associamos consultas pela data."/>:null}
 {result?.contextCandidates.length?<section className={`${card} space-y-2 border-amber-300/20`}><div className="flex items-center gap-2 text-amber-300"><TriangleAlert size={17}/><h2 className="text-sm font-bold">Contextos a conferir</h2></div><p className="text-[11px] leading-5 text-ink-muted">Consultas que compartilham tratamento com a cirurgia. Isso NÃO significa que sejam pré-operatórias ou pós-operatórias.</p><div className="space-y-2">{result.contextCandidates.slice(0,15).map(r=><Link className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs" key={r.key} href={r.href}><Stethoscope size={16}/><span className="min-w-0 flex-1 break-words">{r.label}</span><ArrowUpRight size={15}/></Link>)}</div></section>:null}
 {result?.consultation?<section className={`${card} space-y-2 border-sky-300/20`}><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Eixo da consulta</p><Link href={result.consultation.href} className="flex items-center gap-2 text-sm font-bold"><Stethoscope size={17} className="text-sky-300"/>{result.consultation.label}<ArrowUpRight size={15}/></Link><p className="text-xs text-ink-muted">{humanDay(result.consultation.date)} · {result.consultation.status}. Estado proveniente exclusivamente de Consultas.</p></section>:null}
 {result?.consultation?<RelationRows rows={result.consultationRelations} title="Desdobramentos confirmados da consulta" empty="Sem pedido, exame, tratamento ou documento com vínculo explícito nesta consulta."/>:null}
 {result&&(selectedSurgeryId||selectedConsultationId)?<section className={`${card} space-y-2`}><h2 className="text-sm font-bold">Integridade da jornada</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{label:'Registros ligados',value:result.counts.confirmed},{label:'Contextos a conferir',value:result.counts.contextCandidates},{label:'Resultados recebidos',value:result.counts.results},{label:'Arquivos privados',value:result.counts.files}].map(x=><div key={x.label} className="rounded-xl bg-surface-raised p-2.5"><p className="text-xl font-bold tabular-nums">{x.value}</p><p className="text-[10px] text-ink-muted">{x.label}</p></div>)}</div>{result.warnings.map((w,i)=><p key={i} className="text-[11px] leading-5 text-ink-muted">• {w}</p>)}</section>:null}
 <div className="grid gap-2 sm:grid-cols-2"><Link href="/saude/careflow/episodios" className="flex min-h-12 items-center justify-between rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold">Episódios de atendimento <ArrowUpRight size={16}/></Link><Link href="/saude/documentos" className="flex min-h-12 items-center justify-between rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold">Acervo Clínico <ArrowUpRight size={16}/></Link></div>
 </>}
 <p className="flex gap-2 text-[11px] leading-5 text-ink-muted"><LockKeyhole size={14} className="mt-0.5 shrink-0"/><span><ShieldCheck size={13} className="mr-1 inline"/>Leitura local por pessoa. Ausência de dado não equivale a liberação, alta ou ausência de condição. Sem diagnóstico, prescrição, notificação ou compartilhamento automático.</span></p>
 </div></main></PageTransition>;
}
