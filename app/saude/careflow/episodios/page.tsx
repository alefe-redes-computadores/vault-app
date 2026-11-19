'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Activity, Archive, ArrowLeft, ArrowUpRight, BookOpenCheck, CalendarClock, Check, ChevronRight, ClipboardList, Download, FileText, FlaskConical, HeartPulse, LockKeyhole, MessageSquareHeart, Pill, ShieldCheck, Stethoscope } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useSharedHealthIntelligence } from '@/contexts/HealthIntelligenceContext';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { getLocalTodayISO } from '@/lib/health-utils';
import { assertMedicalScopeP3 } from '@/lib/m3/medical-scope-p3';
import { buildClinicalEpisodeP4, type EpisodeSnapshotP4 } from '@/lib/m3/clinical-episode-p4';
import { buildReturnBriefD3 } from '@/lib/m3/brain-return-d3';
import { BrainReturnCardD3 } from '@/components/saude/BrainReturnCardD3';
import type { MedicalModeP3 } from '@/lib/m3/medical-dossier-p3';

const formatDay=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`:v;
function EpisodeClinicalViewP4(){
  const query=useSearchParams();const requestedId=query.get('consulta')||'';
  const {user}=useAuth();const {activePersonId,persons}=useActivePersonId();
  const health=useSharedHealthIntelligence({includeAudit:false});
  const {events=[],loading}=useCareFlowM2();
  const today=getLocalTodayISO();
  const [selectedId,setSelectedId]=useState('');const [mode,setMode]=useState<MedicalModeP3>('summary');
  const [limit,setLimit]=useState(20);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const urls=useRef<string[]>([]);
  const scopeRef=useRef({userId:user?.id||'',personId:activePersonId||'',signature:''});
  const ownConsultations=useMemo(()=>{
    if(!user?.id||!activePersonId||!health.context)return [];
    return health.context.consultas.filter(c=>c.id&&c.user_id===user.id&&c.person_id===activePersonId)
      .sort((a,b)=>b.data.localeCompare(a.data));
  },[user?.id,activePersonId,health.context]);
  const defaultConsultation=ownConsultations.find(c=>c.data<=today&&c.status==='realizada')||
    ownConsultations.find(c=>c.data<=today)||ownConsultations[0];
  const effectiveId=ownConsultations.some(c=>c.id===selectedId)?selectedId:
    ownConsultations.some(c=>c.id===requestedId)?requestedId:defaultConsultation?.id||'';
  const signature=[effectiveId,mode,today].join('|');
  scopeRef.current={userId:user?.id||'',personId:activePersonId||'',signature};
  const scopeKey=`${user?.id||''}:${activePersonId||''}`;
  useEffect(()=>{setSelectedId('');setMessage('');setLimit(20);
    return ()=>{for(const url of urls.current)URL.revokeObjectURL(url);urls.current=[];};
  },[scopeKey,requestedId]);
  const selected=ownConsultations.find(c=>c.id===effectiveId);
  const ready=Boolean(user?.id&&activePersonId&&effectiveId&&!health.isLoading&&!health.error&&!loading&&
    health.context?.userId===user?.id&&health.context?.personId===activePersonId);
  const personName=persons.find(p=>p.id===activePersonId)?.name||'Pessoa ativa';
  const prepared=useMemo<{episode:EpisodeSnapshotP4|null;error:string}>(()=>{
    if(!ready||!health.context||!user?.id||!activePersonId)return {episode:null,error:''};
    try{return {episode:buildClinicalEpisodeP4({context:health.context,careflow:events,userId:user.id,personId:activePersonId,
      consultationId:effectiveId,personName,today,mode}),error:''};}
    catch(error){return {episode:null,error:error instanceof Error?error.message:'Falha na leitura desta consulta.'};}
  },[ready,health.context,events,user?.id,activePersonId,effectiveId,personName,today,mode]);
  const same=(expected:{userId:string;personId:string;signature:string})=>assertMedicalScopeP3(expected,scopeRef.current);
  async function exportPdf(action:'download'|'archive'){
    if(busy||!prepared.episode||!user?.id||!activePersonId)return;
    const scope={userId:user.id,personId:activePersonId,signature};
    const dossier=prepared.episode.report;const consultId=prepared.episode.consultation.id!;
    setBusy(true);setMessage('');
    try{
      same(scope);
      const {makeMedicalPdfP3}=await import('@/lib/m3/medical-pdf-p3');same(scope);
      const blob=await makeMedicalPdfP3(dossier);same(scope);
      if(action==='archive'){
        const {pdfLibraryM2}=await import('@/lib/careflow-m2/pdf-library');same(scope);
        const savedId=await pdfLibraryM2.add(scope.personId,{title:`Episódio clínico · ${formatDay(dossier.start)} · ${mode==='summary'?'Resumo':'Detalhado'}`,
          start:dossier.start,end:dossier.end,origin:'clinical_report',blob});
        try{same(scope);}catch(error){const {db}=await import('@/lib/db');await db.careflow_reports_m2.delete(savedId);throw error;}
        setMessage('PDF do episódio arquivado apenas neste aparelho. Sem envio automático.');
      }else{
        const url=URL.createObjectURL(blob);urls.current.push(url);
        try{same(scope);const a=document.createElement('a');a.href=url;a.download=`VAULT-Episodio-${dossier.start}-${consultId.slice(0,8)}.pdf`;
          a.style.display='none';document.body.appendChild(a);a.click();a.remove();
          setMessage('Download solicitado. Verifique conteúdo e destinatário antes de compartilhar.');}
        finally{window.setTimeout(()=>{URL.revokeObjectURL(url);urls.current=urls.current.filter(x=>x!==url);},30000);}
      }
    }catch(error){setMessage(error instanceof Error?error.message:'Falha ao exportar; registros originais intactos.');}
    finally{setBusy(false);}
  }
  const ep=prepared.episode;
  const returnBriefD3=useMemo(()=>{
    if(!ep)return null;
    try{return buildReturnBriefD3(ep,today);}catch{return null;}
  },[ep,today]);
  return <PageTransition><main className="min-h-screen bg-void px-3 pb-36 pt-5 text-ink-primary header-safe-top sm:px-5">
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-start gap-3"><Link href="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-surface-border bg-surface"><ArrowLeft size={19}/></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-sky-300">VAULT · Jornada Clínica</p><h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Episódio de atendimento</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Uma consulta, seus desdobramentos comprovados e o resumo para mostrar ao profissional.</p></div></header>
      <section className="overflow-hidden rounded-[25px] border border-sky-300/20 bg-[linear-gradient(150deg,#14242f,#0c151d)] p-4">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-sky-300/25 bg-sky-300/[.08] text-sky-300"><Stethoscope size={21}/></span><div className="min-w-0 flex-1"><strong className="block break-words text-sm">{personName}</strong><p className="mt-1 text-xs leading-relaxed text-ink-muted">Consulta original preservada. Os vínculos não são deduzidos por coincidência de nome ou data.</p></div></div>
        <div className="mt-4"><HealthRelationPicker title="Escolher uma consulta da pessoa ativa" value={effectiveId} onValueChange={value=>{setSelectedId(value);setLimit(20);setMessage('');}} className="w-full min-h-12 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary">
          {ownConsultations.length===0?<option value="">Nenhuma consulta cadastrada</option>:ownConsultations.map(c=><option value={c.id!} key={c.id!}>{formatDay(c.data)} · {c.especialidade||c.medico||'Atendimento'} · {c.status}</option>)}
        </HealthRelationPicker></div>
        {selected&&<div className="mt-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px]"><CalendarClock size={13}/>{formatDay(selected.data)}</span><span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px]">{selected.status==='realizada'?'Realizada no cadastro':selected.status==='agendada'?'Ainda agendada no cadastro':'Cancelada no cadastro'}</span></div>}
      </section>
      {health.error&&<p role="alert" className="rounded-xl border border-amber-300/25 p-3 text-xs text-amber-200">{health.error}</p>}
      {ownConsultations.length===0?<div className="rounded-2xl border border-surface-border bg-surface p-4"><p className="text-sm text-ink-secondary">Cadastre ou confira uma consulta para abrir sua jornada clínica.</p><Link href="/saude/consultas" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-300">Abrir consultas <ArrowUpRight size={16}/></Link></div>:
        !ready?<p role="status" className="rounded-2xl border border-surface-border bg-surface p-4 text-xs text-ink-muted">Carregando registros da conta e pessoa ativa…</p>:
        prepared.error?<p role="alert" className="rounded-xl border border-amber-300/25 p-3 text-sm text-amber-200">{prepared.error}</p>:ep&&<>
        <section className="rounded-[24px] border border-emerald-300/20 bg-surface p-4">
          <div className="flex items-center gap-2"><BookOpenCheck size={18} className="text-emerald-300"/><h2 className="text-sm font-bold">Resumo de saúde em 1 minuto</h2></div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Somente elementos vinculados por ID, não um diagnóstico nem a história inteira da pessoa.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([{icon:MessageSquareHeart,label:'Relatos',value:ep.stats.symptoms},{icon:FlaskConical,label:'Pedidos',value:ep.stats.examOrders},{icon:ClipboardList,label:'Itens de exame',value:ep.stats.examItems},{icon:Pill,label:'Medicamentos ligados',value:ep.stats.linkedMedications}] as const).map(({icon:Icon,label,value})=><div key={label} className="rounded-2xl border border-surface-border bg-surface-raised p-3"><Icon size={18} className="text-sky-300"/><strong className="mt-2 block text-xl tabular-nums">{value}</strong><span className="text-[11px] leading-snug text-ink-muted">{label}</span></div>)}
          </div>
          {ep.stats.results>0&&<p className="mt-3 text-xs text-emerald-200">{ep.stats.results} evento(s) de resultado explicitamente registrado(s) neste episódio. Não significa que todos os exames estejam concluídos.</p>}
          {ep.gaps.length>0&&<details className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.035] px-3 py-2"><summary className="min-h-10 cursor-pointer text-xs font-semibold text-amber-200">Lacunas e limites da informação</summary><div className="space-y-2 pb-2">{ep.gaps.map(x=><p key={x} className="text-[11px] leading-relaxed text-ink-muted">{x}</p>)}</div></details>}
        </section>
        {returnBriefD3&&<BrainReturnCardD3 key={`${user?.id||""}:${activePersonId||""}:${returnBriefD3.consultationId}`} brief={returnBriefD3}/>}
        <section aria-label="Acesso aos registros originais" className="rounded-[22px] border border-surface-border bg-surface p-4"><h2 className="text-sm font-bold">Continuar a jornada</h2><div className="mt-3 grid grid-cols-2 gap-2">
          {([{href:`/saude/consultas/detalhes?id=${encodeURIComponent(ep.consultation.id!)}`,label:'Revisar consulta',icon:Stethoscope},{href:`/saude/careflow/sintomas?consulta=${encodeURIComponent(ep.consultation.id!)}`,label:'Registrar evolução',icon:MessageSquareHeart},{href:`/saude/careflow/exames?consulta=${encodeURIComponent(ep.consultation.id!)}`,label:'Acompanhar exames',icon:FlaskConical},{href:'/saude/careflow/pressao',label:'Plano de pressão',icon:HeartPulse},{href:`/saude/medicamentos/novo?consulta=${encodeURIComponent(ep.consultation.id!)}`,label:'Cadastrar medicamento',icon:Pill},{href:`/saude/careflow/modo-medico?consulta=${encodeURIComponent(ep.consultation.id!)}`,label:'Modo Médico geral',icon:FileText}] as const).map(({href:target,label,icon:Icon})=><Link key={target} href={target} className="flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-surface-border bg-surface-raised p-3 text-[11px] font-semibold text-ink-secondary"><Icon size={16} className="shrink-0 text-sky-300"/><span className="break-words">{label}</span><ChevronRight size={13} className="ml-auto shrink-0"/></Link>)}
        </div><p className="mt-3 text-[10px] leading-relaxed text-ink-muted">Os atalhos abrem formulários existentes. Médico, dose, início do curso e demais informações precisam ser conferidos antes de salvar; nada será preenchido por inferência.</p></section>
        <section className="rounded-[22px] border border-surface-border bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardList size={17} className="text-sky-300"/>Linha do tempo deste episódio</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">{([['summary','Resumo','Até 30 ocorrências'],['detailed','Detalhado','Todas as evidências']] as const).map(([id,label,desc])=><button type="button" key={id} aria-pressed={mode===id} disabled={busy} onClick={()=>{setMode(id);setLimit(20);}} className={`min-h-16 rounded-xl border px-3 py-2 text-left ${mode===id?'border-emerald-300/35 bg-emerald-300/[.07]':'border-surface-border bg-surface-raised'}`}><span className="flex items-center gap-1 text-xs font-semibold">{mode===id&&<Check size={13} className="text-emerald-300"/>}{label}</span><span className="mt-1 block text-[10px] text-ink-muted">{desc}</span></button>)}</div>
          <p className="mt-3 text-[11px] text-ink-muted">{ep.rows.length} registro(s) exibidos de {ep.report.availableCount} elegíveis. Sem vínculo não significa inexistência.</p>
          <div className="mt-3 space-y-2">{ep.rows.slice(0,limit).map(r=><details key={r.key} className="group rounded-2xl border border-surface-border/80 bg-surface-raised"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-3 py-3"><span className="min-w-0 flex-1"><strong className="block break-words text-xs">{r.title}</strong><span className="mt-1 block text-[10px] text-ink-muted">{formatDay(r.date)} · {r.source==='consultation'?'Consulta médica':r.source==='health_record'?'Relato de saúde':r.source==='health_connect'?'Health Connect':r.source.replace(/_/g,' ')}</span></span><ChevronRight size={15} className="shrink-0 text-ink-muted transition-transform group-open:rotate-90"/></summary><div className="space-y-2 border-t border-surface-border/70 px-3 py-3"><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-secondary">{r.detail}</p>{r.relations.map(rel=><p key={rel} className="rounded-lg border border-sky-300/15 bg-sky-300/[.04] p-2 text-[11px] text-sky-200">{rel}</p>)}{r.href&&<Link href={r.href} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-300">Abrir fonte <ArrowUpRight size={14}/></Link>}</div></details>)}
          {ep.rows.length===0&&<p className="rounded-xl bg-surface-raised p-4 text-xs text-ink-muted">Nenhuma ocorrência exibida neste episódio. Isso não prova ausência de acontecimentos clínicos.</p>}
          {ep.rows.length>limit&&<button type="button" onClick={()=>setLimit(x=>x+30)} className="min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised text-xs font-semibold">Mostrar mais {Math.min(30,ep.rows.length-limit)}</button>}</div>
        </section>
        <section className="rounded-[22px] border border-emerald-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={17} className="text-emerald-300"/>PDF contextual A4</h2><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Reutiliza o gerador do Modo Médico. Exibe apenas o episódio selecionado, as fontes comprovadas e as lacunas. Não envia dados automaticamente.</p><div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2"><button type="button" disabled={busy} onClick={()=>void exportPdf('archive')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/[.08] px-3 text-xs font-bold text-emerald-200 disabled:opacity-40"><Archive size={16}/>{busy?'Preparando…':'Arquivar PDF privado'}</button><button type="button" disabled={busy} onClick={()=>void exportPdf('download')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 text-xs font-bold text-void disabled:opacity-40"><Download size={16}/>{busy?'Preparando…':'Baixar PDF do episódio'}</button></div></section>
        </>}
      {message&&<p role="status" className="rounded-xl border border-sky-300/20 bg-sky-300/[.04] p-3 text-xs leading-relaxed text-sky-200">{message}</p>}
      <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><LockKeyhole size={15} className="mt-0.5 shrink-0"/>Dados privados por pessoa. Nenhuma alteração automática em consulta, receita, medicamento, dose, estoque, exames ou documento.</p>
    </div>
  </main></PageTransition>;
}
export default function ClinicalEpisodePageP4(){return <Suspense fallback={<main className="min-h-screen bg-void p-6 text-sm text-ink-muted">Carregando episódio…</main>}><EpisodeClinicalViewP4/></Suspense>;}
