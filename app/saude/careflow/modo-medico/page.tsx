'use client';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Archive, CalendarDays, Check, ChevronRight, ClipboardList, Download, FileCheck2, FileText, LockKeyhole, Search, ShieldCheck, Stethoscope, WandSparkles } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useBrainV5Pulse } from '@/hooks/useBrainV5Pulse';
import { useSharedHealthIntelligence } from '@/contexts/HealthIntelligenceContext';
import { getLocalTodayISO } from '@/lib/health-utils';
import { MEDICAL_SECTIONS_P3, buildMedicalDossierP3, type MedicalSectionP3, type MedicalModeP3 } from '@/lib/m3/medical-dossier-p3';
import { assertMedicalScopeP3 } from '@/lib/m3/medical-scope-p3';

function shiftDay(today:string,days:number){const [y,m,d]=today.split('-').map(Number);return new Date(Date.UTC(y,m-1,d-days+1)).toISOString().slice(0,10);}
function fmt(day:string){return /^\d{4}-\d{2}-\d{2}$/.test(day)?`${day.slice(8)}/${day.slice(5,7)}/${day.slice(0,4)}`:day;}
const DEFAULT_SECTIONS:MedicalSectionP3[]=['consultations','careflow'];
const tags={registrado:'Registro acessível',declarado:'Informado no VAULT',motor:'Interpretação registrada'} as const;
export default function MedicalModeP3Page(){
  const {user}=useAuth(),{activePersonId,persons}=useActivePersonId();
  const health=useSharedHealthIntelligence({includeAudit:false});
  const brain=useBrainV5Pulse();
  const {events=[],loading:loadingCare}=useCareFlowM2();
  const today=getLocalTodayISO();
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
  const [notesDraft,setNotesDraft]=useState({scope:'',text:''});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const urls=useRef<string[]>([]);
  const scopeRef=useRef({userId:user?.id||'',personId:activePersonId||'',sig:''});
  const signature=[start,end,mode,sections.join(','),includeBrain?'brain':'factual',episode].join('|');
  scopeRef.current={userId:user?.id||'',personId:activePersonId||'',sig:signature};
  const scopeKey=`${user?.id||''}:${activePersonId||''}`;
  const notes=notesDraft.scope===scopeKey?notesDraft.text:'';
  useEffect(()=>{
    setNotesDraft({scope:'',text:''});setMessage('');setQ('');setLimit(40);setFocusSection('all');setEpisode('');setReadingMode(false);
    return ()=>{for(const url of urls.current)URL.revokeObjectURL(url);urls.current=[];};
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
  const ready=Boolean(user?.id&&activePersonId&&!health.isLoading&&!health.error&&!loadingCare&&(!includeBrain||!brain.isLoading)&&health.context?.userId===user?.id&&health.context?.personId===activePersonId);
  const prepared=useMemo(()=>{
    if(!ready||!user?.id||!activePersonId||!health.context)return {report:null,error:''};
    try{
      return {report:buildMedicalDossierP3({context:health.context,careflow:events,ledger:includeBrain?brain.records:[],includeBrain,
        ownerId:user.id,personId:activePersonId,personName:person?.name||'Pessoa ativa',start,end,mode,sections,consultationId:episode||undefined}),error:''};
    }catch(error){return {report:null,error:error instanceof Error?error.message:'Não foi possível preparar esta prévia.'};}
  },[ready,user?.id,activePersonId,health.context,events,brain.records,includeBrain,person?.name,start,end,mode,sections,episode]);
  const normalized=q.trim().toLocaleLowerCase('pt-BR');
  const filtered=useMemo(()=>prepared.report?.rows.filter(r=>
    (focusSection==='all'||r.section===focusSection)&&
    (!normalized||[r.title,r.detail,r.source,...r.relations].join(' ').toLocaleLowerCase('pt-BR').includes(normalized)))||[],
    [prepared.report,normalized,focusSection]);
  function choose(section:MedicalSectionP3){
    setSections(value=>value.includes(section)?value.filter(x=>x!==section):[...value,section]);
    setFocusSection('all');setLimit(40);setMessage('');
  }
  function preset(days:7|30|90){setStart(shiftDay(today,days));setEnd(today);setLimit(40);setMessage('');}
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
  return <PageTransition><main className="min-h-screen bg-void px-3 pb-36 pt-5 text-ink-primary header-safe-top sm:px-5"><div className="mx-auto max-w-3xl space-y-4">
    <header className="flex items-start gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-surface-border bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-300">Minha saúde · Em atendimento</p><h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Modo Médico 360</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Resumo legível para mostrar no consultório, com registros relacionados e PDF opcional. Você escolhe o que exibir.</p></div></header>
    <section className="overflow-hidden rounded-[26px] border border-emerald-300/25 bg-[radial-gradient(circle_at_95%_0%,rgba(16,185,129,.14),transparent_52%),linear-gradient(145deg,#15232c,#0c151e)] p-4 shadow-xl shadow-black/10"><div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-300"><Stethoscope size={21}/></span><div className="min-w-0 flex-1"><strong className="block break-words text-sm">{person?.name||'Pessoa não selecionada'}</strong><p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">Dados da conta e pessoa ativa. Nenhum vínculo é criado para completar uma lacuna.</p></div></div><div className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-emerald-300"/><p className="text-[11px] leading-relaxed text-emerald-100/80">Privado e local. A prévia não compartilha informações. Para exportar ou arquivar, você precisa tocar no botão correspondente.</p></div></section>
    <section aria-label="Modo de apresentação" className="rounded-[22px] border border-surface-border bg-surface p-3"><div className="flex items-center gap-2 text-sm font-bold"><FileCheck2 size={16} className="text-violet-300"/>Formato da consulta</div><div className="mt-3 grid grid-cols-2 gap-2">{([['summary','Resumo médico','Últimas 30 ocorrências'],['detailed','Histórico completo','Todos os registros escolhidos']] as const).map(([id,label,description])=><button type="button" key={id} aria-pressed={mode===id} disabled={busy} onClick={()=>{setMode(id);setLimit(40);}} className={`min-h-20 min-w-0 rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${mode===id?'border-emerald-300/50 bg-emerald-300/[.08]':'border-surface-border bg-surface-raised'}`}><span className="flex items-center gap-2 text-xs font-semibold">{mode===id&&<Check size={14} className="shrink-0 text-emerald-300"/>}{label}</span><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{description}</span></button>)}</div></section>
    <section aria-label="Episódio clínico confirmado" className="rounded-[22px] border border-sky-300/20 bg-surface p-4">
      <h2 className="text-sm font-bold text-sky-200">Consulta específica · Jornada clínica</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">Selecione um atendimento para mostrar somente fatos ligados por IDs reais. Sem vínculo documentado não significa que o fato não ocorreu.</p>
      <div className="mt-3"><HealthRelationPicker title="Selecionar uma consulta" kind="consultation" value={episode} onValueChange={value=>{setEpisode(value);setLimit(40);setMessage('');const item=consultations.find(c=>c.id===value);if(item?.data&&item.data<start)setStart(item.data);}} className="min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary">
        <option value="">Histórico geral (sem filtro por episódio)</option>
        {consultations.slice(0,120).map(c=><option value={c.id} key={c.id}>{fmt(c.data)} · {c.especialidade||c.medico||'Consulta'}</option>)}
      </HealthRelationPicker></div>
      {episode?<p className="mt-2 text-[11px] text-sky-200">Filtro por vínculo explícito ativo: consultas, sintomas, pedidos e medicamentos ligados; doses não são associadas por coincidência.</p>:null}
      <button type="button" aria-pressed={readingMode} onClick={()=>setReadingMode(value=>!value)} className="mt-3 min-h-11 rounded-xl border border-emerald-300/30 px-3 text-xs font-semibold text-emerald-200">{readingMode?'Voltar à leitura compacta':'Leitura ampliada para mostrar no consultório'}</button>
    </section>
    <section className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2 text-sm font-bold"><CalendarDays size={17} className="text-sky-300"/>Período documentado</div><div className="mt-3 flex flex-wrap gap-2">{([7,30,90] as const).map(days=><button type="button" key={days} onClick={()=>preset(days)} disabled={busy} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">{days} dias</button>)}</div><div className="mt-3 grid grid-cols-1 gap-3 min-[370px]:grid-cols-2"><CustomDatePicker label="Início" value={start} onChange={setStart} maxDate={today}/><CustomDatePicker label="Fim" value={end} onChange={setEnd} maxDate={today}/></div></section>
    <section aria-label="Seções escolhidas para o relatório" className="rounded-[22px] border border-surface-border bg-surface p-4"><div className="flex items-center gap-2"><ClipboardList size={17} className="text-violet-300"/><h2 className="text-sm font-bold">O que incluir</h2><span className="ml-auto text-[10px] tabular-nums text-ink-muted">{selectedCount} selecionadas</span></div><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Somente consultas e CareFlow começam selecionados. Adicione o restante se desejar.</p><div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-2">{MEDICAL_SECTIONS_P3.map(s=><button type="button" key={s.id} disabled={busy} aria-pressed={sections.includes(s.id)} onClick={()=>choose(s.id)} className={`flex min-h-16 min-w-0 items-center gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${sections.includes(s.id)?'border-violet-300/40 bg-violet-300/[.075]':'border-surface-border bg-surface-raised'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-lg border ${sections.includes(s.id)?'border-violet-300/60 bg-violet-300/20 text-violet-200':'border-surface-border text-ink-muted'}`}>{sections.includes(s.id)?<Check size={14}/>:null}</span><span className="min-w-0"><strong className="block break-words text-xs">{s.label}</strong><span className="mt-1 block text-[10px] leading-snug text-ink-muted">{s.description}</span></span></button>)}</div><button type="button" aria-pressed={includeBrain} disabled={busy} onClick={()=>setIncludeBrain(x=>!x)} className={`mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-xs ${includeBrain?'border-amber-300/40 bg-amber-300/10':'border-surface-border bg-surface-raised'}`}><WandSparkles size={16} className="shrink-0 text-amber-300"/><span className="min-w-0 flex-1">Incluir alertas do Brain já registrados (interpretação, não diagnóstico)</span>{includeBrain&&<Check size={16}/>}</button></section>
    <section className="rounded-[22px] border border-surface-border bg-surface p-4"><h2 className="text-sm font-bold">Antes, durante e depois da consulta</h2><div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-3"><Link href="/saude/consultas" className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary">1. Preparar consulta<ChevronRight size={16}/></Link><Link href="/saude/consultas" className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary">2. Conferir decisões<ChevronRight size={16}/></Link><Link href="/saude/careflow/exames" className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-xs text-ink-primary">3. Acompanhar pedidos<ChevronRight size={16}/></Link></div><label className="mt-4 block text-[11px] font-semibold text-ink-secondary" htmlFor="p3-notas">Pauta temporária nesta tela (opcional)</label><textarea id="p3-notas" maxLength={1800} rows={3} value={notes} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>setNotesDraft({scope:scopeKey,text:e.target.value})} placeholder="Perguntas ou pontos para conversar com o profissional…" className="mt-2 block min-h-24 w-full resize-y rounded-2xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-300/10"/><p className="mt-2 text-[10px] leading-relaxed text-ink-muted">A pauta não é salva nem entra no PDF. A troca de pessoa limpa este rascunho. Decisão conversada não altera receita ou dose automaticamente.</p></section>
    {health.error&&<p role="alert" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-200">{health.error}</p>}
    {!ready?<p role="status" className="rounded-2xl border border-surface-border bg-surface p-4 text-xs text-ink-muted">{health.isLoading||loadingCare||(includeBrain&&brain.isLoading)?'Carregando os dados da pessoa selecionada…':'Aguardando autenticação e contexto clínico da pessoa.'}</p>:prepared.error?<p role="alert" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-200">{prepared.error}</p>:prepared.report&&<>
      <section aria-label="Prévia revisável do Modo Médico" className="rounded-[22px] border border-emerald-300/20 bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><FileText size={17} className="text-emerald-300"/>Prévia para conferência</h2><span className="text-[10px] tabular-nums text-ink-muted">{prepared.report.rows.length} / {prepared.report.availableCount} registros</span></div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{fmt(start)} a {fmt(end)} · {mode==='summary'?'Resumo':'Detalhado'}{prepared.report.episode?` · Episódio: ${prepared.report.episode.title} em ${fmt(prepared.report.episode.date)}`:''}. Todos os registros são exclusivos da pessoa ativa. Ausência de registro não prova ausência de fato clínico.</p>
      {readingMode?<p className="mt-2 rounded-xl border border-sky-300/20 p-3 text-sm leading-relaxed text-sky-100">Leitura ampliada · selecione as seções que deseja mostrar ao profissional. Nada é enviado automaticamente.</p>:null}
      {prepared.report.omittedBySummary>0&&<p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-[11px] text-amber-100">O resumo exibe 30 ocorrências recentes e omite {prepared.report.omittedBySummary}. Se precisar do histórico completo, escolha o modo detalhado.</p>}
      <label className="relative mt-3 block"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted"/><span className="sr-only">Buscar na prévia</span><input value={q} onChange={(e:ChangeEvent<HTMLInputElement>)=>{setQ(e.target.value);setLimit(40);}} placeholder="Buscar registro ou fonte…" type="search" className="min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised py-2 pl-10 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-emerald-300/50 focus:outline-none"/></label>
      <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised px-3 py-1">
        <HealthRelationPicker compact title="Filtrar registros por área" value={focusSection}
          onValueChange={value=>{setFocusSection(value as MedicalSectionP3|'brain'|'all');setLimit(40);}}
          className="w-full text-sm font-semibold text-ink-primary">
          <option value="all">Todas as áreas do dossiê</option>
          {sections.map(section=><option key={section} value={section}>{MEDICAL_SECTIONS_P3.find(x=>x.id===section)?.label||section}</option>)}
          {includeBrain?<option value="brain">Brain · alertas documentados</option>:null}
        </HealthRelationPicker>
      </div>
      <div className="mt-3 space-y-2">
        {filtered.length===0?
          <p className="rounded-xl bg-surface-raised p-4 text-sm leading-relaxed text-ink-muted">Nenhum registro acessível neste filtro. Isso não representa resultado negativo de exame ou ausência de sintomas.</p>
          :filtered.slice(0,limit).map(row=><details key={row.key} className="group overflow-hidden rounded-2xl border border-surface-border/80 bg-surface-raised">
            <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-3 px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
              <span className="min-w-0 flex-1"><strong className={`block break-words font-semibold text-ink-primary ${readingMode?'text-base':'text-sm'}`}>{row.title}</strong>
                <span className="mt-1 block text-[11px] text-emerald-300">{MEDICAL_SECTIONS_P3.find(s=>s.id===row.section)?.label||'Brain'} · {tags[row.provenance]}</span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">{fmt(row.date)}</span>
              <ChevronRight size={16} className="shrink-0 text-ink-muted transition-transform group-open:rotate-90"/>
            </summary>
            <div className="space-y-2 border-t border-surface-border/70 px-3 pb-3 pt-3">
              {row.time?<p className="text-xs tabular-nums text-ink-muted">Horário registrado: {row.time}</p>:null}
              {row.detail?<p className={`whitespace-pre-wrap break-words leading-relaxed text-ink-secondary ${readingMode?'text-base':'text-sm'}`}>{row.detail}</p>:null}
              {row.relations.length>0?<div className="flex flex-wrap gap-1.5">{row.relations.map(link=><span key={link} className="max-w-full break-words rounded-xl border border-emerald-300/15 bg-emerald-300/[.055] px-2.5 py-1.5 text-xs text-emerald-200">{link}</span>)}</div>:null}
              {row.href?<Link href={row.href} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-300">Abrir registro de origem<ChevronRight size={15}/></Link>:null}
            </div>
          </details>)}
        {filtered.length>limit?<button type="button" onClick={()=>setLimit(x=>x+40)} className="min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised text-sm text-ink-primary">Mostrar mais {Math.min(40,filtered.length-limit)} registros</button>:null}
      </div></section>
      <section className="rounded-[22px] border border-violet-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={17} className="text-violet-300"/>Gerar somente após revisar</h2><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">O PDF A4 inclui somente as seções selecionadas, com a origem e as limitações dos registros. Não inclui a pauta temporária, anexos binários ou dados de outras pessoas.</p><div className="mt-3 grid grid-cols-1 gap-2 min-[370px]:grid-cols-2"><button type="button" disabled={busy||sections.length===0} onClick={()=>void createPdf('archive')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/[.10] px-3 text-xs font-bold text-emerald-200 disabled:opacity-40"><Archive size={16}/>{busy?'Preparando…':'Arquivar PDF local'}</button><button type="button" disabled={busy||sections.length===0} onClick={()=>void createPdf('download')} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 text-xs font-bold text-void disabled:opacity-40"><Download size={16}/>{busy?'Preparando…':'Baixar PDF A4'}</button></div><Link href="/saude/careflow/relatorios" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-violet-300">Biblioteca privada de PDFs<ChevronRight size={15}/></Link></section>
    </>}
    {message&&<p role="status" className="rounded-xl border border-sky-300/20 bg-sky-300/[.05] p-3 text-xs leading-relaxed text-sky-100">{message}</p>}
    <p className="flex gap-2 text-[11px] leading-relaxed text-ink-muted"><LockKeyhole size={15} className="mt-0.5 shrink-0"/>Sem envio automático, alterações de estoque, prescrição, diagnóstico ou movimentação de documentos. O arquivo PDF fica somente no aparelho até você decidir o que fazer com ele.</p>
  </div></main></PageTransition>;
}
