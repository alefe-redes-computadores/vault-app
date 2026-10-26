"use client";
import { useMemo } from "react";
import { BrainCircuit, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareReadiness } from "@/lib/health-intelligence/care-readiness";
import { buildCareForecast } from "@/lib/health-intelligence/care-forecast";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";

export function AvatarCareReadiness({ context, command, onNavigate }: { context: HealthInsightContext | null; command?: CareCommandSnapshot | null; onNavigate: (href: string) => void }) {
  const forecast = useMemo(() => command?.forecast ?? (context ? buildCareForecast(context) : null), [command, context]);
  const portfolio = useMemo(() => command?.readiness ?? (context && forecast ? buildCareReadiness(context, forecast.generatedFor, forecast) : null), [command, context, forecast]);
  if (!portfolio || (!portfolio.items.length && !forecast?.actions.length)) return null;
  const attention = portfolio.counts.overdue + portfolio.counts.prepare;
  const nextAction = command?.primary ?? forecast?.actions[0];
  const planFocus = command?.plan.focus[0];
  const destination = planFocus?.href || nextAction?.href || "/saude/registros/relatorio";
  return <button type="button" onClick={() => onNavigate(destination)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-300/[.035] p-3 text-left">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-300"><BrainCircuit size={17}/></span>
    <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Brain no contexto do Avatar</strong><span className="mt-0.5 block line-clamp-1 text-[9px] text-ink-muted">{planFocus ? planFocus.title : nextAction ? nextAction.title : attention ? `${attention} próxima(s) etapa(s) para organizar` : "Rotas registradas sem pendência operacional comprovada"}</span><span className="mt-1 block text-[8px] text-ink-faint">{command?.plan.items.length ?? forecast?.actions.length ?? 0} etapa(s) · fato, projeção e conversa separados</span></span><ChevronRight size={14} className="shrink-0 text-ink-faint"/>
  </button>;
}
