"use client";

import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, FileClock, Loader2, ShieldCheck } from "lucide-react";
import type { HealthInsight } from "@/lib/health-insights";
import type { InsightFeedbackEntryV4 } from "@/lib/health-intelligence/feedback-v4";
import { ClinicalSnapshotP6 } from "@/components/health-intelligence/ClinicalSnapshotP6";

/**
 * M93: read-only follow-up for an existing, confirmed quantity insight.
 * No new medical inference, no dose write, no diagnosis and no independent ledger.
 * Review uses the existing Brain experience-feedback authority.
 */
export function HomeDoseQuantityFollowUp({
  insight,
  feedback,
  nextConsultationDate,
  onMarkChecked,
  onNavigate,
}: {
  insight: HealthInsight | null;
  feedback?: InsightFeedbackEntryV4;
  nextConsultationDate: string | null;
  onMarkChecked: (item: HealthInsight) => Promise<void>;
  onNavigate: (href: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasToggledDetails, setHasToggledDetails] = useState(false);
  const [error, setError] = useState("");
  if (!insight || !insight.id.startsWith("quantidade-confirmada-")) return null;

  const checked = feedback?.insightId === insight.id && feedback.feedback === "already_knew";
  const consultationLabel = nextConsultationDate && /^\d{4}-\d{2}-\d{2}$/.test(nextConsultationDate)
    ? `${nextConsultationDate.slice(8, 10)}/${nextConsultationDate.slice(5, 7)}/${nextConsultationDate.slice(0, 4)}`
    : null;

  const readableMessage = insight.mensagem.replace(/(\d+)\s+comprimido\(s\)/gi, (_match, value: string) => `${value} ${Number(value) === 1 ? "comprimido" : "comprimidos"}`);
  const review = async () => {
    if (busy || checked) return;
    setBusy(true);
    setError("");
    try {
      await onMarkChecked(insight);
    } catch {
      setError("Não foi possível registrar sua conferência. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Acompanhamento de registro de quantidade incomum" className="mx-0 rounded-[20px] border border-amber-400/20 bg-gradient-to-br from-amber-400/[.055] to-surface p-3.5">
      <button type="button" className="flex min-h-12 w-full items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" aria-expanded={hasToggledDetails ? expanded : !checked} onClick={() => { const visible = hasToggledDetails ? expanded : !checked; setHasToggledDetails(true); setExpanded(!visible); }}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><AlertTriangle size={17} aria-hidden="true"/></span>
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300">Acompanhamento de registro</span><strong className="mt-0.5 block line-clamp-1 text-sm text-ink-primary">{insight.titulo}</strong></span>
        <span className="shrink-0 text-[10px] font-medium text-ink-muted">{checked ? "Conferido · detalhes" : "Revisar detalhes"}</span>
        <ChevronRight size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
      </button>
      {(hasToggledDetails ? expanded : !checked) && <div className="mt-3 border-t border-surface-border/45 pt-3">
      <ClinicalSnapshotP6 domain="quantidade" summary={readableMessage}
        priority={insight.gravidadeSeguranca === "critica" ? "Atenção prioritária" : "Revisar registro"}
        hasRegulatorySources={Boolean(insight.fontesExternas?.length)} doseEvidence={{comparable:false}}/>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-surface-border/50 bg-void/35 px-3 py-2.5 text-xs text-ink-secondary">
        <CalendarClock size={15} className="mt-0.5 shrink-0 text-ice" aria-hidden="true"/>
        <span>{consultationLabel ? `Próxima consulta cadastrada: ${consultationLabel}. Vale levar o histórico para conversar com o profissional.` : "Nenhuma consulta futura agendada identificada no VAULT. Você pode revisar as consultas cadastradas."}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">O aviso compara registros com seu padrão cadastrado. Não determina dose segura ou intoxicação. Se houve ingestão e existe preocupação ou sintomas, procure orientação médica imediatamente.</p>
      <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Ações principais do acompanhamento">
        <button type="button" onClick={() => onNavigate(insight.entidadeTipo === "medicamento" && insight.entidadeId
          ? `/saude/medicamentos/detalhes?id=${encodeURIComponent(insight.entidadeId)}&return_to=%2F`
          : insight.link || "/saude/medicamentos")}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-amber-400/25 bg-amber-400/[.07] px-2 text-[11px] font-semibold text-amber-200"><FileClock size={14}/>Histórico e fontes</button>
        <button type="button" onClick={() => void review()} disabled={busy || checked}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-emerald-300/20 bg-emerald-300/[.055] px-2 text-[11px] font-semibold text-emerald-300 disabled:opacity-75">
          {busy ? <Loader2 size={15} className="animate-spin"/> : checked ? <CheckCircle2 size={15}/> : <ClipboardCheck size={15}/>}
          {checked ? "Conferido" : "Confirmar leitura"}
        </button>
      </div>
      <button type="button" onClick={() => onNavigate("/saude/plano-seguranca")}
        className="mt-1.5 inline-flex min-h-10 items-center gap-1 text-[11px] text-sky-200 underline-offset-2 hover:underline"><ShieldCheck size={13}/>Plano de segurança e apoio</button>
      {checked && <p role="note" className="mt-1.5 text-[10px] text-ink-muted">Conferência pessoal registrada; não equivale a avaliação profissional.</p>}
      {error && <p role="alert" className="mt-1.5 text-xs text-coral">{error}</p>}
      </div>}
    </section>
  );
}
