import type { BrainV5Alert } from "./brain-v5";
import { brainV5IsSnoozed, brainV5Journeys } from "./brain-v5";

export type BrainCalibration = {
  openJourneys: number;
  actionable: number;
  evidenceReady: number;
  limitedEvidence: number;
  stale: number;
  repeated: number;
  score: number | null;
  label: string;
  explanation: string;
};

/** Measures decision support quality, never the user's health or adherence. */
export function calibrateBrain(records: readonly BrainV5Alert[], now = new Date()): BrainCalibration {
  const journeys = brainV5Journeys([...records]).filter(item => item.primary.state !== "resolved" && !brainV5IsSnoozed(item.primary));
  const primaries = journeys.map(item => item.primary);
  const actionable = primaries.filter(item => item.actionability === "direct" || item.actionability === "guided").length;
  const evidenceReady = primaries.filter(item => item.evidence_quality === "strong" || item.evidence_quality === "moderate").length;
  const limitedEvidence = primaries.filter(item => item.evidence_quality === "limited").length;
  const stale = primaries.filter(item => {
    const time = Date.parse(item.last_detected_at);
    return Number.isFinite(time) && now.getTime() - time > 30 * 86400000;
  }).length;
  const repeated = primaries.filter(item => (item.episode || 1) > 1).length;
  const total = primaries.length;
  const score = total ? Math.max(0, Math.min(100, Math.round(((actionable + evidenceReady) / (total * 2)) * 100 - (stale / total) * 20))) : null;
  const label = score === null ? "Sem jornada aberta" : score >= 80 ? "Base bem sustentada" : score >= 55 ? "Base útil com ressalvas" : "Dados precisam de revisão";
  const explanation = score === null
    ? "O Brain não possui decisão aberta para calibrar agora."
    : `${evidenceReady} de ${total} jornada(s) têm evidência suficiente e ${actionable} oferecem próximo passo. ${limitedEvidence ? `${limitedEvidence} dependem de mais dados.` : "Nenhuma depende somente de evidência limitada."}`;
  return { openJourneys: total, actionable, evidenceReady, limitedEvidence, stale, repeated, score, label, explanation };
}
