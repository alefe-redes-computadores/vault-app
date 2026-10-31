"use client";
import type { MedicationCareStage } from "@/lib/health-intelligence/medication-care-decision";
import { medicationDecisionNotice } from "@/lib/health-intelligence/medication-decision-authority";

/** A compact, explainable label next to the canonical next-step decision. */
export function MedicationDecisionAuthority({stage}: {stage:MedicationCareStage}) {
  const notice = medicationDecisionNotice(stage);
  if (!notice) return null;
  const tone = notice.tone === "attention" ? "text-amber-300 border-amber-400/20 bg-amber-400/5" :
    notice.tone === "planning" ? "text-ice border-ice/20 bg-ice/5" : "text-ink-muted border-surface-border/50 bg-surface/30";
  return <span title={notice.meaning} aria-label={`${notice.label}. ${notice.meaning}`}
    className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-[10px] font-medium ${tone}`}>
    {notice.label}
  </span>;
}
