"use client";
import { useMemo, useState } from "react";
import { Activity, AlertCircle, CalendarDays, ChevronRight, Clock3, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildBrainEvidenceWindowCI360 } from "@/lib/health-intelligence/brain-evidence-window-ci360";

/** Usa o mesmo contexto do Brain: nenhuma segunda consulta, inferência ou movimento clínico. */
export function BrainEvidenceWindowCI360({ context, onNavigate }: {
  context: HealthInsightContext | null | undefined;
  onNavigate: (href: string) => void;
}) {
  const [asOfISO, setAsOfISO] = useState(() => new Date().toISOString());
  const evidence = useMemo(() => buildBrainEvidenceWindowCI360(context, asOfISO), [context, asOfISO]);
  if (evidence.state === "unavailable") {
    return <div aria-label="Janela factual do Brain" className="rounded-2xl border border-surface-border bg-surface p-3">
      <p className="text-xs font-bold text-ink-primary">Janela factual do Brain</p>
      <p className="mt-1 text-[11px] text-ink-muted">{evidence.reason}</p>
    </div>;
  }
  const lastSeven = evidence.sevenDays;
  return <section aria-label="Janela factual do Brain · complemento 360" className="overflow-hidden rounded-[20px] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/[.055] to-surface p-3.5">
    <div className="flex items-start gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-200"><Activity size={17} aria-hidden="true"/></span>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-ink-primary">Evidências de doses e registros</h3><p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">Janela móvel de 24h, observação de 30 dias e origem dos dados. Não é avaliação de segurança clínica.</p></div>
      <button type="button" onClick={() => setAsOfISO(new Date().toISOString())} className="grid size-10 shrink-0 place-items-center rounded-xl border border-surface-border text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label="Atualizar horário de referência"><RefreshCw size={16}/></button>
    </div>
    <p className="mt-1 text-[9px] tabular-nums text-ink-faint">Referência local: {new Date(asOfISO).toLocaleString("pt-BR", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</p>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Contagens factuais">
      <div className="rounded-xl border border-cyan-300/15 bg-void/35 p-2.5"><span className="text-[10px] text-ink-muted">Tomadas · 24h</span><strong className="mt-0.5 block text-xl font-semibold tabular-nums text-ink-primary">{evidence.confirmed24h}</strong><span className="text-[9px] text-ink-faint">Horário real confirmado</span></div>
      <div className="rounded-xl border border-amber-300/15 bg-void/35 p-2.5"><span className="text-[10px] text-ink-muted">SOS / extra · 24h</span><strong className="mt-0.5 block text-xl font-semibold tabular-nums text-ink-primary">{evidence.sos24h + evidence.extra24h}</strong><span className="text-[9px] text-ink-faint">{evidence.sos24h} SOS · {evidence.extra24h} extra</span></div>
      <div className="col-span-2 rounded-xl border border-surface-border/60 bg-void/35 p-2.5 sm:col-span-1"><span className="text-[10px] text-ink-muted">Dias documentados · 30d</span><strong className="mt-0.5 block text-xl font-semibold tabular-nums text-ink-primary">{evidence.documentedDays30d}<span className="text-xs text-ink-muted">/30</span></strong><span className="text-[9px] text-ink-faint">Cobertura do histórico, não adesão</span></div>
    </div>
    <div className="mt-3 rounded-xl border border-surface-border/60 bg-void/20 px-2.5 py-2.5">
      <div className="mb-2 flex items-center gap-1.5"><CalendarDays size={13} className="text-cyan-200"/><span className="text-[11px] font-semibold text-ink-primary">Últimos sete dias</span><span className="ml-auto text-[9px] text-ink-muted">Tomadas confirmadas</span></div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Registros confirmados por dia nos últimos sete dias">
        {lastSeven.map(day => <div key={day.dayISO} className="flex min-w-0 flex-col items-center gap-1" title={`${day.dayISO}: ${day.confirmed} tomada(s) confirmada(s); ${day.record ? "há registro de saúde" : "sem registro de saúde"}`}>
          <div className={`flex h-8 w-full min-w-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums ${day.confirmed ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : day.record ? "border-violet-300/25 bg-violet-300/[.055] text-violet-200" : "border-surface-border/50 bg-surface-raised/25 text-ink-muted"}`}>{day.confirmed ? day.confirmed : "—"}</div>
          <span className="text-[9px] tabular-nums text-ink-faint">{day.dayISO.slice(8)}</span>
        </div>)}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">“—” significa sem confirmação elegível nesta leitura, não que uma dose tenha sido perdida. Dias com registros de saúde, mas sem tomada, aparecem em violeta.</p>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
      <span className="rounded-lg border border-surface-border/60 px-2 py-1 text-ink-secondary">30d: {evidence.confirmed30d} tomadas</span>
      <span className="rounded-lg border border-surface-border/60 px-2 py-1 text-ink-secondary">{evidence.ignored30d} ignoradas explícitas</span>
      <span className="rounded-lg border border-surface-border/60 px-2 py-1 text-ink-secondary">{evidence.distinctRecordDays30d} dias com registros de saúde</span>
      {evidence.sharedMedicationDays30d > 0 ? <span className="rounded-lg border border-violet-300/20 px-2 py-1 text-violet-200">{evidence.sharedMedicationDays30d} dia(s) com diferentes medicamentos registrados · não significa interação</span> : null}
    </div>
    {(evidence.conflicts30d > 0 || evidence.missingTakenClock30d > 0 || evidence.futureTakenClock30d > 0 || evidence.unspecified24h > 0 || evidence.pendingSync30d > 0) && <p role="note" className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-2.5 text-[11px] leading-relaxed text-amber-100"><AlertCircle size={14} className="mt-0.5 shrink-0"/><span>{evidence.conflicts30d} conflitos de desfecho, {evidence.missingTakenClock30d} tomadas sem horário verificável, {evidence.futureTakenClock30d} horários de tomada no futuro, {evidence.unspecified24h} sem tipo definido nas 24h e {evidence.pendingSync30d} tomadas confirmadas pendentes de sincronização nos 30 dias. Nenhum dado ambíguo foi convertido em dose ou unidade.</span></p>}
    <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-muted"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-300"/>Fonte: registros da pessoa ativa no contexto canônico do VAULT. Sem conversão automática para mg, limite de dose, conclusão de estoque ou diagnóstico. Perguntas opcionais continuam na seção própria do Brain.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-border/40 pt-3">
      <button type="button" onClick={() => onNavigate("/saude/medicamentos/historico")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-cyan-300/20 bg-cyan-300/[.055] px-2 text-[11px] font-semibold text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><Clock3 size={13}/>Histórico <ChevronRight size={12}/></button>
      <button type="button" onClick={() => onNavigate("/saude/relatorios")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-surface-border/70 bg-surface-raised/30 px-2 text-[11px] font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><FileText size={13}/>Consulta <ChevronRight size={12}/></button>
    </div>
    <details className="group mt-2 rounded-xl border border-surface-border/50 px-2.5 py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span>Contexto e apoio · fontes existentes</span><ChevronRight size={14} className="group-open:rotate-90"/></summary>
      <div className="grid grid-cols-1 gap-1.5 border-t border-surface-border/40 py-2 min-[400px]:grid-cols-2">
        {[["PharmaLens · fabricantes e relatos", "/saude/pharmalens"], ["Fornecimento e retiradas", "/saude/fornecimento"], ["Plano de Segurança voluntário", "/saude/plano-seguranca"]].map(([label,href]) =>
          <button type="button" key={href} onClick={() => onNavigate(href)} className="flex min-h-11 items-center justify-between gap-1 rounded-lg border border-surface-border/50 bg-surface-raised/30 px-2.5 text-left text-[11px] text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span>{label}</span><ChevronRight size={12}/></button>)}
        <p className="col-span-full text-[10px] leading-relaxed text-ink-muted">Os destinos preservam suas autoridades: PharmaLens não comprova causalidade; fornecimento não confirma estoque sozinho; apoio nunca envia mensagens automaticamente.</p>
      </div>
    </details>
  </section>;
}
