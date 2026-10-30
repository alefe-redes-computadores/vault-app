"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { BrainCircuit, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareReadiness } from "@/lib/health-intelligence/care-readiness";
import { buildCareForecast } from "@/lib/health-intelligence/care-forecast";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { compareCarePlan, readCarePlanMemory, type CarePlanChange } from "@/lib/health-intelligence/care-plan-memory";

export const AvatarCareReadiness = memo(function AvatarCareReadiness({ context, command, onNavigate }: { context: HealthInsightContext | null; command?: CareCommandSnapshot | null; onNavigate: (href: string) => void }) {
  const [change, setChange] = useState<CarePlanChange | null>(null);
  const forecast = useMemo(() => command?.forecast ?? (context ? buildCareForecast(context) : null), [command, context]);
  const portfolio = useMemo(() => command?.readiness ?? (context && forecast ? buildCareReadiness(context, forecast.generatedFor, forecast) : null), [command, context, forecast]);
  const attention = (portfolio?.counts.overdue ?? 0) + (portfolio?.counts.prepare ?? 0);
  const nextAction = command?.primary ?? forecast?.actions[0];
  const planFocus = command?.decision;
  const authorityLabel = planFocus?.evidenceKind === "recorded" ? "fato registrado" : planFocus?.evidenceKind === "projected" ? "projeção" : planFocus?.evidenceKind === "association" ? "associação cautelosa" : planFocus ? "dado a completar" : null;
  useEffect(() => {
    if (!command?.plan) return setChange(null);
    setChange(compareCarePlan(readCarePlanMemory(command.plan.ownerKey), command.plan));
  }, [command?.plan]);
  if (!portfolio || (!portfolio.items.length && !forecast?.actions.length)) return null;
  const destination = planFocus?.href || nextAction?.href || "/saude/registros/relatorio";
  const medicationSignal = command?.medications;
  const healthSignal = command?.health;
  const accessSignal = command?.access;
  const archiveSignal = command?.archive;
  return <button type="button" onClick={() => onNavigate(destination)} aria-label={`Abrir contexto do Brain: ${planFocus?.title || nextAction?.title || "resumo do cuidado"}`} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-300/[.035] p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-300"><BrainCircuit size={17}/></span>
    <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Brain no contexto do Avatar</strong><span className="mt-0.5 block text-[8px] text-violet-200">Toque para ver o contexto e as evidências da próxima ação</span><span className="mt-0.5 block line-clamp-1 text-[9px] text-ink-muted">{planFocus ? planFocus.title : nextAction ? nextAction.title : attention ? `${attention} próxima(s) etapa(s) para organizar` : "Rotas registradas sem pendência operacional comprovada"}</span><span className="mt-1 block text-[8px] text-ink-faint">{change && change.kind !== "stable" ? `${change.label} · ` : ""}{authorityLabel ? `${authorityLabel} · ` : ""}{planFocus?.supplyRoute ? `${planFocus.supplyRoute} · ` : ""}{planFocus ? `prioridade ${planFocus.priorityScore} · confiança ${planFocus.confidence === "high" ? "alta" : planFocus.confidence === "moderate" ? "moderada" : "limitada"}` : `${command?.plan.items.length ?? forecast?.actions.length ?? 0} etapa(s) · autoridades separadas`}{accessSignal?.withdrawals.overdue ? ` · ${accessSignal.withdrawals.overdue} retirada(s) vencida(s)` : accessSignal?.documents.explicitMissing ? ` · ${accessSignal.documents.explicitMissing} documento(s) explícito(s)` : archiveSignal?.plannedPrescriptions ? ` · ${archiveSignal.plannedPrescriptions} receita(s) planejada(s)` : ""}{medicationSignal?.temporaryCoursesOpen ? ` · ${medicationSignal.temporaryCoursesOpen} período(s) ativo(s)` : ""}{healthSignal?.records7d ? ` · ${healthSignal.records7d} registro(s) em 7d` : ""}</span></span><ChevronRight size={14} className="shrink-0 text-ink-faint"/>
  </button>;
});
