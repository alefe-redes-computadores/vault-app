'use client';
/** A7/M6: read-only surgical journey, writers remain Cirurgias, Consultas, Exames and M5. */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ArrowLeft, ArrowUpRight, CalendarDays, ClipboardList, FileText, GitBranch, HeartPulse, LockKeyhole, Search, ShieldCheck, Stethoscope, TriangleAlert, Building2, UserRound, Plus, RotateCcw, BedDouble, LockKeyhole as PrivateFileIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { PageTransition } from '@/components/PageTransition';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { SurgeryConsultationLinksM4P2 } from '@/components/saude/SurgeryConsultationLinksM4P2';
import { projectSurgeryJourneyA7, type SurgeryRowA7, type SurgeryStageA7, type HospitalizationA7, type HospitalizationRelationA7, type HospitalizationEventA7, type HospitalizationDischargeA7, type HospitalizationTeamA7, type HospitalizationStayA7 } from '@/lib/surgery-a7/projection';
import {SurgeryA7RecordsPanel} from '@/components/saude/SurgeryA7RecordsPanel';
import { REHAB_M5_STATES } from '@/lib/rehab-m5/projection';

const paper='rounded-[22px] border border-surface-border/70 bg-surface p-4 shadow-sm sm:p-5';
const humanDay=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:'Data não informada';
const surgeryStatus=(status:string)=>status==='realizada'?'Realizada':status==='cancelada'?'Cancelada':status==='agendada'?'Agendada':'Situação não informada';
const consultationStatus=(status:string)=>status==='realizada'?'Realizada':status==='cancelada'?'Cancelada':status==='agendada'?'Agendada':'Situação informada no cadastro';
const tone:Record<SurgeryRowA7['kind'],string>={consultation:'text-sky-300',surgery:'text-rose-300',treatment:'text-emerald-300',document:'text-amber-300',exam:'text-cyan-300',rehabilitation:'text-teal-300',hospitalization:'text-amber-300',asset:'text-amber-300',hospital_event:'text-sky-300',hospital_discharge:'text-emerald-300',hospital_team:'text-sky-300',hospital_stay:'text-amber-300',surgical_event:'text-emerald-300',surgical_team:'text-sky-300'};
const stageName:Record<SurgeryStageA7,string>={pre:'Preparação pré-operatória',procedure:'Procedimento registrado',post:'Acompanhamento pós-operatório',return:'Consultas de retorno',related:'Registros vinculados',rehabilitation:'Reabilitação vinculada',hospitalization:'Internações vinculadas'};
const stageDescription:Record<SurgeryStageA7,string>={
 pre:'Apenas consultas identificadas expressamente como pré-operatórias e seus pedidos vinculados.',
 procedure:'Informações do cadastro original. Não declara conclusão de preparação nem liberação médica.',
 post:'Consultas vinculadas expressamente ao pós-operatório e respectivos pedidos.',
 return:'Retornos relacionados explicitamente a esta cirurgia.',
 related:'Tratamentos e documentos associados ao cadastro da cirurgia por identificador.',
 rehabilitation:'Programas de Reabilitação cuja origem foi vinculada expressamente à cirurgia.',
 hospitalization:'Episódios hospitalares vinculados explicitamente por você. Internação planejada não significa admissão.'
};
const stageIcon:Record<SurgeryStageA7,typeof ClipboardList>={pre:ClipboardList,procedure:HeartPulse,post:Activity,return:RotateCcw,related:FileText,rehabilitation:Activity,hospitalization:BedDouble};
const rowIcon:Record<SurgeryRowA7['kind'],typeof ClipboardList>={consultation:Stethoscope,surgery:HeartPulse,treatment:Activity,document:FileText,exam:ClipboardList,rehabilitation:Activity,hospitalization:BedDouble,asset:PrivateFileIcon,hospital_event:ClipboardList,hospital_discharge:ClipboardList,hospital_team:UserRound,hospital_stay:BedDouble,surgical_event:ClipboardList,surgical_team:Stethoscope};
const stagesOrder:SurgeryStageA7[]=['pre','procedure','post','return','related','rehabilitation','hospitalization'];
function ClinicalRowA7({item}:{item:SurgeryRowA7}){
 const Icon=rowIcon[item.kind];
 const status=item.kind==='consultation'?consultationStatus(item.status):item.kind==='surgery'?surgeryStatus(item.status):item.kind==='rehabilitation'?REHAB_M5_STATES[item.status as keyof typeof REHAB_M5_STATES]||'Situação no cadastro original':item.status;
 // Never nest an interactive <details>/<summary> inside a navigational Link.
 return <article className="min-w-0 rounded-2xl border border-surface-border/65 bg-surface-raised/70 p-3">
  <div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-void/45 ${tone[item.kind]}`}><Icon size={18}/></span>
   <div className="min-w-0 flex-1"><strong className="block break-words text-[13px] font-semibold leading-5 text-ink-primary">{item.title}</strong>
    {item.detail?(item.detail.length>480?<details className="mt-2 rounded-xl border border-surface-border/50 p-2"><summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-emerald-300">Ver informações registradas</summary><p className="mt-1 break-words whitespace-pre-wrap text-xs leading-5 text-ink-secondary">{item.detail}</p></details>:<p className="mt-1 break-words whitespace-pre-wrap text-xs leading-5 text-ink-secondary">{item.detail}</p>):null}
    <p className="mt-1.5 break-words text-[11px] leading-4 text-ink-muted">{[item.date?humanDay(item.date):'',item.time||'',status].filter(Boolean).join(' · ')}</p>
    <p className="mt-1 break-words text-[10px] leading-4 text-ink-muted">{item.evidence}</p>
   </div></div>
  <Link href={item.href} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Abrir registro original <ArrowUpRight size={15}/></Link>
 </article>;
}
function StageA7({stage,rows}:{stage:SurgeryStageA7;rows:SurgeryRowA7[]}){
 const Icon=stageIcon[stage];
 const [shown,setShown]=useState(40);
 return <section className={`${paper} space-y-3`} aria-label={stageName[stage]}>
  <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] text-emerald-300"><Icon size={18}/></span>
   <div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">{stageName[stage]}</h2><p className="mt-1 text-[11px] leading-5 text-ink-muted">{stageDescription[stage]}</p></div>
   <span className="shrink-0 rounded-lg border border-surface-border px-2 py-1 text-xs tabular-nums text-ink-secondary">{rows.length}</span></div>
  {rows.slice(0,shown).map(r=><ClinicalRowA7 key={r.key} item={r}/>)}
  {rows.length>shown&&<button type="button" onClick={()=>setShown(n=>n+40)} className="min-h-11 w-full rounded-xl border border-surface-border px-3 text-xs font-semibold text-emerald-300">Mostrar mais {Math.min(40,rows.length-shown)} registros</button>}
 </section>;
}
export function SurgeryJourneyA7({initialSurgeryId=''}:{initialSurgeryId?:string}){
 const {user}=useAuth(),{activePersonId}=useActivePersonId();const uid=user?.id||'',pid=activePersonId||'',scope=`${uid}:${pid}`;
 const [selected,setSelected]=useState(initialSurgeryId);const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<SurgeryStageA7|'all'>('all');
 const data=useLiveQuery(async()=>{
  if(!uid||!pid)return null;
  const person=await db.persons.get(pid);if(!person||person.user_id!==uid)return null;
  const own=<T extends {user_id:string;person_id?:string|null}>(rows:T[])=>rows.filter(r=>r.user_id===uid&&r.person_id===pid);
  const a5Ready=true; // A5 is a published prerequisite for this build.
  const a5Read=<T extends {user_id:string;person_id?:string|null},>(table:string)=>db.table(table).where('person_id').equals(pid).toArray().then(rows=>own(rows as T[]));
  const [surgeries,consultations,links,treatments,documents,orders,orderLinks,rehabPrograms,rehabOrigins,rehabSessions,doctors,hospitals,
   clinicalAssets,clinicalAssetLinks,hospitalizations,hospitalizationRelations,
   hospitalizationEvents,hospitalizationDischarges,hospitalizationTeam,hospitalizationStays,surgeryEvents,surgeryTeam]=await Promise.all([
   db.cirurgias.where('person_id').equals(pid).toArray().then(own),
   db.consultas.where('person_id').equals(pid).toArray().then(own),
   db.surgery_consultation_links_m4.where('person_id').equals(pid).toArray().then(own),
   db.tratamentos.where('person_id').equals(pid).toArray().then(own),
   db.documents.where('person_id').equals(pid).toArray().then(own),
   db.exam_orders.where('person_id').equals(pid).toArray().then(own),
   db.consultation_exam_order_links.where('person_id').equals(pid).toArray().then(own),
   db.rehab_programs_m5.where('person_id').equals(pid).toArray().then(own),
   db.rehab_origin_links_m5.where('person_id').equals(pid).toArray().then(own),
   db.rehab_sessions_m5.where('person_id').equals(pid).toArray().then(own),
   db.medicos.where('user_id').equals(uid).toArray(),
   db.hospitais.where('user_id').equals(uid).toArray(),
   db.clinical_assets.where('person_id').equals(pid).toArray().then(own),
   db.clinical_asset_links.where('person_id').equals(pid).toArray().then(own),
   a5Read<HospitalizationA7>('hospitalizations_a5'),
   a5Read<HospitalizationRelationA7>('hospitalization_relations_a5'),
   a5Read<HospitalizationEventA7>('hospitalization_events_a5'),
   a5Read<HospitalizationDischargeA7>('hospitalization_discharge_a5'),
   a5Read<HospitalizationTeamA7>('hospitalization_team_a5'),
   a5Read<HospitalizationStayA7>('hospitalization_stays_a5'),
   db.surgery_journey_events_a7.where('person_id').equals(pid).toArray().then(own),
   db.surgery_team_a7.where('person_id').equals(pid).toArray().then(own)]);
  return {scope,surgeries,consultations,links,treatments,documents,orders,orderLinks,rehabPrograms,rehabOrigins,rehabSessions,
   doctors,hospitals,clinicalAssets,clinicalAssetLinks,hospitalizations,hospitalizationRelations,
   hospitalizationEvents,hospitalizationDischarges,hospitalizationTeam,hospitalizationStays,surgeryEvents,surgeryTeam,a5Ready};
 },[uid,pid]);
 const surgeries=useMemo(()=>data?.scope===scope?data.surgeries.filter(s=>s.id).sort((a,b)=>b.data.localeCompare(a.data)):[],[data,scope]);
 const selectedId=surgeries.some(s=>s.id===selected)?selected:'';
 const journey=useMemo(()=>data?.scope===scope&&selectedId?projectSurgeryJourneyA7({userId:uid,personId:pid,surgeryId:selectedId,...data}):null,[data,scope,selectedId,uid,pid]);
 const normalized=query.trim().toLocaleLowerCase('pt-BR');
 const visible=useMemo(()=>!journey?[]:stagesOrder.filter(stage=>(filter==='all'||filter===stage)&&journey.stages[stage].some(item=>
  !normalized||[item.title,item.detail,item.evidence,item.status].join(' ').toLocaleLowerCase('pt-BR').includes(normalized)) )
  .map(stage=>({stage,rows:journey.stages[stage].filter(item=>!normalized||[item.title,item.detail,item.evidence,item.status].join(' ').toLocaleLowerCase('pt-BR').includes(normalized))})),[journey,normalized,filter]);
 const filters=journey?stagesOrder.filter(x=>journey.stages[x].length):[];
 return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 text-ink-primary header-safe-top vault-adaptive-tail"><div className="mx-auto max-w-3xl space-y-4">
  <header className="flex items-start gap-3"><Link href="/saude/cirurgias" aria-label="Voltar para Cirurgias" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={19}/></Link>
   <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300"><GitBranch size={14}/> Jornada Cirúrgica</p>
    <h1 className="mt-1 text-xl font-bold tracking-tight">Do preparo à recuperação</h1><p className="mt-1 text-xs leading-5 text-ink-muted">Uma visão dos fatos que você cadastrou e vinculou. Nenhuma etapa é concluída por suposição.</p></div></header>
  {!uid||!pid?<section className={paper} role="status"><p className="text-sm text-ink-secondary">Entre na sua conta e selecione uma pessoa para ver a jornada.</p></section>:
  data===undefined?<section className={paper} role="status"><p className="text-sm text-ink-muted">Conferindo registros da pessoa ativa…</p></section>:
  data===null||data.scope!==scope?<section className={paper} role="alert"><p className="text-sm text-ink-muted">Não foi possível confirmar os registros desta pessoa.</p></section>:<>
   <section className={paper} aria-label="Selecionar cirurgia"><div className="flex items-center gap-2"><ClipboardList size={18} className="text-emerald-300"/><h2 className="text-sm font-bold">Cirurgia registrada</h2></div>
    <div className="mt-3"><HealthRelationPicker title="Selecionar cirurgia cadastrada" value={selectedId} onValueChange={v=>{setSelected(v);setQuery('');setFilter('all');}} className="w-full min-h-12 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary">
     <option value="">Selecione uma cirurgia…</option>{surgeries.map(s=><option key={s.id} value={s.id}>{humanDay(s.data)} · {s.procedimento} · {surgeryStatus(s.status)}</option>)}
    </HealthRelationPicker></div>
    {!surgeries.length?<div className="mt-3"><p className="text-xs leading-5 text-ink-muted">Ainda não há cirurgias cadastradas para esta pessoa.</p><Link href="/saude/cirurgias/nova" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-bold text-slate-950"><Plus size={16}/>Cadastrar cirurgia</Link></div>:null}
    {selected&&!selectedId?<p role="alert" className="mt-2 text-xs text-amber-300">A cirurgia solicitada não está disponível para esta pessoa. Selecione outra, sem alterar o histórico.</p>:null}
   </section>
   {journey?<>
    <section className={`${paper} space-y-3`} aria-label="Identificação do procedimento"><div className="flex min-w-0 items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-rose-300/25 bg-rose-300/10 text-rose-300"><HeartPulse size={22}/></span>
     <div className="min-w-0 flex-1"><p className="break-words text-base font-bold text-ink-primary">{journey.procedure}</p><p className="mt-1 text-xs text-ink-secondary">{humanDay(journey.date)}{journey.time?` · ${journey.time}`:''} · {surgeryStatus(journey.status)}</p></div></div>
     {journey.observations?<details className="rounded-xl border border-surface-border bg-surface-raised/70 p-3" open={journey.observations.length<=300}><summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-ink-primary">Observações do procedimento</summary><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-ink-secondary">{journey.observations}</p></details>:null}
     {(journey.doctor||journey.hospital)?<div className="grid gap-2 sm:grid-cols-2">
       {journey.doctor?<Link href={journey.doctor.href} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs text-sky-300"><UserRound size={15}/><span className="min-w-0 flex-1 break-words">{journey.doctor.name}</span><ArrowUpRight size={14}/></Link>:null}
       {journey.hospital?<Link href={journey.hospital.href} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs text-teal-300"><Building2 size={15}/><span className="min-w-0 flex-1 break-words">{journey.hospital.name}</span><ArrowUpRight size={14}/></Link>:null}
      </div>:null}
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
       {label:'Consultas ligadas',count:journey.counts.consultations},{label:'Pedidos únicos',count:journey.counts.exams},
       {label:'Tratamentos',count:journey.counts.treatments},{label:'Documentos',count:journey.counts.documents},
       {label:'Reabilitações',count:journey.counts.rehabilitation},
       {label:'Internações vinculadas',count:journey.counts.hospitalizations},
       {label:'Arquivos privados',count:journey.counts.privateAssets},
       {label:'Registros da jornada',count:journey.counts.surgicalEvents},{label:'Equipe cirúrgica',count:journey.counts.surgicalTeam}
      ].map(x=><div key={x.label} className="rounded-xl border border-surface-border/60 bg-surface-raised/65 p-2.5"><strong className="block text-lg tabular-nums text-ink-primary">{x.count}</strong><span className="mt-1 block text-[10px] leading-4 text-ink-muted">{x.label}</span></div>)}</div>
     <Link href={`/saude/cirurgias/detalhes?id=${encodeURIComponent(journey.id)}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-bold text-slate-950">Abrir e editar cadastro original <ArrowUpRight size={15}/></Link>
    </section>
    <SurgeryA7RecordsPanel surgeryId={journey.id}/>
    <section className={`${paper} space-y-3`} aria-label="Filtrar jornada"><div className="flex items-center gap-2"><Search size={17} className="text-emerald-300"/><h2 className="text-sm font-bold">Explorar registros vinculados</h2></div>
     <label className="block"><span className="mb-1 block text-[11px] text-ink-muted">Buscar em títulos, situações e fontes</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nesta jornada…" className="min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none focus:border-emerald-300"/></label>
     <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por etapa"><button type="button" onClick={()=>setFilter('all')} aria-pressed={filter==='all'} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${filter==='all'?'border-emerald-300/50 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-secondary'}`}>Todas</button>
      {filters.map(stage=><button type="button" key={stage} onClick={()=>setFilter(stage)} aria-pressed={filter===stage} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${filter===stage?'border-emerald-300/50 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-secondary'}`}>{stageName[stage]}</button>)}</div>
    </section>
    {visible.map(item=><StageA7 key={item.stage} stage={item.stage} rows={item.rows}/>)}
    {!visible.length?<section className={paper} role="status"><p className="text-xs leading-5 text-ink-muted">Nenhum registro corresponde aos filtros atuais. Os dados originais não foram alterados.</p><button type="button" onClick={()=>{setFilter('all');setQuery('');}} className="mt-3 min-h-11 rounded-xl border border-emerald-300/30 px-3 text-xs font-semibold text-emerald-300">Limpar filtros</button></section>:null}
    {data.a5Ready?<div className={`${paper} flex flex-wrap items-center justify-between gap-2`}><div><p className="text-xs font-bold">Internações relacionadas</p><p className="mt-1 text-[11px] text-ink-muted">Somente relações confirmadas por identificador. Outras internações permanecem no módulo próprio.</p></div><Link href="/saude/internacoes" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-secondary">Abrir Internações <ArrowUpRight size={15}/></Link></div>:null}

    <section className={`${paper} space-y-3`} aria-label="Vínculos da jornada"><div className="flex items-center gap-2"><GitBranch size={17} className="text-sky-300"/><h2 className="text-sm font-bold">Organizar consultas da cirurgia</h2></div><p className="text-xs leading-5 text-ink-muted">Associe consultas já cadastradas ao pré-operatório, pós-operatório ou retorno. Somente sua confirmação cria o vínculo.</p><SurgeryConsultationLinksM4P2 surgeryId={journey.id}/></section>
    <section className={`${paper} space-y-2`} aria-label="Iniciar reabilitação vinculada"><p className="text-xs font-bold text-ink-primary">Reabilitação relacionada</p><p className="text-xs leading-5 text-ink-muted">Para iniciar um ciclo ou vincular uma origem, use o cadastro canônico de Reabilitação.</p><Link href={`/saude/reabilitacao/novo?origem_tipo=cirurgia&origem_id=${encodeURIComponent(journey.id)}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/30 px-3 text-xs font-semibold text-teal-300"><Plus size={16}/>Abrir Reabilitação</Link></section>
    <section className={`${paper} space-y-2`} aria-label="Limitações dos dados"><h2 className="flex items-center gap-2 text-sm font-bold text-ink-primary"><ShieldCheck size={17} className="text-emerald-300"/>Origem e segurança dos dados</h2>{journey.caveats.map((message,i)=><p key={i} className="flex gap-2 text-[11px] leading-5 text-ink-muted"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-300"/>{message}</p>)}</section>
    </>:surgeries.length&&!selectedId?<section className={paper}><p className="text-xs leading-5 text-ink-muted">Escolha uma cirurgia para visualizar os registros comprovadamente vinculados a ela.</p></section>:null}
   </>}
  <div className="flex flex-wrap gap-2"><Link href="/saude/jornada" className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold text-ink-secondary"><CalendarDays size={15}/>Jornada clínica geral</Link><Link href="/saude/cirurgias" className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 text-xs font-semibold text-ink-secondary"><ArrowUpRight size={15}/>Todas as cirurgias</Link></div>
  <p className="flex gap-2 text-[11px] leading-5 text-ink-muted"><LockKeyhole size={15} className="mt-0.5 shrink-0"/>Visão local, por conta e pessoa. Sem diagnóstico, liberação cirúrgica, alta presumida, previsão de recuperação ou mensagens automáticas.</p>
 </div></main></PageTransition>;
}
