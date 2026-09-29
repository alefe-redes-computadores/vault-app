"use client";
// VAULT_LONGITUDINAL_NAV_V65
// Drill-down da Central de atenção no domínio de Mais.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  HeartPulse,
  History,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import { PageTransition } from "@/components/PageTransition";
import { HealthInsightSheet } from "@/components/vault-intelligence/HealthInsightSheet";
import { useHealthIntelligence } from "@/hooks/useHealthIntelligence";
import type { HealthInsight } from "@/lib/health-insights";
import {
  buildBrainHealthV4,
  buildConsultationPrepV4,
  buildDailyBriefingV4,
  buildInsightExplanationV4,
  buildWeeklyReviewV4,
} from "@/lib/health-intelligence/experience-v4";
import {
  readInsightFeedbackV4,
  selectExperienceInsightsV4,
  writeInsightFeedbackV4,
  type InsightFeedbackV4,
} from "@/lib/health-intelligence/feedback-v4";

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

const SIGNAL_KIND_LABEL: Record<string, string> = {
  trend: "Tendência",
  change_point: "Mudança de padrão",
  persistence: "Persistência",
  recurrence: "Recorrência",
  temporal_relation: "Relação temporal",
};

const SIGNAL_DIRECTION_LABEL: Record<string, string> = {
  increasing: "aumentando",
  decreasing: "diminuindo",
  stable: "estável",
  oscillating: "oscilando",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  dose: "Dose",
  health_record: "Registro de saúde",
  appointment: "Consulta",
  exam: "Exame",
  pickup: "Retirada",
  renewal: "Renovação",
  treatment: "Tratamento",
};

function humanSignalSubject(subject: string, medications: Array<{ id?: string; nome?: string }>) {
  let value = subject;
  for (const medication of medications) {
    if (!medication.id || !medication.nome) continue;
    value = value.replaceAll(`medicamento:${medication.id}`, medication.nome);
  }
  return value
    .replace(/^sintoma:/i, "")
    .replace(/^registro:/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function HealthIntelligenceLabPage() {
  const router = useRouter();
  const health = useHealthIntelligence();
  const [selected, setSelected] = useState<HealthInsight | null>(null);
  const [period, setPeriod] = useState<30 | 90>(30);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackRevision, setFeedbackRevision] = useState(0);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [signalsExpanded, setSignalsExpanded] = useState(false);
  const [brainHealthExpanded, setBrainHealthExpanded] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);

  const replay = useMemo(
    () => health.replayBrainV4(90, 7),
    [health.context, health.brainV4]
  );

  const experienceInsights = useMemo(() => {
    if (!health.context?.personId) return health.highlights;
    const feedback = readInsightFeedbackV4(health.context.personId);
    return selectExperienceInsightsV4(health.insights, feedback, 3);
  }, [health.context?.personId, health.insights, health.highlights, feedbackRevision]);

  const experience = useMemo(() => {
    if (!health.context || !health.brainV4) return null;
    return {
      daily: buildDailyBriefingV4(health.context, health.insights, health.brainV4),
      weekly: buildWeeklyReviewV4(health.context, health.brainV4),
      brainHealth: buildBrainHealthV4(health.brainV4, replay),
      consultation: buildConsultationPrepV4(
        health.context,
        health.insights,
        health.brainV4,
        period
      ),
    };
  }, [health.context, health.insights, health.brainV4, replay, period]);

  const sendFeedback = (insight: HealthInsight, feedback: InsightFeedbackV4) => {
    if (!health.context?.personId) return;
    writeInsightFeedbackV4(health.context.personId, insight.id, feedback);
    setFeedbackRevision((value) => value + 1);
    const labels: Record<InsightFeedbackV4, string> = {
      useful: "Marcado como útil",
      not_relevant: "Marcado como pouco relevante",
      already_knew: "Marcado como já conhecido",
      remind_later: "Marcado para rever depois",
      hide: "Ocultado desta experiência",
    };
    setFeedbackMessage(labels[feedback]);
    window.setTimeout(() => setFeedbackMessage(null), 1800);
  };

  if (health.isLoading || !experience || !health.brainV4) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void px-5 pb-32 pt-8 text-ink-primary">
          <div className="mx-auto max-w-2xl rounded-[24px] border border-surface-border bg-surface p-5 text-sm text-ink-muted">
            Organizando timeline, evidências e histórico longitudinal…
          </div>
        </main>
      </PageTransition>
    );
  }

  const { daily, weekly, brainHealth, consultation } = experience;
  const statusLabel = {
    learning: "Aprendendo",
    observing: "Observando",
    consistent: "Contexto consistente",
  }[brainHealth.status];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void px-5 pb-32 pt-8 text-ink-primary">
        <header className="mx-auto flex max-w-2xl items-start gap-3">
          <button
            type="button"
            onClick={() => router.replace("/inteligencia")}
            className="rounded-2xl border border-surface-border bg-surface p-3 text-ink-muted"
            aria-label="Voltar"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-violet-300">
              BRAIN V4
            </p>
            <h1 className="text-2xl font-bold">Inteligência de saúde</h1>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Timeline, evidências, padrões e preparação para consulta. O Vault descreve o histórico registrado; não faz diagnóstico.
            </p>
          </div>
        </header>

        <section className="mx-auto mt-4 max-w-2xl rounded-[24px] border border-violet-400/20 bg-gradient-to-br from-violet-400/10 via-surface to-ice/[0.05] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-300"><Sparkles size={21} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-violet-300">Briefing de hoje</p>
              <h2 className="mt-1 text-lg font-bold">{daily.headline}</h2>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {daily.items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.insightId}
                onClick={() => {
                  const insight = item.insightId
                    ? health.insights.find((candidate) => candidate.id === item.insightId)
                    : null;
                  if (insight) setSelected(insight);
                }}
                className="w-full rounded-2xl border border-surface-border/70 bg-black/10 p-3 text-left disabled:opacity-100"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.detail}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <CalendarDays size={17} className="text-ice" />
            <h2 className="font-bold">Revisão dos últimos 7 dias</h2>
          </div>
          <div className="mt-3 rounded-[24px] border border-surface-border bg-surface p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Eventos", weekly.eventCount],
                ["Doses", weekly.doseEvents],
                ["Registros", weekly.healthRecords],
                ["Sinais", weekly.signals],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-black/10 px-2 py-3">
                  <strong className="text-lg">{value}</strong>
                  <p className="text-[9px] uppercase text-ink-faint">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {weekly.summary.map((line) => (
                <p key={line} className="text-xs leading-relaxed text-ink-muted">• {line}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <History size={17} className="text-ice" />
            <h2 className="font-bold">Timeline de inteligência</h2>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">Eventos recentes usados para construir contexto, sem inferir causalidade.</p>
            <button
              type="button"
              onClick={() => router.push("/saude/timeline")}
              className="shrink-0 rounded-full border border-ice/20 bg-ice/5 px-3 py-1.5 text-[10px] font-semibold text-ice"
            >
              Ver histórico completo
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {[...health.brainV4.timeline].reverse().slice(0, timelineExpanded ? 20 : 5).map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-3">
                <div className="h-2 w-2 shrink-0 rounded-full bg-ice/70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{event.label}</p>
                  <p className="mt-0.5 text-[9px] text-ink-faint">{EVENT_TYPE_LABEL[event.type] ?? event.type} · {formatDate(event.date)}</p>
                </div>
              </div>
            ))}
          </div>
          {health.brainV4.timeline.length > 5 && (
            <button type="button" onClick={() => setTimelineExpanded((value) => !value)} className="mt-2 w-full rounded-2xl border border-surface-border py-2.5 text-xs font-medium text-ink-muted active:scale-[0.99]">
              {timelineExpanded ? "Mostrar menos" : `Ver mais eventos (${Math.min(20, health.brainV4.timeline.length)})`}
            </button>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <BrainCircuit size={17} className="text-violet-300" />
            <h2 className="font-bold">Sinais longitudinais</h2>
          </div>
          <p className="mt-1 text-xs text-ink-muted">O motor acompanha tendência, persistência e recorrência. Sinais V4 ainda não disparam notificações automaticamente.</p>
          <div className="mt-3 space-y-2">
            {health.brainV4.longitudinalSignals.length ? (
              [...health.brainV4.longitudinalSignals]
                .sort((a, b) => b.confidenceScore - a.confidenceScore)
                .slice(0, signalsExpanded ? 8 : 3)
                .map((signal) => (
                  <div key={signal.id} className="rounded-[22px] border border-violet-400/15 bg-violet-400/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold">{humanSignalSubject(signal.subject, health.context?.medicamentos ?? [])}</p>
                      <span className="rounded-full bg-violet-400/10 px-2 py-1 font-mono text-[9px] text-violet-300">{signal.confidenceScore}%</span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] uppercase text-ink-faint">{SIGNAL_KIND_LABEL[signal.kind] ?? signal.kind}{signal.direction ? ` · ${SIGNAL_DIRECTION_LABEL[signal.direction] ?? signal.direction}` : ""}</p>
                    {signal.evidence.map((line) => <p key={line} className="mt-2 text-xs text-ink-muted">{line}</p>)}
                  </div>
                ))
            ) : (
              <div className="rounded-[22px] border border-surface-border bg-surface p-4 text-xs text-ink-muted">
                Ainda não há amostra suficiente para um novo sinal longitudinal.
              </div>
            )}
          </div>
          {health.brainV4.longitudinalSignals.length > 3 && (
            <button type="button" onClick={() => setSignalsExpanded((value) => !value)} className="mt-2 w-full rounded-2xl border border-violet-400/15 py-2.5 text-xs font-medium text-violet-300 active:scale-[0.99]">
              {signalsExpanded ? "Mostrar menos" : `Ver todos os ${health.brainV4.longitudinalSignals.length} sinais`}
            </button>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Stethoscope size={17} className="text-emerald-300" />
              <h2 className="font-bold">Preparar consulta</h2>
            </div>
            <div className="flex rounded-xl border border-surface-border bg-surface p-1">
              {[30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPeriod(days as 30 | 90)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] ${period === days ? "bg-ice/10 text-ice" : "text-ink-muted"}`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-[26px] border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-black/10 p-3"><strong>{consultation.medicationCount}</strong><p className="text-[9px] text-ink-faint">medicamentos</p></div>
              <div className="rounded-2xl bg-black/10 p-3"><strong>{consultation.adherence.percentage ?? "—"}{consultation.adherence.percentage !== null ? "%" : ""}</strong><p className="text-[9px] text-ink-faint">doses registradas</p></div>
              <div className="rounded-2xl bg-black/10 p-3"><strong>{consultation.sosExtra.count}</strong><p className="text-[9px] text-ink-faint">SOS/extra</p></div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold">Lembretes para conversar</p>
              {consultation.questionsToRemember.map((question) => (
                <p key={question} className="mt-2 text-xs leading-relaxed text-ink-muted">• {question}</p>
              ))}
            </div>
            {consultation.dataQuality.length > 0 && (
              <div className="mt-4 border-t border-surface-border/60 pt-3">
                <p className="text-[10px] font-semibold uppercase text-ink-faint">Qualidade dos dados</p>
                {consultation.dataQuality.map((item) => <p key={item} className="mt-1.5 text-xs text-ink-muted">• {item}</p>)}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Activity size={17} className="text-sky-300" />
            <h2 className="font-bold">Saúde do cérebro</h2>
          </div>
          <button type="button" onClick={() => setBrainHealthExpanded((value) => !value)} className="mt-3 flex w-full items-center justify-between rounded-[22px] border border-sky-400/15 bg-sky-400/[0.03] p-4 text-left">
            <div><p className="text-sm font-semibold">{statusLabel}</p><p className="mt-0.5 text-[10px] text-ink-muted">{brainHealth.timelineEvents} eventos · {brainHealth.shadowSignals} sinais · {brainHealth.replayPoints} replays</p></div>
            <ChevronRight size={17} className={`text-sky-300 transition-transform ${brainHealthExpanded ? "rotate-90" : ""}`} />
          </button>
          {brainHealthExpanded && (
            <div className="mt-2 rounded-[22px] border border-sky-400/10 bg-sky-400/[0.02] p-4">
              <p className="text-[10px] text-ink-muted">Mede dados e funcionamento do motor, não sua saúde.</p>
              {brainHealth.notes.map((note) => <p key={note} className="mt-2 text-xs text-ink-muted">• {note}</p>)}
            </div>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <MessageSquareText size={17} className="text-ice" />
            <h2 className="font-bold">Ensinar relevância ao Vault</h2>
          </div>
          <p className="mt-1 text-xs text-ink-muted">Seu feedback ajusta relevância futura; ele nunca altera fatos clínicos nem transforma uma hipótese em verdade.</p>
          <div className="mt-3 space-y-2">
            {(feedbackExpanded ? experienceInsights : experienceInsights.slice(0, 1)).map((insight) => (
              <div key={insight.id} className="rounded-[22px] border border-surface-border bg-surface p-4">
                <button type="button" onClick={() => setSelected(insight)} className="flex w-full items-center gap-2 text-left">
                  <p className="min-w-0 flex-1 text-xs font-semibold">{insight.titulo}</p>
                  <ChevronRight size={15} className="text-ink-faint" />
                </button>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    ["useful", "Útil"],
                    ["not_relevant", "Pouco relevante"],
                    ["already_knew", "Já sabia"],
                    ["remind_later", "Rever depois"],
                    ["hide", "Não mostrar"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => sendFeedback(insight, value as InsightFeedbackV4)}
                      className="rounded-full border border-surface-border px-2.5 py-1.5 text-[9px] text-ink-muted active:scale-95"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {experienceInsights.length > 1 && (
            <button type="button" onClick={() => setFeedbackExpanded((value) => !value)} className="mt-2 w-full rounded-2xl border border-surface-border py-2.5 text-xs font-medium text-ink-muted active:scale-[0.99]">
              {feedbackExpanded ? "Mostrar menos" : `Avaliar mais ${experienceInsights.length - 1} insight(s)`}
            </button>
          )}
        </section>

        <section className="mx-auto mt-4 max-w-2xl rounded-[24px] border border-surface-border bg-surface/70 p-4">
          <div className="flex gap-3">
            <Database size={17} className="mt-0.5 shrink-0 text-ink-faint" />
            <p className="text-[10px] leading-relaxed text-ink-muted">
              O Brain V4 usa somente dados registrados no Vault. Relações temporais não provam causa. Confiança mede força do conjunto de dados e das evidências disponíveis, não certeza médica.
            </p>
          </div>
        </section>

        {feedbackMessage && (
          <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-ice/20 bg-surface px-4 py-2 text-xs shadow-xl">
            {feedbackMessage}
          </div>
        )}

        {/* VAULT_BRAIN_V4_EXPLAINABILITY_UI */}
        {selected && (() => {
          const explanation = buildInsightExplanationV4(selected, health.brainV4);
          if (!explanation) return null;

          return (
            <section className="mx-auto mt-4 max-w-2xl rounded-[24px] border border-violet-400/15 bg-violet-400/[0.03] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                Por que o Vault mostrou isso?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-black/10 p-3">
                  <p className="text-[9px] uppercase text-ink-faint">Período</p>
                  <p className="mt-1 text-xs text-ink-muted">{explanation.periodLabel}</p>
                </div>
                <div className="rounded-2xl bg-black/10 p-3">
                  <p className="text-[9px] uppercase text-ink-faint">Amostra</p>
                  <p className="mt-1 text-xs text-ink-muted">{explanation.sampleLabel}</p>
                </div>
                <div className="rounded-2xl bg-black/10 p-3">
                  <p className="text-[9px] uppercase text-ink-faint">Cobertura</p>
                  <p className="mt-1 text-xs text-ink-muted">{explanation.coverageLabel}</p>
                </div>
                <div className="rounded-2xl bg-black/10 p-3">
                  <p className="text-[9px] uppercase text-ink-faint">Eventos relacionados</p>
                  <p className="mt-1 text-xs text-ink-muted">{explanation.nearbyEvents}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                {explanation.confidenceLabel}
              </p>
              {explanation.evidence.slice(0, 3).map((line) => (
                <p key={line} className="mt-2 text-xs leading-relaxed text-ink-muted">• {line}</p>
              ))}
              {explanation.sources.length > 0 && (
                <div className="mt-3 rounded-2xl border border-surface-border/60 bg-black/10 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-faint">Fontes internas consultadas</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{explanation.sources.join(" · ")}</p>
                </div>
              )}
              {selected.acaoSegura && (
                <div className="mt-3 rounded-2xl border border-ice/15 bg-ice/[0.05] p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-ice">Próximo passo seguro</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{selected.acaoSegura}</p>
                </div>
              )}
              {explanation.missingData.slice(0, 2).map((line) => (
                <p key={line} className="mt-2 text-xs leading-relaxed text-amber-300/80">• {line}</p>
              ))}
              <p className="mt-3 border-t border-surface-border/60 pt-3 text-[10px] leading-relaxed text-ink-faint">
                {explanation.limitation}
              </p>
            </section>
          );
        })()}


        <HealthInsightSheet
          insight={selected}
          onClose={() => setSelected(null)}
          onNavigate={(href) => {
            setSelected(null);
            router.push(href);
          }}
        />
      </main>
    </PageTransition>
  );
}
