"use client";
import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronRight, Clock3, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildBrainSafetyEvidenceCI360 } from "@/lib/health-intelligence/brain-safety-evidence-ci360";

/** Uma lente para evidências, NÃO uma segunda central de alertas. */
export function BrainSafetyEvidenceCI360({ context, onNavigate }: {
  context: HealthInsightContext | null | undefined;
  onNavigate: (href: string) => void;
}) {
  const [asOfISO,setAsOfISO]=useState(()=>new Date().toISOString());
  const result=useMemo(()=>buildBrainSafetyEvidenceCI360(context,asOfISO),[context,asOfISO]);
  return <details className="group overflow-hidden rounded-[18px] border border-violet-300/15 bg-violet-300/[.035]">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><ShieldAlert size={16} aria-hidden="true"/></span>
      <span className="min-w-0 flex-1"><strong className="block text-xs font-bold text-ink-primary">Segurança · origem das regras</strong><span className="block text-[11px] text-ink-muted">B05.1/B05.3 · cobertura, limites e fatos confirmados</span></span>
      <ChevronRight size={15} className="shrink-0 text-violet-300 transition-transform motion-reduce:transition-none group-open:rotate-90" aria-hidden="true"/>
    </summary>
    <div className="space-y-2.5 border-t border-surface-border/40 p-3" aria-label="Explicabilidade da segurança do Brain">
      {result.state==="unavailable" ? <p role="status" className="text-xs text-amber-200">{result.reason}</p> : <>
        <p className="text-[11px] leading-relaxed text-ink-muted">Regras já registradas no motor existente. Cobertura e coincidências de horário <strong>não</strong> diagnosticam interação ou risco.</p>
        <div className="grid grid-cols-2 gap-2" aria-label="Resumo factual de segurança">
          <div className="rounded-xl border border-violet-300/15 bg-void/30 p-2.5"><span className="block text-[10px] text-ink-muted">Com regra auditada</span><strong className="block text-lg font-semibold tabular-nums text-ink-primary">{result.audited}</strong></div>
          <div className="rounded-xl border border-cyan-300/15 bg-void/30 p-2.5"><span className="block text-[10px] text-ink-muted">Tomadas · 24h</span><strong className="block text-lg font-semibold tabular-nums text-ink-primary">{result.observedTaken24h}</strong><span className="block text-[9px] text-ink-faint">Timestamp confirmado, sem interpretar dose</span></div>
        </div>
        <p className="text-[10px] text-ink-muted">{result.identifiedOnly} identificado(s) sem regra fechada · {result.unmapped} sem mapeamento. Nenhum percentual significa proteção garantida.</p>
        <div role="note" className="rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-2.5 text-[11px] leading-relaxed text-amber-100"><strong className="block font-semibold">Medidor clínico mg/24h indisponível</strong>{result.mgComparison.reason} Nenhum limite, percentual de segurança ou equivalência é presumido.</div>
        {result.excludedConflicts+result.excludedInvalidClocks>0 && <p className="flex items-start gap-1.5 text-[10px] text-amber-200"><Clock3 size={13} className="shrink-0"/> {result.excludedConflicts} conflito(s) de desfecho · {result.excludedInvalidClocks} horário(s) inválido(s) excluídos da contagem</p>}
        <div className="space-y-1.5" aria-label="Medicamentos e cobertura das regras">{result.items.slice(0,8).map(item=><button type="button" key={item.medicationId} onClick={()=>onNavigate(`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicationId)}`)} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-surface-border/55 bg-surface/40 px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-300/10 text-violet-200">{item.state==="audited_rule"?<BookOpenCheck size={14}/>:<ShieldQuestion size={14}/>}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-ink-primary">{item.name}</strong><span className="block text-[10px] leading-relaxed text-ink-muted">{item.state==="audited_rule"?`${item.ruleRefs.length} regra(s) cadastrada(s)`:item.state==="identified_only"?"Identificado; regra fechada ausente":"Referência não mapeada"} · {item.observedTaken24h} tomada(s) nas 24h</span>{item.ruleRefs.length>0&&<span className="block truncate text-[9px] text-ink-faint">Autoridade declarada: {[...new Set(item.ruleRefs.map(ref=>ref.authority))].join(" · ")}</span>}</span>
          <ChevronRight size={13} className="shrink-0 text-ink-faint"/>
        </button>)}</div>
        {result.items.length>8&&<p className="text-[10px] text-ink-muted">Mais {result.items.length-8} medicamento(s) na visão completa de cobertura da Central de Alertas.</p>}
        <p className="text-[10px] leading-relaxed text-ink-muted">{result.note} As autoridades listadas são metadados das regras internas, não uma nova verificação online de bula.</p>
        <button type="button" onClick={()=>onNavigate("/inteligencia/alertas")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/[.06] px-3 text-xs font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">Ver alertas e fontes no Brain <ChevronRight size={14}/></button>
      </>}
      <button type="button" onClick={()=>setAsOfISO(new Date().toISOString())} className="min-h-11 w-full rounded-xl border border-surface-border/50 px-3 text-[11px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">Atualizar referência temporal</button>
    </div>
  </details>;
}
