'use client';
import {useMedicationCatalogProfiles} from '@/hooks/useMedicationRegulatoryProfiles';
import {medicationRegulatoryKnowledgeText} from '@/lib/medications/regulatory-copy-ux360';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { projectA4ClinicalFacts } from '@/lib/treatment-a4/clinical-bridge';
import {loadScopedA10} from '@/lib/a10/client-data';
import {projectLongitudinalA10} from '@/lib/a10/longitudinal';
import {A10ContextLink} from '@/components/saude/A10ContextLink';
import Link from 'next/link';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { ArrowLeft, Archive, CalendarDays, Check, ChevronRight, ClipboardList, Download, FileCheck2, FileText, LockKeyhole, Search, ShieldCheck, Stethoscope, WandSparkles, Pill, HeartPulse, FlaskConical, MessageSquareHeart, Brain, CalendarCheck, Activity, Scissors, PackageCheck, ReceiptText, Workflow, FolderLock } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { CustomDatePicker } from '@/components/DatePicker';
import {MedicalDossierRowIconB} from '@/components/saude/MedicalDossierRowIconB';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useBrainV5Pulse } from '@/hooks/useBrainV5Pulse';
import { useSharedHealthIntelligence } from '@/contexts/HealthIntelligenceContext';
import { getLocalTodayISO } from '@/lib/health-utils';
import { MEDICAL_SECTIONS_P3, buildMedicalDossierP3, type MedicalSectionP3, type MedicalModeP3 } from '@/lib/m3/medical-dossier-p3';
import {useVitalEvidence} from '@/hooks/useVitalEvidence';
import { assertMedicalScopeP3 } from '@/lib/m3/medical-scope-p3';

function shiftDay(today:string,days:number){const [y,m,d]=today.split('-').map(Number);return new Date(Date.UTC(y,m-1,d-days+1)).toISOString().slice(0,10);}
function fmt(day:string){return /^\d{4}-\d{2}-\d{2}$/.test(day)?`${day.slice(8)}/${day.slice(5,7)}/${day.slice(0,4)}`:day;}
const DEFAULT_SECTIONS:MedicalSectionP3[]=MEDICAL_SECTIONS_P3.map(section=>section.id).filter(id=>id!=='vital');
const tags={registrado:'Registro acessível',declarado:'Informado no VAULT',motor:'Interpretação registrada'} as const;
export default function MedicalModeP3Page(){
  const {user}=useAuth(),{activePersonId,persons}=useActivePersonId();
  const health=useSharedHealthIntelligence({includeAudit:false});
  const brain=useBrainV5Pulse();
  const {events=[],loading:loadingCare}=useCareFlowM2();
  const today=getLocalTodayISO();
  const vitalEvidence=useVitalEvidence();
  const [start,setStart]=useState(()=>shiftDay(getLocalTodayISO(),30));
  const [end,setEnd]=useState(()=>getLocalTodayISO());
  const [mode,setMode]=useState<MedicalModeP3>('summary');
  const [sections,setSections]=useState<MedicalSectionP3[]>(DEFAULT_SECTIONS);
  const [includeBrain,setIncludeBrain]=useState(false);
  const [episode,setEpisode]=useState('');
  const episodeApplied=useRef('');
  const [readingMode,setReadingMode]=useState(false);
  const [q,setQ]=useState('');
  const [focusSection,setFocusSection]=useState<MedicalSectionP3|'brain'|'all'>('all');
  const [limit,setLimit]=useState(40);
  const period=([7,15,30,90] as const).find(days=>start===shiftDay(today,days)&&end===today)||'custom';
  const [notesDraft,setNotesDraft]=useState({scope:'',text:''});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const urls=useRef<string[]>([]);
  const scopeRef=useRef({userId:user?.id||'',personId:activePersonId||'',sig:''});
  const signature=[start,end,mode,sections.join(','),includeBrain?'brain':'factual',episode].join('|');
  scopeRef.current={userId:user?.id||'',personId:activePersonId||'',sig:signature};
  const scopeKey=`${user?.id||''}:${activePersonId||''}`;
  const a10=useLiveQuery(()=>loadScopedA10(user?.id||'',activePersonId||''),[user?.id,activePersonId]);
  const a10Facts=useMemo(()=>a10?.verified&&a10.scope===scopeKey?projectLongitudinalA10(a10.data,user?.id||'',activePersonId||'',false,Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC').facts:[],[a10,scopeKey,user?.id,activePersonId]);
  // Scoped A4 ledger; no duplicate writer and no stale person's phases in PDF.
  const a4Phases=useLiveQuery(async()=>{
    const uid=user?.id||'',pid=activePersonId||'';
    if(!uid||!pid)return {scope:scopeKey,rows:[]};
    const [person,rows]=await Promise.all([db.persons.get(pid),
      db.a1_treatment_phases.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
    if(person?.user_id!==uid)return {scope:scopeKey,rows:[]};
    return {scope:scopeKey,rows:rows.filter(r=>r.user_id===uid&&r.person_id===pid)};
  },[user?.id,activePersonId]);
  const rehab=useLiveQuery(async()=>{
    const uid=user?.id||'',pid=activePersonId||'';
    if(!uid||!pid)return {scope:scopeKey,programs:[],sessions:[],milestones:[],origins:[]};
    const [person,programs,sessions,milestones,origins]=await Promise.all([db.persons.get(pid),
      db.rehab_programs_m5.where('user_id').equals(uid).toArray(),db.rehab_sessions_m5.where('user_id').equals(uid).toArray(),
      db.rehab_milestones_m5.where('user_id').equals(uid).toArray(),db.rehab_origin_links_m5.where('user_id').equals(uid).toArray()]);
    if(person?.user_id!==uid)return {scope:scopeKey,programs:[],sessions:[],milestones:[],origins:[]};
    return {scope:scopeKey,programs,sessions,milestones,origins};
  },[user?.id,activePersonId]);
  const surgical=useLiveQuery(async()=>{
    const uid=user?.id||'',pid=activePersonId||'';
    if(!uid||!pid)return {scope:scopeKey,events:[],team:[]};
    const [person,events,team]=await Promise.all([db.persons.get(pid),
      db.surgery_journey_events_a7.where('[user_id+person_id]').equals([uid,pid]).toArray(),
      db.surgery_team_a7.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
    if(person?.user_id!==uid)return {scope:scopeKey,events:[],team:[]};
    return {scope:scopeKey,events:events.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at),
      team:team.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at)};
  },[user?.id,activePersonId]);
  const vaccination=useLiveQuery(async()=>{
    const uid=user?.id||'',pid=activePersonId||'';
    if(!uid||!pid)return {scope:scopeKey,courses:[],events:[]};
    const [person,courses,events]=await Promise.all([db.persons.get(pid),
      db.vaccination_courses_a8.where('[user_id+person_id]').equals([uid,pid]).toArray(),
      db.vaccination_events_a8.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
    if(person?.user_id!==uid)return {scope:scopeKey,courses:[],events:[]};
    return {scope:scopeKey,courses,events};
  },[user?.id,activePersonId]);
  const a9=useLiveQuery(async()=>{
    const uid=user?.id||'',pid=activePersonId||'';
    if(!uid||!pid)return {scope:scopeKey,procedures:[],sensitivities:[]};
    const [person,procedures,sensitivities]=await Promise.all([db.persons.get(pid),
      db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray(),
      db.sensitivity_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
    if(person?.user_id!==uid)return {scope:scopeKey,procedures:[],sensitivities:[]};
    return {scope:scopeKey,procedures,sensitivities};
  },[user?.id,activePersonId]);
  const notes=notesDraft.scope===scopeKey?notesDraft.text:'';
  useEffect(()=>{
    setNotesDraft({scope:'',text:''});setMessage('');setQ('');setLimit(40);setFocusSection('all');setEpisode('');setReadingMode(false);
    return ()=>{for(const url of urls.current)URL.revokeObjectURL(url);urls.current=[];};
  },[scopeKey]);
  // Estado visual é derivado das datas, não de um chip divergente.
  useEffect(()=>{
    const q=new URLSearchParams(window.location.search);
    const a=q.get('inicio'),b=q.get('fim');
    if(a&&b&&/^\d{4}-\d{2}-\d{2}$/.test(a)&&/^\d{4}-\d{2}-\d{2}$/.test(b)&&a<=b&&b<=getLocalTodayISO()){
      setStart(a);setEnd(b);
    }
    const view=q.get('formato');if(view==='summary'||view==='detailed')setMode(view);
    const ids=(q.get('secoes')||'').split(',').filter(x=>MEDICAL_SECTIONS_P3.some(s=>s.id===x)) as MedicalSectionP3[];
    if(ids.length)setSections([...new Set(ids)]);
    if(q.has('alertas'))setIncludeBrain(q.get('alertas')==='1');
  },[scopeKey]);
  const consultations=useMemo(()=>health.context?.consultas.filter(c=>
    c.id&&c.user_id===user?.id&&c.person_id===activePersonId).sort((a,b)=>b.data.localeCompare(a.data))||[],
    [health.context?.consultas,user?.id,activePersonId]);
  // Leitura voluntária do vínculo explícito vindo de Detalhes da Consulta.
  useEffect(()=>{
    if(!user?.id||!activePersonId||!health.context||episodeApplied.current===scopeKey)return;
    const id=new URLSearchParams(window.location.search).get('consulta')||'';
    const item=consultations.find(c=>c.id===id);
    if(!item)return;
    episodeApplied.current=scopeKey;
    setEpisode(item.id||'');
    if(item.data&&item.data<start)setStart(item.data);
  },[scopeKey,user?.id,activePersonId,health.context,consultations,start]);
  const person=persons.find(p=>p.id===activePersonId);
  const ready=Boolean(user?.id&&activePersonId&&a10?.scope===scopeKey&&a10.verified&&!health.isLoading&&!health.error&&!loadingCare&&(!includeBrain||!brain.isLoading)&&health.context?.userId===user?.id&&health.context?.personId===activePersonId&&a4Phases?.scope===scopeKey&&surgical?.scope===scopeKey&&(!sections.includes('rehabilitation')||rehab?.scope===scopeKey)&&(!sections.includes('vaccinations')||vaccination?.scope===scopeKey)&&(!sections.some(s=>s==='procedures_a9'||s==='sensitivities_a9')||a9?.scope===scopeKey));
  const regulatoryMeds=useMemo(()=>health.context?.userId===user?.id&&health.context?.personId===activePersonId
    ? health.context.medicamentos.filter(m=>m.user_id===user?.id&&m.person_id===activePersonId) : [],[health.context,user?.id,activePersonId]);
  const {regulatoryProfiles:medicalRegulatory}=useMedicationCatalogProfiles(regulatoryMeds,false);
  const regulatoryDescriptions=useMemo(()=>Object.fromEntries(regulatoryMeds.filter(m=>m.id).map(m=>[m.id!,medicationRegulatoryKnowledgeText(medicalRegulatory[m.id!],m.tipo_receita)])),[regulatoryMeds,medicalRegulatory]);
  const a4Facts=useMemo(()=>user?.id&&activePersonId&&health.context&&a4Phases?.scope===scopeKey?
    projectA4ClinicalFacts({userId:user.id,personId:activePersonId,phases:a4Phases.rows,
      treatments:health.context.tratamentos,medications:health.context.medicamentos,from:start,through:end,max:2000}):[],
    [user?.id,activePersonId,health.context,a4Phases,scopeKey,start,end]);
  const prepared=useMemo(()=>{
    if(!ready||!user?.id||!activePersonId||!health.context)return {report:null,error:''};
    try{
      if(sections.includes('vital')&&!episode&&(!vitalEvidence.data||vitalEvidence.scope?.user_id!==user.id||vitalEvidence.scope?.person_id!==activePersonId))throw Error('Aguarde registros Vital ou desmarque a seção.');
      return {report:buildMedicalDossierP3({regulatoryDescriptions,vitalEvidence:vitalEvidence.data??undefined,context:health.context,careflow:events,ledger:includeBrain?brain.records:[],includeBrain,treatmentFacts:a4Facts,rehab:rehab?.scope===scopeKey?rehab:undefined,
        surgeryEvents:surgical?.scope===scopeKey?surgical.events:[],surgeryTeam:surgical?.scope===scopeKey?surgical.team:[],vaccination:vaccination?.scope===scopeKey?vaccination:undefined,clinicalA9:a9?.scope===scopeKey?a9:undefined,longitudinalA10:a10Facts,hospitalizationLinksA10:a10?.scope===scopeKey?a10.data.hospitalization_relations_a5:undefined,
        ownerId:user.id,personId:activePersonId,personName:person?.name||'Pessoa ativa',start,end,mode,sections,consultationId:episode||undefined}),error:''};
    }catch(error){return {report:null,error:error instanceof Error?error.message:'Não foi possível preparar esta prévia.'};}
  },[ready,user?.id,activePersonId,health.context,events,brain.records,includeBrain,person?.name,start,end,mode,sections,episode,rehab,scopeKey,a4Facts,surgical,vaccination,a9,a10Facts,vitalEvidence.data,vitalEvidence.scope,regulatoryDescriptions]);
  const normalized=q.trim().toLocaleLowerCase('pt-BR');
  // Busca percorre a projeção detalhada completa, mas não altera o PDF.
  const searchReport=useMemo(()=>{
    if(!normalized||!ready||!user?.id||!activePersonId||!health.context)return prepared.report;
    try{return buildMedicalDossierP3({regulatoryDescriptions,vitalEvidence:vitalEvidence.data??undefined,context:health.context,careflow:events,ledger:includeBrain?brain.records:[],includeBrain,treatmentFacts:a4Facts,rehab:rehab?.scope===scopeKey?rehab:undefined,
        surgeryEvents:surgical?.scope===scopeKey?surgical.events:[],surgeryTeam:surgical?.scope===scopeKey?surgical.team:[],vaccination:vaccination?.scope===scopeKey?vaccination:undefined,clinicalA9:a9?.scope===scopeKey?a9:undefined,longitudinalA10:a10Facts,hospitalizationLinksA10:a10?.scope===scopeKey?a10.data.hospitalization_relations_a5:undefined,
      ownerId:user.id,personId:activePersonId,personName:person?.name||'Pessoa ativa',start,end,mode:'detailed',sections,consultationId:episode||undefined});}
    catch{return prepared.report;}
  },[normalized,ready,user?.id,activePersonId,health.context,events,brain.records,includeBrain,person?.name,start,end,sections,episode,prepared.report,rehab,scopeKey,a4Facts,surgical,vaccination,a9,a10Facts,vitalEvidence.data,vitalEvidence.scope,regulatoryDescriptions]);
  const filtered=useMemo(()=>searchReport?.rows.filter(r=>
    (focusSection==='all'||r.section===focusSection)&&
    (!normalized||[r.title,r.detail,r.source,...r.relations].join(' ').toLocaleLowerCase('pt-BR').includes(normalized)))||[],
    [searchReport,normalized,focusSection]);
  const groups=useMemo(()=>{
    const map=new Map<string,typeof filtered>();
    for(const row of filtered.slice(0,limit)){const key=row.section;const list=map.get(key)||[];list.push(row);map.set(key,list);}
    return [...map.entries()];
  },[filtered,limit]);
  const humanClinicalTextV34X=(value:string)=>value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$3/$2/$1').replace(/\bhealth_record\b/gi,'registro de saúde');
  const medicalReturn='/saude/careflow/modo-medico?'+new URLSearchParams({inicio:start,fim:end,formato:mode,secoes:sections.join(','),alertas:includeBrain?'1':'0',consulta:episode}).toString()+'#careflow-modo-acoes';
  const groupIcon=(key:string)=>key==='vital'?Activity:key==='doses'||key==='medications'?Pill:key==='consultations'?CalendarCheck:key==='careflow'||key==='exams'?FlaskConical:key==='symptoms'?MessageSquareHeart:key==='measurements'?HeartPulse:key==='surgeries'||key==='procedures_a9'?Scissors:key==='sensitivities_a9'?Activity:key==='withdrawals'?PackageCheck:key==='prescriptions'?ReceiptText:key==='treatments'?Workflow:key==='documents'?FolderLock:key==='brain'?Brain:Activity;
  const groupTone=(key:string)=>key==='vital'?'text-teal-300':key==='brain'?'text-violet-300':key==='consultations'?'text-sky-300':key==='symptoms'||key==='sensitivities_a9'?'text-rose-300':key==='procedures_a9'?'text-teal-300':key==='measurements'?'text-cyan-300':key==='doses'||key==='medications'||key==='withdrawals'?'text-emerald-300':key==='treatments'?'text-emerald-300':key==='documents'?'text-amber-200':'text-amber-300';
  function choose(section:MedicalSectionP3){
    setSections(value=>value.includes(section)?value.filter(x=>x!==section):[...value,section]);
    setFocusSection('all');setLimit(40);setMessage('');
  }
  function preset(days:7|15|30|90){setStart(shiftDay(today,days));setEnd(today);setLimit(40);setMessage('');}
  function assertSame(scope:{userId:string;personId:string;sig:string}){
    const actual=scopeRef.current;
    assertMedicalScopeP3({userId:scope.userId,personId:scope.personId,signature:scope.sig},
      {userId:actual.userId,personId:actual.personId,signature:actual.sig});
  }
  async function createPdf(action:'archive'|'download'){
    if(!prepared.report||!user?.id||!activePersonId||busy)return;
    const scope={userId:user.id,personId:activePersonId,sig:signature};
    const copy=prepared.report;
    setBusy(true);setMessage('');
    try{
      assertSame(scope);
      const {makeMedicalPdfP3,medicalP3FileName}=await import('@/lib/m3/medical-pdf-p3');
      assertSame(scope);
      const blob=await makeMedicalPdfP3(copy);
      assertSame(scope);
      if(action==='archive'){
        const {pdfLibraryM2}=await import('@/lib/careflow-m2/pdf-library');
        assertSame(scope);
        const savedId=await pdfLibraryM2.add(scope.personId,{title:`Modo Médico · ${mode==='summary'?'Resumo':'Detalhado'} · ${fmt(end)}`,start,end,
          origin:'clinical_report',blob});
        try{assertSame(scope);}
        catch(e){const {db}=await import('@/lib/db');await db.careflow_reports_m2.delete(savedId);throw e;}
        setMessage('PDF arquivado somente neste aparelho. Nenhum arquivo foi enviado.');
      }else{
        const url=URL.createObjectURL(blob);urls.current.push(url);
        try{
          assertSame(scope);
          const anchor=document.createElement('a');anchor.href=url;anchor.download=medicalP3FileName(copy);
          anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();
          setMessage('Download solicitado. Confira o arquivo e o destinatário antes de compartilhar.');
        }finally{
          // O browser precisa de uma janela curta para consumir a URL de download.
          window.setTimeout(()=>{URL.revokeObjectURL(url);urls.current=urls.current.filter(x=>x!==url);},30000);
        }
      }
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível gerar o PDF. Seus registros foram preservados.');}
    finally{setBusy(false);}
  }
  const selectedCount=sections.length;
  return <PageTransition><main className="min-h-screen bg-void px-3 pb-36 pt-5 text-ink-primary header-safe-top sm:px-5 vault-adaptive-tail"><div className="mx-auto max-w-3xl space-y-4">
    <header className="flex items-start gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-surface-border bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300">Minha saúde · Em atendimento</p><h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Modo Médico</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Resumo legível para mostrar no consultório, com registros relacionados e PDF opcional. Você escolhe o que exibir.</p></div></header>
    <A10ContextLink context="medical" compact />
    <section className="overflow-hidden rounded-[26px] border border-emerald-300/25 bg-[radial-gradient(circle_at_95%_0%,rgba(16,185,129,.14),transparent_52%),linear-gradient(145deg,#15232c,#0c151e)] p-4 shadow-xl shadow-black/10"><div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300"><Stethoscope size={21}/></span><div className="min-w-0 flex-1"><strong className="block break-words text-sm">{person?.name||'Pessoa não selecionada'}</strong><p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">Dados da conta e pessoa ativa. Nenhum vínculo é criado para completar uma lacuna.</p></div></div><div className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-emerald-300"/><p className="text-[11px] leading-relaxed text-emerald-100/80">Privado e local. A prévia não compartilha informações. Para exportar ou arquivar, você precisa tocar no botão correspondente.</p></div></section>
    <section aria-label="Modo de apresentação" className="rounded-[22px] border border-surface-border bg-surface p-3"><div className="flex items-center gap-2 text-sm font-bold"><FileCheck2 size={16} className="text-emerald-300"/>Formato da consulta</div><div className="mt-3 grid grid-cols-2 gap-2">{([['summary','Resumo médico','Últimas 30 ocorrências'],['detailed','Histórico completo','Todos os registros escolhidos']] as const).map(([id,label,description])=><button type="button" key={id} aria-pressed={mode===id} disabled={busy} onClick={()=>{setMode(id);setLimit(40);}} className={`min-h-20 min-w-0 rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${mode===id?'border-emerald-300/50 bg-emerald-300/[.08]':'border-surface-border bg-surface-raised'}`}><span className="flex items-center gap-2 text-xs font-semibold">{mode===id&&<Check size={14} className="shrink-0 text-emerald-300"/>}{label}</span><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{description}</span></button>)}</div></section>
    <section aria-label="Episódio clínico confirmado" className="rounded-[22px] border border-sky-300/20 bg-surface p-4">
      <h2 className="text-sm font-bold text-sky-200">Consulta específica · Jornada clínica</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">Selecione um atendimento para mostrar somente fatos ligados por IDs reais. Sem vínculo documentado não significa que o fato não ocorreu.</p>
      <div className="mt-3"><HealthRelationPicker title="Selecionar uma consulta" kind="consultation" value={episode} onValueChange={value=>{setEpisode(value);setLimit(40);setMessage('');const item=consultations.find(c=>c.id===value);if(item?.data&&item.data<start)setStart(item.data);}} className="min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary">
        <option value="">Histórico geral (sem filtro por episódio)</option>
        {consultations.map(c=><option value={c.id} key={c.id}>{fmt(c.data)} · {c.especialidade||c.medico||'Consulta'}</option>)}
      </HealthRelationPicker></div>
      {episode?<p className="mt-2 text-[11px] text-sky-200">Filtro por vínculo explícito ativo: consultas, sintomas, pedidos e medicamentos ligados; doses não são associadas por coincidência.</p>:null}
      <button type="button" aria-pressed={readingMode} onClick={()=>setReadingMode(value=>!value)} className="mt-3 min-h-11 rounded-xl border border-emerald-300/30 px-3 text-xs font-semibold text-emerald-200">{readingMode?'Voltar à leitura compacta':'Leitura ampliada para mostrar no consultório'}</button>
    </section>
    <section className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2 text-sm font-bold"><CalendarDays size={17} className="text-sky-300"/>Período documentado</div><div className="mt-3 flex flex-wrap gap-2">{([7,15,30,90] as const).map(days=><button type="button" key={days} onClick={()=>preset(days)} disabled={busy} aria-pressed={period===days} className={`min-h-11 rounded-xl border px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${period===days?'border-emerald-300/60 bg-emerald-300/[.14] text-emerald-100':'border-surface-border bg-surface-raised text-ink-muted'}`}>{days} dias</button>)}<button type="button" aria-pressed={period==='custom'} onClick={()=>document.getElementById('careflow-periodo-custom')?.scrollIntoView({block:'center'})} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${period==='custom'?'border-emerald-300/60 bg-emerald-300/[.14] text-emerald-100':'border-surface-border bg-surface-raised text-ink-muted'}`}>Personalizado</button></div><div id="careflow-periodo-custom" className="mt-3 grid grid-cols-1 gap-3 min-[370px]:grid-cols-2"><CustomDatePicker label="Início" value={start} onChange={setStart} maxDate={today}/><CustomDatePicker label="Fim" value={end} onChange={setEnd} maxDate={today}/></div></section>
    <section aria-label="Seções escolhidas para o relatório" className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2"><ClipboardList size={17} className="text-emerald-300"/><h2 className="text-sm font-bold">O que incluir</h2><span className="ml-auto text-[10px] tabular-nums text-ink-muted">{selectedCount} selecionadas</span></div><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Todas as áreas começam disponíveis. Desmarque somente o que não deve entrar no dossiê.</p><div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-2">{MEDICAL_SECTIONS_P3.map(s=>{const Icon=groupIcon(s.id);return <button type="button" key={s.id} disabled={busy} aria-pressed={sections.includes(s.id)} onClick={()=>choose(s.id)} className={`flex min-h-16 min-w-0 items-center gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${sections.includes(s.id)?'border-emerald-300/35 bg-emerald-300/[.06]':'border-surface-border bg-surface-raised'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${sections.includes(s.id)?'border-emerald-300/35 bg-emerald-300/10': 'border-surface-border'}`}><Icon size={15} className={groupTone(s.id)}/></span><span className="min-w-0 flex-1"><strong className="block break-words text-xs">{s.label}</strong><span className="mt-1 block text-[10px] leading-snug text-ink-muted">{s.description}</span></span>{sections.includes(s.id)?<Check size={14} className="shrink-0 text-emerald-300"/>:null}</button>})}</div><button type="button" aria-pressed={includeBrain} disabled={busy} onClick={()=>setIncludeBrain(x=>!x)} className={`mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-xs ${includeBrain?'border-violet-300/45 bg-violet-300/10':'border-surface-border bg-surface-raised'}`}><WandSparkles size={16} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1">Incluir observações do Brain já registradas (não são diagnóstico).</span>{includeBrain&&<Check size={16}/>}</button></section>
    <section id="careflow-modo-acoes" className="scroll-mt-28 rounded-[22px] border border-surface-border bg-surface p-4"><h2 className="text-sm font-bold">Antes, durante e depois da consulta</h2><div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-3"><Link href={withReturnTarget('/saude/consultas',medicalReturn)} className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary"><span className="flex items-center gap-1.5"><Stethoscope size={16} className="shrink-0 text-sky-300"/>Preparar consulta</span><ChevronRight size={16}/></Link><Link href={withReturnTarget('/saude/careflow/episodios',medicalReturn)} className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary"><span className="flex items-center gap-1.5"><ClipboardList size={16} className="shrink-0 text-sky-300"/>Conferir episódio</span><ChevronRight size={16}/></Link><Link href={withReturnTarget('/saude/careflow/exames',medicalReturn)} className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary"><span className="flex items-center gap-1.5"><FlaskConical size={16} className="shrink-0 text-emerald-300"/>Acompanhar pedidos</span><ChevronRight size={16}/></Link></div><label className="mt-4 block text-[11px] font-semibold text-ink-secondary" htmlFor="p3-notas">Pauta temporária nesta tela (opcional)</label><textarea id="p3-notas" maxLength={1800} rows={3} value={notes} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>setNotesDraft({scope:scopeKey,text:e.target.value})} placeholder="Perguntas ou pontos para conversar com o profissional…" className="mt-2 block min-h-24 w-full resize-y rounded-2xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-300/10"/><p className="mt-2 text-[10px] leading-relaxed text-ink-muted">A pauta não é salva nem entra no PDF. A troca de pessoa limpa este rascunho. Decisão conversada não altera receita ou dose automaticamente.</p></section>
    {health.error&&<p role="alert" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-200">{health.error}</p>}
    {!ready?<p role="status" className="rounded-2xl border border-surface-border bg-surface p-4 text-xs text-ink-muted">{health.isLoading||loadingCare||(includeBrain&&brain.isLoading)?'Carregando os dados da pessoa selecionada…':'Aguardando autenticação e contexto clínico da pessoa.'}</p>:prepared.error?<p role="alert" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-200">{prepared.error}</p>:prepared.report&&<>
      <section aria-label="Prévia revisável do Modo Médico" className="rounded-[22px] border border-emerald-300/20 bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><FileText size={17} className="text-emerald-300"/>Prévia para conferência</h2><span className="text-[10px] tabular-nums text-ink-muted">{prepared.report.rows.length} / {prepared.report.availableCount} no PDF · {filtered.length} na busca</span></div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{fmt(start)} a {fmt(end)} · {mode==='summary'?'Resumo':'Detalhado'}{prepared.report.episode?` · Episódio: ${prepared.report.episode.title} em ${fmt(prepared.report.episode.date)}`:''}. Todos os registros são exclusivos da pessoa ativa. Ausência de registro não prova ausência de fato clínico.</p>
      {normalized?<p className="mt-2 rounded-xl border border-sky-300/20 bg-sky-300/[.05] px-3 py-2 text-xs text-sky-100">Busca aplicada ao histórico detalhado acessível. O arquivo PDF continua seguindo as seções, período e formato selecionados; a busca visual não exclui eventos do arquivo.</p>:null}
      {readingMode?<p className="mt-2 rounded-xl border border-sky-300/20 p-3 text-sm leading-relaxed text-sky-100">Leitura ampliada · selecione as seções que deseja mostrar ao profissional. Nada é enviado automaticamente.</p>:null}
      {prepared.report.omittedBySummary>0&&<p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-[11px] text-amber-100">O resumo exibe 30 ocorrências recentes e omite {prepared.report.omittedBySummary}. Se precisar do histórico completo, escolha o modo detalhado.</p>}
      <label className="relative mt-3 block"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted"/><span className="sr-only">Buscar na prévia</span><input value={q} onChange={(e:ChangeEvent<HTMLInputElement>)=>{setQ(e.target.value);setLimit(40);}} placeholder="Buscar registro ou fonte…" type="search" className="min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised py-2 pl-10 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-emerald-300/50 focus:outline-none"/></label>
      <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-1">
        <HealthRelationPicker compact title="Filtrar registros por área" value={focusSection}
          onValueChange={value=>{setFocusSection(value as MedicalSectionP3|'brain'|'all');setLimit(40);}}
          className="w-full text-sm font-semibold text-ink-primary">
          <option value="all">Todas as áreas do dossiê</option>
          {MEDICAL_SECTIONS_P3.map(section=><option key={section.id} value={section.id} disabled={!sections.includes(section.id)}>{section.label}{sections.includes(section.id)?'':' · não incluída'}</option>)}
          {includeBrain?<option value="brain">Brain · alertas documentados</option>:null}
        </HealthRelationPicker>
      </div>
      <div className="mt-3 space-y-2">
        {filtered.length===0?<p className="rounded-xl bg-surface-raised p-4 text-sm text-ink-muted">Nenhum registro acessível neste filtro. A ausência não comprova resultado normal ou inexistência de sintomas.</p>:
         groups.map(([section,rows],groupIndex)=>{const Icon=groupIcon(section);return <details key={section} open={groupIndex===0} className="group overflow-hidden rounded-2xl border border-surface-border/70 bg-void/30"><summary className="flex min-h-12 cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold"><Icon size={17} className={groupTone(section)}/><span className="min-w-0 flex-1">{MEDICAL_SECTIONS_P3.find(x=>x.id===section)?.label||'Alertas do Brain'} ({rows.length})</span><ChevronRight size={15} className="transition-transform group-open:rotate-90"/></summary><div className="space-y-2 border-t border-surface-border/50 p-2">{rows.map(row=><details key={row.key} className="group overflow-hidden rounded-xl border border-surface-border/80 bg-surface-raised"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><MedicalDossierRowIconB row={row} fallbackIcon={Icon} fallbackTone={groupTone(section)}/><span className="min-w-0 flex-1"><strong className={`block break-words text-ink-primary ${readingMode?'text-base':'text-sm'}`}>{humanClinicalTextV34X(row.title)}</strong><span className="mt-1 block text-[11px] text-ink-muted">{fmt(row.date)}{row.time?' às '+row.time:''} · {tags[row.provenance]}</span></span><ChevronRight size={16} className="shrink-0 transition-transform group-open:rotate-90"/></summary><div className="space-y-2 border-t border-surface-border/60 px-3 py-3">{row.detail?<p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-secondary">{humanClinicalTextV34X(row.detail)}</p>:null}{row.relations.length>0?<div className="flex flex-wrap gap-1.5">{row.relations.map(link=>{const RelIcon=/consulta|médic|profission/i.test(link)?Stethoscope:/tratamento/i.test(link)?Workflow:/medicamento|dose|receita/i.test(link)?Pill:/exame|laudo/i.test(link)?FlaskConical:/sintoma|relato/i.test(link)?MessageSquareHeart:FileCheck2;return <span key={link} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-300/20 px-2 py-1 text-xs text-sky-200"><RelIcon size={14} aria-hidden="true" className="shrink-0"/><span className="min-w-0 break-words">{humanClinicalTextV34X(link)}</span></span>})}</div>:null}{row.href?<Link href={withReturnTarget(row.href,medicalReturn)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-300">Abrir registro de origem<ChevronRight size={15}/></Link>:<p className="text-xs text-amber-200">Origem exata não disponível; não há link genérico.</p>}</div></details>)}</div></details>})}
         {filtered.length>limit?<button type="button" onClick={()=>setLimit(x=>x+40)} className="min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised text-sm text-ink-primary">Mostrar mais {Math.min(40,filtered.length-limit)} registros</button>:null}
      </div></section>
      <section className="rounded-[22px] border border-emerald-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={17} className="text-emerald-300"/>Gerar somente após revisar</h2><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">O PDF A4 inclui somente as seções selecionadas, com a origem e as limitações dos registros. Não inclui a pauta temporária, anexos binários ou dados de outras pessoas.</p><div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-2"><button type="button" disabled={busy||sections.length===0} onClick={()=>void createPdf('archive')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/[.10] px-3 text-xs font-bold text-emerald-200 disabled:opacity-40"><Archive size={16}/>{busy?'Preparando…':'Arquivar PDF local'}</button><button type="button" disabled={busy||sections.length===0} onClick={()=>void createPdf('download')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-void disabled:opacity-40"><Download size={16}/>{busy?'Preparando…':'Baixar PDF A4'}</button></div><Link href="/saude/careflow/relatorios" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-amber-200">Biblioteca privada de PDFs<ChevronRight size={15}/></Link></section>
    </>}
    {message&&<p role="status" className="rounded-xl border border-sky-300/20 bg-sky-300/[.05] p-3 text-xs leading-relaxed text-sky-100">{message}</p>}
    <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><LockKeyhole size={15} className="mt-0.5 shrink-0"/>Sem envio automático, alterações de estoque, prescrição, diagnóstico ou movimentação de documentos. O arquivo PDF fica somente no aparelho até você decidir o que fazer com ele.</p>
  </div></main></PageTransition>;
}
