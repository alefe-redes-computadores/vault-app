"use client";
import { useMemo, useState } from "react";
import { Activity, CalendarClock, ChevronRight, CircleHelp, Clock3, FileHeart, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildBrainLongitudinalCI360, type BrainLongitudinalPeriodCI360 } from "@/lib/health-intelligence/brain-longitudinal-ci360";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";

/** B05.2/B05.4/B05.5 — painel descritivo do Brain; nenhum dado novo e nenhum diagnóstico. */
export function BrainLongitudinalCI360({context,onNavigate}:{
 context:HealthInsightContext|null|undefined;onNavigate:(href:string)=>void;
}) {
 const { user } = useAuth();
 const { activePersonId } = useActivePersonId();
 // Falha fechada na troca de conta/pessoa enquanto o snapshot reativo anterior desmonta.
 const scopedContext=context && context.userId===user?.id && context.personId===activePersonId ? context : null;
 const [days,setDays]=useState<BrainLongitudinalPeriodCI360>(7);
 const [asOfISO,setAsOfISO]=useState(()=>new Date().toISOString());
 const evidence=useMemo(()=>buildBrainLongitudinalCI360(scopedContext,asOfISO),[scopedContext,asOfISO]);
 const view=evidence.periods.find(p=>p.periodDays===days);
 const [showAxes,setShowAxes]=useState(false);
 const date=(value:string)=>value.split("-").reverse().join("/");
 const total=view?view.confirmedScheduled+view.confirmedSos+view.confirmedExtra+view.confirmedUnspecified+view.confirmedPlanned:0;
 return <details className="group overflow-hidden rounded-[20px] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[.045] to-surface" aria-label="Painel longitudinal do VAULT Brain">
  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><TrendingUp size={17} aria-hidden="true"/></span>
    <span className="min-w-0 flex-1"><strong className="block text-xs font-bold text-ink-primary">Inteligência longitudinal · 7/30 dias</strong><span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">Linha do tempo, quatro eixos, lacunas e fatos do cuidado</span></span>
    <ChevronRight size={15} className="shrink-0 text-cyan-200 transition-transform motion-reduce:transition-none group-open:rotate-90" aria-hidden="true"/>
  </summary>
  <div className="space-y-3 border-t border-surface-border/50 p-3.5">
   {evidence.state==="unavailable"||!view?<p role="status" className="text-xs text-amber-200">{evidence.reason}</p>:<>
    <div className="flex items-center gap-2" role="group" aria-label="Período da inteligência longitudinal">
     {([7,30] as const).map(value=><button key={value} type="button" aria-pressed={days===value} onClick={()=>setDays(value)} className={`min-h-11 flex-1 rounded-xl border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${days===value?"border-cyan-300/45 bg-cyan-300/10 text-cyan-200":"border-surface-border/50 bg-surface text-ink-muted"}`}>Últimos {value} dias</button>)}
    </div>
    <p className="text-[10px] text-ink-muted">Período {date(view.from)}–{date(view.through)}. Para comparação, {date(view.previousFrom)}–{date(view.previousThrough)}.</p>
    <div className="grid grid-cols-2 gap-2">
     <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] p-3"><span className="block text-[10px] text-ink-muted">Tomadas confirmadas</span><strong className="mt-1 block text-xl font-semibold tabular-nums text-ink-primary">{total}</strong><span className="block text-[10px] text-ink-muted">Com horário e desfecho válidos</span></div>
     <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-3"><span className="block text-[10px] text-ink-muted">Dias documentados</span><strong className="mt-1 block text-xl font-semibold tabular-nums text-ink-primary">{view.documentedDays}/{days}</strong><span className="block text-[10px] text-ink-muted">Antes: {view.previousDocumentedDays}/{days}</span></div>
     <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.035] p-3"><span className="block text-[10px] text-ink-muted">SOS / extra confirmados</span><strong className="mt-1 block text-lg font-semibold tabular-nums text-ink-primary">{view.confirmedSos} / {view.confirmedExtra}</strong><span className="block text-[10px] text-ink-muted">Separados da rotina programada</span></div>
     <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3"><span className="block text-[10px] text-ink-muted">Ignoradas explicitamente</span><strong className="mt-1 block text-lg font-semibold tabular-nums text-ink-primary">{view.explicitlyIgnored}</strong><span className="block text-[10px] text-ink-muted">Silêncio do histórico não é ignorada</span></div>
    </div>
    {days===7&&<div aria-label="Registro factual dos sete dias" className="rounded-xl border border-surface-border/50 bg-surface-raised/20 p-3">
     <p className="mb-2 text-[10px] font-semibold text-ink-secondary">Últimos sete dias documentados</p>
     <div className="grid grid-cols-7 gap-1.5">{view.daily.map(item=><div key={item.day} className="min-w-0 text-center"><span className="block text-[9px] tabular-nums text-ink-faint">{item.day.slice(-2)}</span><span title={`${date(item.day)}: ${item.confirmed} tomada(s) confirmada(s); ${item.record?"registro de saúde disponível":"sem registro de saúde"}`} className={`mt-1 flex min-h-9 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums ${item.confirmed>0?"border-cyan-300/30 bg-cyan-300/10 text-cyan-200":item.record?"border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200":"border-surface-border/40 bg-surface text-ink-faint"}`}>{item.confirmed>0?item.confirmed:item.record?"•":"–"}</span></div>)}</div>
     <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Número = eventos confirmados. Ponto = registro de saúde sem tomada confirmada. Traço = sem dados disponíveis, não ausência de cuidados.</p>
    </div>}
    <button type="button" onClick={()=>setShowAxes(value=>!value)} aria-expanded={showAxes} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.035] px-3 text-left text-xs font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span>Quatro eixos · dor, humor, energia, apetite</span><ChevronRight size={15} className={showAxes?"rotate-90":""}/></button>
    {showAxes&&<div className="space-y-2" aria-label="Comparação descritiva dos quatro eixos">{view.axes.map(axis=><div key={axis.axis} className="rounded-xl border border-surface-border/45 bg-surface p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-ink-primary">{axis.label}</strong><span className="text-[10px] text-ink-muted">{axis.currentSamples} atual · {axis.previousSamples} anterior</span></div>{axis.comparison==="documented"?<p className="mt-1 text-[11px] text-ink-secondary">Média informada: {axis.currentAverage} / antes {axis.previousAverage} · variação {axis.delta!>0?"+":""}{axis.delta}. Não equivale a melhora ou piora clínica.</p>:<p className="mt-1 text-[11px] text-ink-muted">Sem amostras suficientes em ambos os períodos para comparar (mínimo 3 registros e 2 dias por janela).</p>}</div>)}</div>}
    <div className="rounded-xl border border-surface-border/50 bg-surface-raised/25 p-3 space-y-1.5"><p className="text-[11px] font-semibold text-ink-primary">Contexto do cuidado</p><p className="text-[11px] leading-relaxed text-ink-muted">{view.appointmentsRecorded} consulta(s) cadastrada(s) no período · {view.withdrawalsCompleted} retirada(s) marcada(s) realizada(s) · {view.withdrawalsOpen} retirada(s) ainda agendada(s).</p><p className="text-[10px] text-ink-muted">Cadastro não comprova atendimento, dispensa ou ingestão. Uma retirada agendada não movimenta estoque.</p></div>
    {(view.conflictsExcluded+view.unverifiedClockExcluded+view.futureClockExcluded+view.pendingSync+view.plannedExcluded)>0&&<p className="flex gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-[10px] leading-relaxed text-amber-100"><Clock3 size={15} className="shrink-0"/> {view.conflictsExcluded} conflito(s), {view.unverifiedClockExcluded} horário(s) sem comprovação, {view.futureClockExcluded} timestamp(s) futuro(s), {view.plannedExcluded} planejadas excluídas, {view.pendingSync} pendente(s) de sincronização.</p>}
    <p role="note" className="flex gap-2 text-[10px] leading-relaxed text-ink-muted"><CircleHelp size={14} className="shrink-0"/>{evidence.note}</p>
    <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>onNavigate("/saude/medicamentos/historico")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-cyan-300/20 bg-cyan-300/[.035] px-2 text-[11px] font-semibold text-cyan-200"><Activity size={14}/>Histórico de doses</button><button type="button" onClick={()=>onNavigate("/saude/relatorios")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-violet-300/20 bg-violet-300/[.035] px-2 text-[11px] font-semibold text-violet-200"><FileHeart size={14}/>Relatórios</button></div>
    <button type="button" onClick={()=>onNavigate("/saude/consultas")} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border/50 px-3 text-[11px] font-semibold text-ink-secondary"><CalendarClock size={14}/>Ver consultas e preparar atendimento <ChevronRight size={13}/></button>
   </>}
   <button type="button" onClick={()=>setAsOfISO(new Date().toISOString())} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border/50 px-3 text-[11px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><RefreshCw size={13}/>Atualizar evidências</button>
  </div>
 </details>;
}
