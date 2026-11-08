/**
 * VAULT M96 / Brain V5.1-A — read-only care episode projection.
 *
 * This selector does NOT diagnose, infer interruptions, alter severity, modify
 * Brain V5 snapshots, persist anything or change notification eligibility.
 * Episodes are temporary presentation groups, not a new clinical authority.
 */
import type { HealthInsightContext } from "@/lib/health-insights";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { indexConfirmedDoseSafetyEpisodes } from "@/lib/clinical-safety-episodes";

export type CareEvidenceNature =
  | "documented_fact"
  | "unconfirmed_gap"
  | "user_reported_state"
  | "pharmacological_risk_hypothesis";

export type CareEvidenceBinding = "exact" | "user_linked" | "insight_snapshot";
export type CareEvidenceRef = {
  nature: CareEvidenceNature;
  binding: CareEvidenceBinding;
  entityType: "dose_log" | "health_record" | "brain_v5_insight";
  /** The source's existing identity; no synthetic clinical event IDs. */
  entityId: string;
  observedAt: string;
  description: string;
};
export type CareEpisodeSignal = {
  key: string;
  insightId: string;
  title: string;
  severity: string;
  /** A Brain interpretation is never promoted to a clinical fact. */
  nature: "unconfirmed_gap" | "pharmacological_risk_hypothesis";
};
export type CareEpisode = {
  schemaVersion: 1;
  /** Deterministic view key, not a durable/persisted clinical episode ID. */
  viewKey: string;
  personId: string;
  medicationIds: string[];
  signalKeys: string[];
  signals: CareEpisodeSignal[];
  evidenceRefs: CareEvidenceRef[];
  startDetectedAt: string;
  endDetectedAt: string;
  severity: string;
  requiresAttention: boolean;
  readOnly: true;
  interpretation: "temporal_association_not_causality";
  limitations: string[];
};

const WINDOW_MS = 14 * 86_400_000;
const MAX_SIGNALS = 96;
const MAX_RECORDS = 24;
const SEVERITY: Record<string, number> = {critica: 4, importante: 3, atencao: 2, informativa: 1};
const severityScore = (value: string) => SEVERITY[value] ?? 0;
function validTimestamp(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !validDay(value.slice(0, 10))) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}
function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const actual = new Date(y, m - 1, d, 12);
  return actual.getFullYear() === y && actual.getMonth() + 1 === m && actual.getDate() === d;
}
function medicationIds(alert: BrainV5Alert, owned: ReadonlySet<string>): string[] {
  const snap = alert.snapshot;
  if (!snap || snap.categoria === "agenda" || snap.kind === "data_quality") return [];
  const ids = [
    ...(snap.entidade_tipo === "medicamento" && snap.entidade_id ? [snap.entidade_id] : []),
    ...(snap.entidade_ids ?? []),
  ];
  return [...new Set(ids.filter((id) => owned.has(id)))].sort();
}
function snapshotNature(alert: BrainV5Alert): CareEpisodeSignal["nature"] {
  return alert.insight_id.startsWith("longitudinal-gap-")
    ? "unconfirmed_gap"
    : "pharmacological_risk_hypothesis";
}
function sharedMedication(a: readonly string[], b: readonly string[]): boolean {
  return a.some((id) => b.includes(id));
}
function displaySeverity(alert: BrainV5Alert): string {
  const severity = alert.snapshot?.gravidade_seguranca;
  return typeof severity === "string" && severityScore(severity) > 0 ? severity : "informativa";
}

/**
 * Compute a conservative view of recent *persisted* Brain V5 signals.
 * - Account + person isolation, no blank owner fallbacks.
 * - Strictly explicit medication identifiers and a bounded 14-day window.
 * - Only 2+ distinct signals generate a group.
 * - No causal chain inferred across unrelated medicines or symptoms.
 * - The M95 verified dose snapshot is the only exact dose-to-alert link.
 */
export function buildCareEpisodesFromLedger(
  context: HealthInsightContext,
  ledger: readonly BrainV5Alert[],
  now = new Date().toISOString(),
): CareEpisode[] {
  const owner = context.userId;
  const person = context.personId;
  const nowMs = validTimestamp(now);
  if (!owner || !person || nowMs === null) return [];
  const ownMedicationIds = new Set(context.medicamentos
    .filter((med) => med.user_id === owner && med.person_id === person && Boolean(med.id))
    .map((med) => med.id!));
  const candidates = ledger.map((alert) => {
    if (alert?.person_id !== person || !alert.snapshot || alert.state === "resolved") return null;
    const observedMs = validTimestamp(alert.last_detected_at);
    if (observedMs === null || observedMs > nowMs || nowMs - observedMs > WINDOW_MS) return null;
    const ids = medicationIds(alert, ownMedicationIds);
    if (!ids.length || !alert.key || !alert.insight_id) return null;
    return {alert, observedMs, ids};
  }).filter((entry): entry is {alert: BrainV5Alert; observedMs: number; ids: string[]} => entry !== null)
    .sort((a, b) => b.observedMs - a.observedMs || a.alert.key.localeCompare(b.alert.key))
    .slice(0, MAX_SIGNALS);

  type Cluster = { rows: typeof candidates; ids: Set<string>; earliest: number; latest: number };
  const clusters: Cluster[] = [];
  for (const candidate of candidates) {
    const target = clusters.find((cluster) =>
      cluster.latest - candidate.observedMs <= WINDOW_MS &&
      sharedMedication(candidate.ids, [...cluster.ids]));
    if (!target) {
      clusters.push({rows: [candidate], ids: new Set(candidate.ids), earliest: candidate.observedMs, latest: candidate.observedMs});
    } else {
      target.rows.push(candidate);
      target.earliest = Math.min(target.earliest, candidate.observedMs);
      candidate.ids.forEach((id) => target.ids.add(id));
    }
  }
  // Proof of an exact alert-dose link comes only from the M95 verified join.
  const safety = indexConfirmedDoseSafetyEpisodes(context.doseLogs, ledger, owner, person);
  const exactDoseByInsight = new Map<string, {doseId: string; date: string; description: string}>();
  for (const log of context.doseLogs) {
    if (log.user_id !== owner || log.person_id !== person || !log.tomado_em || !log.medicamento_id) continue;
    const match = safety.get(log.id || log.tomado_em);
    if (!match || !validDay(log.data)) continue;
    const id = `quantidade-confirmada-${log.medicamento_id}-${log.id || log.tomado_em}`;
    exactDoseByInsight.set(id, {
      doseId: log.id || log.tomado_em,
      date: log.tomado_em,
      description: `Quantidade registrada: ${match.quantity} ${match.unit}. Referência interna: ${match.referenceQuantity ?? "não disponível"}.`,
    });
  }

  const episodes: CareEpisode[] = [];
  for (const cluster of clusters) {
    if (cluster.rows.length < 2) continue;
    const rows = [...cluster.rows].sort((a, b) =>
      severityScore(displaySeverity(b.alert)) - severityScore(displaySeverity(a.alert)) ||
      b.observedMs - a.observedMs || a.alert.key.localeCompare(b.alert.key));
    const sortedKeys = [...new Set(cluster.rows.map((r) => r.alert.key))].sort();
    if (sortedKeys.length < 2) continue;
    const ids = [...cluster.ids].sort();
    const evidenceRefs: CareEvidenceRef[] = [];
    const dedup = new Set<string>();
    const add = (ref: CareEvidenceRef) => {
      const key = `${ref.entityType}:${ref.entityId}`;
      if (!dedup.has(key)) { dedup.add(key); evidenceRefs.push(ref); }
    };
    for (const {alert} of rows) {
      add({nature: snapshotNature(alert), binding: "insight_snapshot", entityType: "brain_v5_insight",
        entityId: alert.key, observedAt: alert.last_detected_at,
        description: alert.snapshot.titulo});
      const verified = exactDoseByInsight.get(alert.insight_id);
      if (verified) add({nature: "documented_fact", binding: "exact", entityType: "dose_log",
        entityId: verified.doseId, observedAt: verified.date, description: verified.description});
    }
    // A user-entered medication link is contextual, not proof of a causal relation.
    const start = new Date(cluster.earliest - WINDOW_MS).toISOString().slice(0, 10);
    const end = new Date(cluster.latest).toISOString().slice(0, 10);
    let shownRecords = 0;
    for (const record of context.registrosSaude) {
      if (shownRecords >= MAX_RECORDS) break;
      if (record.user_id !== owner || record.person_id !== person || !record.id ||
          !record.medicamento_id || !ids.includes(record.medicamento_id) ||
          !validDay(record.data) || record.data < start || record.data > end ||
          (record.categoria !== "sintoma" && record.categoria !== "humor")) continue;
      add({nature: "user_reported_state", binding: "user_linked", entityType: "health_record",
        entityId: record.id, observedAt: `${record.data}T${/^([01]\d|2[0-3]):[0-5]\d$/.test(record.horario || "") ? record.horario : "12:00"}:00`,
        description: record.nome || record.tipo || "Relato pessoal registrado"});
      shownRecords++;
    }
    const severity = displaySeverity(rows[0].alert);
    const signals: CareEpisodeSignal[] = rows.map(({alert}) => ({
      key: alert.key, insightId: alert.insight_id, title: alert.snapshot.titulo,
      severity: displaySeverity(alert), nature: snapshotNature(alert),
    }));
    episodes.push({
      schemaVersion: 1,
      viewKey: `care-episode-view:${person}:${sortedKeys.join("|")}`,
      personId: person,
      medicationIds: ids,
      signalKeys: sortedKeys,
      signals,
      evidenceRefs,
      startDetectedAt: new Date(cluster.earliest).toISOString(),
      endDetectedAt: new Date(cluster.latest).toISOString(),
      severity,
      requiresAttention: rows.some(({alert}) => alert.snapshot.urgencia === "alta" &&
        (displaySeverity(alert) === "critica" || displaySeverity(alert) === "importante")),
      readOnly: true,
      interpretation: "temporal_association_not_causality",
      limitations: [
        "Sinais relacionados no tempo e por medicamento; isto não estabelece relação causal.",
        "A ausência de registro não comprova interrupção ou falta de adesão.",
        "Esta organização não modifica alertas, doses, gravidade ou notificações originais.",
      ],
    });
  }
  return episodes.sort((a, b) =>
    severityScore(b.severity) - severityScore(a.severity) ||
    b.endDetectedAt.localeCompare(a.endDetectedAt) || a.viewKey.localeCompare(b.viewKey));
}
