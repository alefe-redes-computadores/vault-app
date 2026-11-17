'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileDown, FileText, ListFilter, ShieldCheck } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { CAREFLOW_KINDS_M3, buildCareFlowTimelineM3, makeCareFlowTimelinePdfM3 } from '@/lib/m3/careflow-timeline';
import type { CareFlowKindM2 } from '@/lib/careflow-m2/domain';
import { pdfLibraryM2 } from '@/lib/careflow-m2/pdf-library';
import { getLocalTodayISO } from '@/lib/health-utils';

const names:Record<CareFlowKindM2,string>={exam_order:'Pedidos',exam_item:'Itens',exam_status:'Situações',exam_result:'Resultados',monitor_plan:'Planos',monitor_reading:'Aferições',monitor_note:'Observações'};
/** Dossiê local, não substitui o relatório clínico completo nem duplica repositórios. */
export default function CareFlowDossierM3(){
  const {user}=useAuth();const {activePersonId,persons}=useActivePersonId();
  const {events=[],loading}=useCareFlowM2();
  const [enabled,setEnabled]=useState<CareFlowKindM2[]>([...CAREFLOW_KINDS_M3]);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const current=useRef({uid:user?.id||'',pid:activePersonId||''});current.current={uid:user?.id||'',pid:activePersonId||''};
  const rows=useMemo(()=>buildCareFlowTimelineM3(events,user?.id||'',activePersonId||'').filter(row=>enabled.includes(row.kind)),[events,user?.id,activePersonId,enabled]);
  const personName=persons.find(p=>p.id===activePersonId)?.name||'Pessoa ativa';
  const toggle=(kind:CareFlowKindM2)=>setEnabled(old=>old.includes(kind)?old.filter(k=>k!==kind):[...old,kind]);
  const archive=async()=>{
    if(busy||!user?.id||!activePersonId){setMessage('Escolha a pessoa ativa.');return;}
    const scope={uid:user.id,pid:activePersonId};setBusy(true);setMessage('');
    try{
      const blob=await makeCareFlowTimelinePdfM3(personName,rows);
      if(current.current.uid!==scope.uid||current.current.pid!==scope.pid)throw new Error('Pessoa alterada durante a preparação; nada foi arquivado.');
      const today=getLocalTodayISO();
      await pdfLibraryM2.add(scope.pid,{title:`CareFlow — linha do tempo ${today}`,start:today,end:today,origin:'clinical_report',blob});
      setMessage('PDF arquivado somente neste aparelho. Nenhum arquivo foi enviado.');
    }catch(e){setMessage(e instanceof Error?e.message:'Falha ao criar PDF local.');}finally{setBusy(false);}
  };
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4">
    <header className="flex items-start gap-3"><Link href="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border"><ArrowLeft size={18}/></Link><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">CareFlow · M3 P1</p><h1 className="text-xl font-bold">Dossiê de acompanhamento</h1><p className="mt-1 text-xs text-ink-muted">Histórico de eventos reais e vínculos existentes da pessoa selecionada.</p></div></header>
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-surface px-3 py-3"><ShieldCheck size={18} className="text-emerald-300"/><strong className="min-w-0 flex-1 text-xs">{personName}</strong><span className="text-[10px] text-ink-muted">{rows.length} evento(s)</span></div>
    <section className="rounded-2xl border border-surface-border bg-surface p-3"><h2 className="flex items-center gap-2 text-xs font-bold"><ListFilter size={16}/>Seções do dossiê</h2><div className="mt-3 grid grid-cols-2 gap-2">{CAREFLOW_KINDS_M3.map(kind=><button type="button" key={kind} aria-pressed={enabled.includes(kind)} onClick={()=>toggle(kind)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs ${enabled.includes(kind)?'border-emerald-300/40 bg-emerald-300/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{names[kind]}</button>)}</div></section>
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" disabled={busy||loading||!activePersonId} onClick={()=>void archive()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 font-semibold text-void disabled:opacity-40"><FileDown size={17}/>{busy?'Preparando…':'Arquivar PDF local'}</button><Link href="/saude/relatorios" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-surface-border text-xs font-semibold text-emerald-300"><FileText size={17}/>Relatório clínico completo</Link><Link href="/saude/careflow/relatorios" className="flex min-h-11 items-center justify-center rounded-xl border border-surface-border text-xs text-ink-secondary sm:col-span-2">Abrir biblioteca de PDFs locais</Link></section>
    {message?<p role="status" className="rounded-xl border border-emerald-300/20 p-3 text-xs text-emerald-200">{message}</p>:null}
    <section aria-label="Linha do tempo CareFlow" className="space-y-2">{loading?<p className="text-xs text-ink-muted">Carregando dados locais…</p>:rows.length===0?<p className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">Sem registros para estas seções. Ausência não significa que nada ocorreu.</p>:rows.slice(0,200).map(row=><article key={row.id} className="rounded-2xl border border-surface-border/70 bg-surface p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-ink-primary">{row.title}</strong><span className="shrink-0 text-[10px] tabular-nums text-ink-muted">{row.date}</span></div><p className="mt-1 text-[10px] text-violet-300">{names[row.kind]} · {row.dateSource==='evento'?'data informada':'data do cadastro'}</p>{row.details?<p className="mt-2 text-xs text-ink-muted">{row.details}</p>:null}</article>)}</section>
    <p className="text-[11px] leading-relaxed text-ink-muted">O PDF desta etapa usa apenas os eventos CareFlow selecionados. Para medicamentos, doses, consultas e outros dados clínicos, abra o Relatório Clínico Completo. Nenhum documento é compartilhado automaticamente.</p>
  </div></main></PageTransition>;
}
