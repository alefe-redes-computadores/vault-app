"use client";
import { useMemo } from "react";
import { ChevronRight, Route } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareReadiness } from "@/lib/health-intelligence/care-readiness";
import { buildCareForecast } from "@/lib/health-intelligence/care-forecast";

export function AvatarCareReadiness({ context, onNavigate }: { context: HealthInsightContext | null; onNavigate: (href: string) => void }) {
  const portfolio = useMemo(() => context ? buildCareReadiness(context) : null, [context]);
  const forecast = useMemo(() => context ? buildCareForecast(context) : null, [context]);
  if (!portfolio || !portfolio.items.length) return null;
  const attention = portfolio.counts.overdue + portfolio.counts.prepare;
  const nextAction = forecast?.actions[0];
  return <button type="button" onClick={() => onNavigate("/saude/registros/relatorio")} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-3 text-left">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><Route size={17}/></span>
    <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Linha de cuidado no contexto</strong><span className="mt-0.5 block line-clamp-1 text-[9px] text-ink-muted">{nextAction ? nextAction.title : attention ? `${attention} próxima(s) etapa(s) para organizar` : "Rotas registradas sem pendência operacional comprovada"}</span><span className="mt-1 block text-[8px] text-ink-faint">{forecast?.actions.length || 0} etapa(s) · compra e SUS separados</span></span><ChevronRight size={14} className="shrink-0 text-ink-faint"/>
  </button>;
}
