/** M95: read-only association of canonical dose logs with Brain V5 persisted snapshots.
 * Does not infer historical notifications, dose safety or medical correctness.
 */
import type { DoseLog } from "@/lib/types";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";

export interface ClinicalDoseSafetyEpisode {
  doseId: string;
  medicationId: string;
  date: string;
  quantity: number;
  referenceQuantity: number | null;
  unit: string;
  detectedAt: string;
  severity: string;
  title: string;
  message: string;
  evidence: string[];
  feedback: BrainV5Alert["feedback"];
  reviewedAt: string | null;
  /** This is a stored Brain event, NOT a retrospective clinical diagnosis. */
  source: "stored_brain_v5";
}

function numberInEvidence(line: string, prefix: string): number | null {
  if (!line.startsWith(prefix)) return null;
  const raw = line.slice(prefix.length).trim().match(/^[0-9]+(?:[.,][0-9]+)?/);
  if (!raw) return null;
  const value = Number(raw[0].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Only exact dose IDs/timestamps and matching quantities may be joined. */
export function indexConfirmedDoseSafetyEpisodes(
  logs: readonly DoseLog[],
  ledger: readonly BrainV5Alert[],
  userId: string,
  personId: string,
): Map<string, ClinicalDoseSafetyEpisode> {
  const valid = new Map<string, DoseLog>();
  for (const log of logs) {
    if (log.user_id !== userId || log.person_id !== personId || !log.tomado_em ||
        !validDate(log.data) || !Number.isFinite(log.quantidade) || (log.quantidade ?? 0) <= 0) continue;
    const identity = log.id || log.tomado_em;
    if (identity) valid.set(`quantidade-confirmada-${log.medicamento_id}-${identity}`, log);
  }
  const result = new Map<string, ClinicalDoseSafetyEpisode>();
  for (const alert of ledger) {
    if (alert.person_id !== personId || !alert.insight_id.startsWith("quantidade-confirmada-") ||
        alert.snapshot.entidade_tipo !== "medicamento" || !alert.snapshot.entidade_id) continue;
    const log = valid.get(alert.insight_id);
    if (!log || log.medicamento_id !== alert.snapshot.entidade_id) continue;
    const evidence = alert.snapshot.evidencias || [];
    const storedQuantity = evidence.map(line => numberInEvidence(line, "Quantidade registrada:")).find(v => v !== null);
    if (storedQuantity === undefined || storedQuantity === null || Math.abs(storedQuantity - log.quantidade!) > 0.001) continue;
    const baseline = evidence.map(line => numberInEvidence(line, "Referência interna:")).find(v => v !== null) ?? null;
    const first = evidence.find(line => line.startsWith("Quantidade registrada:")) || "";
    const unit = first.slice("Quantidade registrada:".length).trim().replace(/^[0-9]+(?:[.,][0-9]+)?\s*/, "").slice(0, 32) || "unidade(s)";
    const value: ClinicalDoseSafetyEpisode = {
      doseId: log.id || alert.insight_id,
      medicationId: log.medicamento_id,
      date: log.data,
      quantity: log.quantidade!, referenceQuantity: baseline, unit,
      detectedAt: alert.first_detected_at,
      severity: alert.snapshot.gravidade_seguranca || "atencao",
      title: alert.snapshot.titulo,
      message: alert.snapshot.mensagem,
      evidence: [...evidence],
      feedback: alert.feedback,
      reviewedAt: alert.feedback_updated_at || null,
      source: "stored_brain_v5",
    };
    const previous = result.get(value.doseId);
    if (!previous || previous.detectedAt < value.detectedAt) result.set(value.doseId, value);
  }
  return result;
}
