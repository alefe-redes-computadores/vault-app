'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { withReturnTarget } from '@/lib/navigation/return-context';
import { ArrowLeft, FileDown, FileText, ListFilter, ShieldCheck, FlaskConical, HeartPulse, MessageSquareHeart, Activity, Search, ChevronRight } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { CAREFLOW_KINDS_M3, buildCareFlowTimelineM3, makeCareFlowTimelinePdfM3 } from '@/lib/m3/careflow-timeline';
import type { CareFlowKindM2 } from '@/lib/careflow-m2/domain';
import { pdfLibraryM2 } from '@/lib/careflow-m2/pdf-library';
import { getLocalTodayISO } from '@/lib/health-utils';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';

const names:Record<CareFlowKindM2,string>={exam_order:'Pedidos',exam_item:'Itens',exam_status:'Situações',exam_result:'Resultados',monitor_plan:'Planos',monitor_reading:'Aferições',monitor_note:'Observações'};
/** Dossiê local, não substitui o relatório clínico completo nem duplica repositórios. */
export default function CareFlowDossierM3(){
  const {user}=useAuth();const {activePersonId,persons}=useActivePersonId();
  const {events=[],loading}=useCareFlowM2();
  const {registros=[]}=useRegistrosSaude();
  const [enabled,setEnabled]=useState<CareFlowKindM2[]>([...CAREFLOW_KINDS_M3]);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [lastArchivedR3,setLastArchivedR3]=useState<{uid:string;pid:string;id:string}|null>(null);
  const [q,setQ]=useState(''),[days,setDays]=useState<7|30|90|'all'>('all'),[limit,setLimit]=useState(40);
  const current=useRef({uid:user?.id||'',pid:activePersonId||''});current.current={uid:user?.id||'',pid:activePersonId||''};
  const rows=useMemo(()=>buildCareFlowTimelineM3(events,user?.id||'',activePersonId||'',registros).filter(row=>enabled.includes(row.kind)),[events,user?.id,activePersonId,enabled,registros]);
  const visible=useMemo(()=>{
    const term=q.trim().toLocaleLowerCase('pt-BR');
    const since=days==='all'?'':(()=>{const day=new Date();day.setHours(12,0,0,0);day.setDate(day.getDate()-days+1);return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;})();
    return rows.filter(r=>(!since||r.date>=since)&&(!term||[r.title,r.details,names[r.kind],r.date].join(' ').toLocaleLowerCase('pt-BR').includes(term)));
  },[rows,q,days]);
  const ownedEvents=useMemo(()=>new Map(events.filter(e=>e.user_id===user?.id&&e.person_id===activePersonId).map(e=>[e.id,e] as const)),[events,user?.id,activePersonId]);
  const ownedRecords=useMemo(()=>new Set(registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId).map(r=>r.id).filter(Boolean)),[registros,user?.id,activePersonId]);
  const origin=(row:(typeof rows)[number]):string|null=>{
    if(!ownedEvents.has(row.id))return null;
    if(row.kind==='exam_order')return `/saude/careflow/exames#careflow-pedido-${encodeURIComponent(row.id)}`;
    if(row.kind==='exam_item')return `/saude/careflow/exames#careflow-exame-${encodeURIComponent(row.id)}`;
    if(row.kind==='exam_status'||row.kind==='exam_result'){
      const parent=row.parentId?ownedEvents.get(row.parentId):undefined;
      return parent?.kind==='exam_item'?`/saude/careflow/exames#careflow-exame-${encodeURIComponent(parent.id)}`:null;
    }
    if((row.kind==='monitor_note'||row.kind==='monitor_reading')&&row.relatedId&&ownedRecords.has(row.relatedId))return `/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(row.relatedId)}`;
    if(row.kind==='monitor_plan')return `/saude/careflow/pressao#careflow-plano-${encodeURIComponent(row.id)}`;
    return null;
  };
  const personName=persons.find(p=>p.id===activePersonId)?.name||'Pessoa ativa';
  const toggle=(kind:CareFlowKindM2)=>setEnabled(old=>old.includes(kind)?old.filter(k=>k!==kind):[...old,kind]);
  const archive=async()=>{
    if(busy||!user?.id||!activePersonId){setMessage('Escolha a pessoa ativa.');return;}
    const scope={uid:user.id,pid:activePersonId};setBusy(true);setMessage('');setLastArchivedR3(null);
    try{
      if(visible.length>500)throw new Error('Mais de 500 eventos neste filtro. Refine período ou categorias antes do PDF; nenhum registro será omitido silenciosamente.');
      const blob=await makeCareFlowTimelinePdfM3(personName,visible);
      if(current.current.uid!==scope.uid||current.current.pid!==scope.pid)throw new Error('Pessoa alterada durante a preparação; nada foi arquivado.');
      const today=getLocalTodayISO();
      const savedIdR3=await pdfLibraryM2.add(scope.pid,{title:`CareFlow — linha do tempo ${today}`,start:today,end:today,origin:'clinical_report',blob});
      if(current.current.uid!==scope.uid||current.current.pid!==scope.pid)throw new Error('Pessoa alterada após arquivar; arquivo permanece no perfil original.');
      setLastArchivedR3({uid:scope.uid,pid:scope.pid,id:savedIdR3});
      setMessage('PDF arquivado somente neste aparelho. Nenhum arquivo foi enviado.');
    }catch(e){setMessage(e instanceof Error?e.message:'Falha ao criar PDF local.');}finally{setBusy(false);}
  };
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary vault-adaptive-tail"><div className="mx-auto max-w-3xl space-y-4">
    <header className="flex items-start gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Minha saúde · Acompanhamento</p><h1 className="text-xl font-bold">Dossiê de acompanhamento</h1><p className="mt-1 text-xs text-ink-muted">Histórico de eventos reais e vínculos existentes da pessoa selecionada.</p></div></header>
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-surface px-3 py-3"><ShieldCheck size={18} className="text-emerald-300"/><strong className="min-w-0 flex-1 text-xs">{personName}</strong><span className="text-[10px] text-ink-muted">{visible.length} de {rows.length} eventos</span></div>
    <section className="rounded-2xl border border-surface-border bg-surface p-3"><h2 className="flex items-center gap-2 text-xs font-bold"><ListFilter size={16}/>Seções do dossiê</h2><div className="mt-3 grid grid-cols-2 gap-2">{CAREFLOW_KINDS_M3.map(kind=><button type="button" key={kind} aria-pressed={enabled.includes(kind)} onClick={()=>toggle(kind)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs ${enabled.includes(kind)?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{names[kind]}</button>)}</div></section>
    <section aria-label="Buscar e filtrar o dossiê" className="space-y-3 rounded-2xl border border-surface-border bg-surface p-3"><label className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-ink-muted"/><span className="sr-only">Buscar fato, exame, medição ou data</span><input type="search" value={q} onChange={e=>{setQ(e.target.value);setLimit(40);}} placeholder="Buscar no histórico completo…" className="min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised py-2 pl-10 pr-3 text-sm text-ink-primary"/></label><div className="flex flex-wrap gap-2">{([['all','Tudo'],[7,'7 dias'],[30,'30 dias'],[90,'90 dias']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={days===value} onClick={()=>{setDays(value);setLimit(40);}} className={`min-h-10 rounded-xl border px-3 text-xs font-semibold ${days===value?'border-violet-300/50 bg-violet-300/[.12] text-violet-200':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div><p className="text-[11px] leading-relaxed text-ink-muted">O PDF local inclui todos os {visible.length} resultados deste filtro (até 500 por arquivo). Não exporta só os cards visíveis.</p></section>
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" disabled={busy||loading||!activePersonId} onClick={()=>void archive()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 font-semibold text-void disabled:opacity-40"><FileDown size={17}/>{busy?'Preparando…':'Arquivar PDF local'}</button><Link href="/saude/relatorios" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border text-xs font-semibold text-emerald-300"><FileText size={17}/>Relatório clínico completo</Link><Link href="/saude/careflow/modo-medico" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/[.04] px-3 text-center text-xs font-semibold text-emerald-200"><FileText size={17} className="mr-2 inline"/>Modo Médico Premium · Resumo e PDF A4</Link><Link href="/saude/careflow/relatorios" className="flex min-h-11 items-center justify-center rounded-xl border border-surface-border text-xs text-ink-secondary">Abrir biblioteca de PDFs locais</Link></section>
    {message?<p role="status" className="rounded-xl border border-emerald-300/20 p-3 text-xs text-emerald-200">{message}</p>:null}
    {lastArchivedR3&&lastArchivedR3.uid===user?.id&&lastArchivedR3.pid===activePersonId?<Link href={withReturnTarget(`/saude/careflow/relatorios?arquivo=${encodeURIComponent(lastArchivedR3.id)}`,'/saude/careflow/dossie')} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/40 bg-violet-300/[.06] px-3 text-xs font-bold text-violet-200">Abrir o PDF que acabei de arquivar <ChevronRight size={16}/></Link>:null}
    <section aria-label="Linha do tempo CareFlow" className="space-y-2">{loading?<p className="text-xs text-ink-muted">Carregando dados locais…</p>:visible.length===0?<p className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">Nenhum registro corresponde aos filtros. Isso não comprova ausência de acontecimentos.</p>:visible.slice(0,limit).map((row,index,list)=><div key={row.id}>{(index===0||list[index-1].date!==row.date)&&<h3 className="pt-3 text-xs font-bold text-violet-200">{/^\d{4}-\d{2}-\d{2}$/.test(row.date)?row.date.split('-').reverse().join('/'):row.date}</h3>}<article key={row.id} className="rounded-2xl border border-surface-border/70 bg-surface p-3"><div className="flex items-center justify-between gap-2"><strong className="flex min-w-0 items-center gap-2 text-xs text-ink-primary">{(()=>{const Icon=row.kind.startsWith('exam_')?FlaskConical:row.kind==='monitor_reading'?HeartPulse:row.kind==='monitor_note'?MessageSquareHeart:Activity;return <Icon size={16} className="shrink-0 text-violet-300"/>})()}{row.title}</strong><span className="shrink-0 text-[10px] tabular-nums text-ink-muted">{/^\d{4}-\d{2}-\d{2}$/.test(row.date)?row.date.split('-').reverse().join('/'):row.date}</span></div><p className="mt-1 text-[10px] text-violet-300">{names[row.kind]} · {row.dateSource==='evento'?'data informada':'data do cadastro'}</p>{row.details?<p className="mt-2 text-xs text-ink-muted">{row.details}</p>:null}{origin(row)?<Link href={origin(row)!} className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-violet-200">Abrir registro de origem<ChevronRight size={15}/></Link>:<p className="mt-2 text-[11px] text-ink-faint">Sem detalhe individual verificável nesta tela</p>}</article></div>)}{visible.length>limit&&<button type="button" onClick={()=>setLimit(x=>x+40)} className="min-h-11 w-full rounded-xl border border-surface-border text-xs font-semibold text-ink-secondary">Mostrar mais {Math.min(40,visible.length-limit)} registros</button>}</section>
    <p className="text-[11px] leading-relaxed text-ink-muted">O PDF desta etapa usa os eventos CareFlow correspondentes às categorias, pesquisa e período selecionados. Para medicamentos, doses, consultas e outros dados clínicos, abra o Relatório Clínico Completo. Nenhum documento é compartilhado automaticamente.</p>
  </div></main></PageTransition>;
}
