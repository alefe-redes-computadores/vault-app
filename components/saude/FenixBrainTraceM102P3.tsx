"use client";
import { useMemo } from "react";
import { BrainCircuit, ChevronRight, Layers3, ShieldCheck } from "lucide-react";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import type { BrainCarePlanItem } from "@/lib/health-intelligence/care-plan";
import { projectFenixBrainTraceM102P3 } from "@/lib/health-intelligence/fenix-brain-trace-m102p3";

/** Disclosure only. Uses snapshots already loaded, never another DB / network query. */
export function FenixBrainTraceM102P3({ userId, contextUserId, personId, alert, decision, onNavigate }: {
  userId: string;
  contextUserId?: string | null;
  personId: string;
  alert?: BrainV5Alert | null;
  decision?: BrainCarePlanItem | null;
  onNavigate: (href: string) => void;
}) {
  const report = useMemo(
    () => projectFenixBrainTraceM102P3({ userId, contextUserId, personId, alert, decision }),
    [userId, contextUserId, personId, alert, decision]
  );
  if (!report) return null;
  return <details data-fenix-brain-trace-m102p3 className="rounded-2xl border border-violet-300/15 bg-surface/60 p-3">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl text-xs font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
      <Layers3 size={17} className="shrink-0 text-violet-300" aria-hidden="true" />
      <span className="min-w-0 flex-1">Avatar + Brain · origem das decisões</span>
      <ChevronRight size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
    </summary>
    <div className="space-y-2 border-t border-surface-border/60 pt-3">
      {report.entries.map(item => <div key={item.kind} className="rounded-xl border border-surface-border/60 bg-surface-raised/50 p-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-ink-secondary">
          {item.kind === "brain" ? <BrainCircuit size={15} className="text-violet-300" aria-hidden="true" /> : <ShieldCheck size={15} className="text-emerald-300" aria-hidden="true" />}
          {item.label}
        </div>
        <p className="mt-1 text-xs font-semibold text-ink-primary">{item.title}</p>
        <p className="mt-1 text-[11px] text-ink-secondary">{item.authority}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{item.explanation}</p>
        <p className="mt-1 text-[10px] text-ink-faint">{item.evidenceCount} item(ns) de evidência referenciado(s) · conferência no detalhe</p>
        {item.href && <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs font-medium text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" onClick={() => onNavigate(item.href!)}>Ver registro original <ChevronRight size={13} aria-hidden="true"/></button>}
      </div>)}
      <button type="button" onClick={() => onNavigate("/saude/minha-saude#avatar-evidence-lens-m122")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[.04] px-3 text-[11px] font-semibold text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">Explorar fontes na lente da Fênix <ChevronRight size={15} aria-hidden="true" /></button>
      <p className="text-[10px] leading-relaxed text-ink-muted">{report.note} Não confirma diagnóstico, causalidade ou conclusão de cuidados.</p>
    </div>
  </details>;
}
