"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { BrainCircuit, ChevronRight } from "lucide-react";
import type { HealthInsightContext } from "@/lib/health-insights";
import { buildCareReadiness } from "@/lib/health-intelligence/care-readiness";
import { buildCareForecast } from "@/lib/health-intelligence/care-forecast";
import type { CareCommandSnapshot } from "@/lib/health-intelligence/care-command";
import { compareCarePlan, readCarePlanMemory, type CarePlanChange } from "@/lib/health-intelligence/care-plan-memory";
import { buildAvatarDecisionBrief } from "@/lib/health-intelligence/avatar-decision-brief";

export const AvatarCareReadiness = memo(function AvatarCareReadiness({ context, command, onNavigate }: { context: HealthInsightContext | null; command?: CareCommandSnapshot | null; onNavigate: (href: string) => void }) {
  const [change, setChange] = useState<CarePlanChange | null>(null);
  const forecast = useMemo(() => command?.forecast ?? (context ? buildCareForecast(context) : null), [command, context]);
  const portfolio = useMemo(() => command?.readiness ?? (context && forecast ? buildCareReadiness(context, forecast.generatedFor, forecast) : null), [command, context, forecast]);

  const nextAction = command?.primary ?? forecast?.actions[0];
  const planFocus = command?.decision;
  const authorityLabel = planFocus?.evidenceKind === "recorded" ? "fato registrado" : planFocus?.evidenceKind === "projected" ? "projeção" : planFocus?.evidenceKind === "association" ? "associação cautelosa" : planFocus ? "dado a completar" : null;
  useEffect(() => {
    if (!command?.plan) return setChange(null);
    setChange(compareCarePlan(readCarePlanMemory(command.plan.ownerKey), command.plan));
  }, [command?.plan]);
  if (!portfolio || (!portfolio.items.length && !forecast?.actions.length)) return null;
  const destination = planFocus?.href || nextAction?.href || "/saude/registros/relatorio";
  // P12: a prioridade é o fato/projeção da decisão canônica; métricas extras
  // continuam nas evidências recolhíveis, sem empilhar microtextos no Avatar.
  const accessSignal = command?.access; // V326: mantém acesso e documentos explícitos no Avatar.
  const healthSignal = command?.health; // V325: registros longitudinais compartilhados.
  const medicationSignal = command?.medications; // Cursos temporários preservados.
  const archiveSignal = command?.archive; // V327: mantém receitas planejadas observáveis no Avatar.
  const brief = buildAvatarDecisionBrief({
    title: planFocus?.title ?? nextAction?.title,
    reason: planFocus?.reason ?? nextAction?.reason,
    evidenceKind: planFocus?.evidenceKind,
    lane: planFocus?.lane,
    counts: portfolio.counts,
    overdueWithdrawals: command?.access?.withdrawals.overdue,
    missingDocuments: command?.access?.documents.explicitMissing,
  });
  return <button type="button" onClick={() => onNavigate(destination)}
    aria-label={`Abrir contexto do Brain: ${brief.title}`}
    className="flex min-h-14 w-full items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/[.045] p-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><BrainCircuit size={19}/></span>
    <span className="min-w-0 flex-1 space-y-1">
      <strong className="block text-[11px] font-semibold uppercase tracking-wide text-violet-200">Brain · {brief.posture}</strong>
      <span className="block text-sm font-semibold leading-snug text-ink-primary">{planFocus ? brief.title : nextAction ? nextAction.title : brief.title}</span>
      <span className="block line-clamp-2 text-xs leading-relaxed text-ink-muted">{brief.explanation}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[10px] text-ink-faint">
        <span>{authorityLabel ?? brief.authority}</span>
        {change && change.kind !== "stable" ? <span>{change.label}</span> : null}
        {planFocus?.supplyRoute && planFocus.supplyRoute !== "Origem não informada" ? <span>{planFocus.supplyRoute}</span> : null}
        {planFocus ? <span>prioridade {planFocus.priorityScore} · confiança {planFocus.confidence === "high" ? "alta" : planFocus.confidence === "moderate" ? "moderada" : "limitada"}</span> : null}
        {accessSignal?.withdrawals.overdue ? <span>{accessSignal.withdrawals.overdue} retirada(s) vencida(s)</span> : null}
        {accessSignal?.documents.explicitMissing ? <span>{accessSignal.documents.explicitMissing} documento(s) explícito(s)</span> : null}
        {archiveSignal?.plannedPrescriptions ? <span>{archiveSignal.plannedPrescriptions} receita(s) planejada(s)</span> : null}
        {healthSignal?.records7d ? <span>{healthSignal.records7d} registro(s) de saúde nos últimos 7 dias</span> : null}
        {medicationSignal?.temporaryCoursesOpen ? <span>{medicationSignal.temporaryCoursesOpen} período(s) temporário(s) em acompanhamento</span> : null}
      </span>
      <span className="block line-clamp-1 text-[10px] text-violet-200">Abrir explicação e evidências</span>
    </span>
    <ChevronRight size={16} className="mt-2 shrink-0 text-violet-300"/>
  </button>;
});
