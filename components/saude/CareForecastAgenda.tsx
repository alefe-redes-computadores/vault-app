"use client";

import { useMemo } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareForecast, type CareForecast, type CareForecastAction } from "@/lib/health-intelligence/care-forecast";

const laneLabel: Record<CareForecastAction["lane"], string> = { now: "Agora", next: "Próxima etapa", follow_up: "Acompanhar", review_data: "Completar dados" };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : null;

export function CareForecastAgenda({ context, forecast: sharedForecast, onNavigate }: { context: HealthInsightContext | null; forecast?: CareForecast | null; onNavigate: (href: string) => void }) {
  const forecast = useMemo(() => sharedForecast ?? (context ? buildCareForecast(context) : null), [context, sharedForecast]);
  if (!forecast) return null;
  const visible = forecast.actions.slice(0, 2);
  const later = forecast.actions.slice(2, 6);
  const renderAction = (action: CareForecastAction) => { const date = formatDate(action.date); return <button key={action.id} type="button" onClick={() => onNavigate(action.href)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-surface-border/70 bg-surface/70 px-3 py-2.5 text-left active:scale-[.985]"><span className={`h-2 w-2 shrink-0 rounded-full ${action.lane === "now" ? "bg-rose-300" : action.lane === "next" ? "bg-amber-300" : action.lane === "review_data" ? "bg-violet-300" : "bg-cyan-300"}`}/><span className="min-w-0 flex-1"><span className="block text-[8px] font-semibold uppercase tracking-wider text-ink-faint">{laneLabel[action.lane]}{date ? ` · ${date}` : ""}</span><strong className="mt-0.5 block truncate text-xs text-ink-primary">{action.title}</strong><span className="mt-0.5 block line-clamp-1 text-[9px] text-ink-muted">{action.reason}</span></span><ChevronRight size={14} className="shrink-0 text-ink-faint"/></button>; };
  return <section aria-label="Próximas etapas da linha de cuidado" className="mx-auto mt-4 max-w-2xl rounded-[20px] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.05] to-surface p-4">
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200"><CalendarClock size={18}/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Próximas etapas do cuidado</h2><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Ordenadas por prazo e evidência. Planejamento não conta como compra, gasto ou estoque.</p></div><span className="rounded-full border border-cyan-300/15 px-2 py-1 font-mono text-[8px] text-cyan-200">{forecast.actions.length}</span></div>
    {visible.length ? <div className="mt-3 space-y-2">{visible.map(renderAction)}{later.length ? <details className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl text-[10px] font-semibold text-cyan-200">Ver próximas {later.length}<ChevronRight size={13} className="transition group-open:rotate-90"/></summary><div className="mt-2 space-y-2">{later.map(renderAction)}</div></details> : null}</div> : <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-xs text-emerald-200">Nenhuma próxima etapa comprovada nos dados atuais.</div>}
    <p className="mt-3 text-[9px] leading-relaxed text-ink-faint">A projeção de estoque é organizacional, não previsão clínica. Dados ausentes permanecem desconhecidos — nunca viram zero.</p>
  </section>;
}
