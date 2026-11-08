/**
 * VAULT M97 / Brain V5.1-B — evidence-only, read-only cross-domain observations.
 * These are NOT new clinical alerts. No diagnosis, automatic treatment advice,
 * assumptions about missed medication or changes to the V5 ledger/notifications.
 */
import type { HealthInsightContext } from "@/lib/health-insights";
import type { CareEvidenceNature } from "@/lib/health-intelligence/care-episodes";

export type CareCrossEvidence = {
  nature: CareEvidenceNature;
  binding: "exact" | "user_linked";
  entityType: "dose_log" | "health_record" | "pickup";
  entityId: string;
  observedAt: string;
  label: string;
};
export type CareCrossCorrelation = {
  schemaVersion: 1;
  viewKey: string;
  personId: string;
  medicationIds: string[];
  sourceMedicationId: string;
  sourceMedicationName: string;
  windowDays: 14;
  /** Counts of *recorded events*, not a claim about use outside the Vault. */
  evidenceCount: {ignoredDays: number; pickupNotCompleted: number; sosRecent: number; sosPrevious: number; symptoms: number};
  evidence: CareCrossEvidence[];
  /** Reporting of temporal co-occurrence only; never a causal interpretation. */
  interpretation: "documented_temporal_coincidence_only";
  limitations: string[];
  readOnly: true;
};

const DAY_MS = 86_400_000;
const MAX_OUTPUT = 4;
const MAX_EVIDENCE = 36;
const validDay = (day: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toISOString().slice(0, 10) === day;
};
const dayIndex = (day: string): number | null => validDay(day) ? Date.parse(`${day}T00:00:00.000Z`) / DAY_MS : null;
const validTime = (time: unknown): time is string => typeof time === "string" && !Number.isNaN(Date.parse(time));
const linkedTreatment = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  Boolean(a?.length && b?.length && a.some(value => Boolean(value) && b.includes(value)));

/**
 * Require (1) explicit skipped scheduled days OR a recorded failed pickup,
 * (2) user-entered, explicitly related symptoms, and
 * (3) increased NUMBER of *recorded* SOS/extra events in 14d versus prior 14d.
 * Empty history, unconfirmed gaps and zero stock are NOT missed doses.
 */
export function buildCareCrossCorrelations(
  context: HealthInsightContext,
  today: string,
): CareCrossCorrelation[] {
  const user = context.userId, person = context.personId, day = dayIndex(today);
  if (!user || !person || day === null) return [];
  const from = day - 13;
  const baselineFrom = day - 27;
  const inRecent = (date: string) => { const d = dayIndex(date); return d !== null && d >= from && d <= day; };
  const inPrevious = (date: string) => { const d = dayIndex(date); return d !== null && d >= baselineFrom && d < from; };
  const meds = context.medicamentos.filter(m => m.user_id === user && m.person_id === person && Boolean(m.id));
  const byId = new Map(meds.map(m => [m.id!, m] as const));
  const doseGroups = new Map<string, typeof context.doseLogs>();
  for (const entry of context.doseLogs) {
    if (entry.user_id !== user || entry.person_id !== person || !byId.has(entry.medicamento_id) || !entry.id ||
      (!inRecent(entry.data) && !inPrevious(entry.data))) continue;
    const group = doseGroups.get(entry.medicamento_id) || [];
    group.push(entry);
    doseGroups.set(entry.medicamento_id, group);
  }
  const records = context.registrosSaude.filter(r => r.user_id === user && r.person_id === person && r.id &&
    inRecent(r.data) && (r.categoria === "sintoma" || r.categoria === "humor"));
  const pickups = context.retiradas.filter(r => r.user_id === user && r.person_id === person && r.id &&
    r.status === "nao_realizada" && inRecent(r.data) && byId.has(r.medicamento_id));
  const result: CareCrossCorrelation[] = [];
  for (const med of meds) {
    if (!med.id || med.tipo_uso !== "continuo" || med.status === "descontinuado") continue;
    const own = doseGroups.get(med.id) || [];
    const ignored = own.filter(d => inRecent(d.data) && !d.tomado_em && validTime(d.ignorado_em) &&
      d.dose_kind !== "sos" && d.dose_kind !== "extra" && d.dose_kind !== "planned");
    const ignoredDays = new Set(ignored.map(d => d.data)).size;
    const failed = pickups.filter(r => r.medicamento_id === med.id);
    if (ignoredDays < 2 && failed.length === 0) continue;

    // A different medicine can be correlated only by a declared treatment ID.
    const linkedIds = new Set(meds.filter(other => other.id === med.id ||
      linkedTreatment(med.tratamento_ids, other.tratamento_ids)).map(other => other.id!));
    const allSos = [...linkedIds].flatMap(id => doseGroups.get(id) || []).filter(d =>
      Boolean(d.tomado_em) && validTime(d.tomado_em) && (d.dose_kind === "sos" || d.dose_kind === "extra"));
    const recentSos = allSos.filter(d => inRecent(d.data));
    const previousSos = allSos.filter(d => inPrevious(d.data));
    // A modest increase may reflect recording habits, not a medication change.
    if (recentSos.length < 3 || recentSos.length <= previousSos.length ||
      (previousSos.length > 0 && recentSos.length / previousSos.length < 1.5)) continue;

    const symptoms = records.filter(r => r.medicamento_id === med.id ||
      Boolean(r.medicamento_id && linkedIds.has(r.medicamento_id)) ||
      linkedTreatment(med.tratamento_ids, r.tratamento_ids));
    if (symptoms.length < 2) continue;

    const evidence: CareCrossEvidence[] = [];
    const seen = new Set<string>();
    const add = (ref: CareCrossEvidence) => {
      const key = `${ref.entityType}:${ref.entityId}`;
      if (!seen.has(key) && evidence.length < MAX_EVIDENCE) { evidence.push(ref); seen.add(key); }
    };
    for (const item of [...ignored].sort((a,b) => a.data.localeCompare(b.data) || a.id!.localeCompare(b.id!)))
      add({nature:"documented_fact",binding:"exact",entityType:"dose_log",entityId:item.id!,observedAt:item.ignorado_em!,label:"Dose programada marcada como ignorada"});
    for (const item of [...failed].sort((a,b) => a.data.localeCompare(b.data) || a.id!.localeCompare(b.id!)))
      add({nature:"documented_fact",binding:"exact",entityType:"pickup",entityId:item.id!,observedAt:item.data,label:"Retirada registrada como não realizada (data prevista)"});
    for (const item of [...recentSos].sort((a,b) => a.data.localeCompare(b.data) || a.id!.localeCompare(b.id!)))
      add({nature:"documented_fact",binding:"exact",entityType:"dose_log",entityId:item.id!,observedAt:item.tomado_em!,label:"Tomada SOS/extra registrada"});
    for (const item of [...symptoms].sort((a,b) => a.data.localeCompare(b.data) || a.id!.localeCompare(b.id!)))
      add({nature:"user_reported_state",binding:"user_linked",entityType:"health_record",entityId:item.id!,observedAt:item.data,
        label:(item.nome || item.tipo || "Relato pessoal").slice(0,100)});
    evidence.sort((a,b) => a.observedAt.localeCompare(b.observedAt) || a.entityId.localeCompare(b.entityId));
    result.push({
      schemaVersion:1,
      viewKey:`care-cross:${user}:${person}:${med.id}:${from}`,
      personId:person,
      sourceMedicationId:med.id,
      sourceMedicationName:med.nome,
      medicationIds:[...linkedIds].sort(),windowDays:14,
      evidenceCount:{ignoredDays,pickupNotCompleted:failed.length,sosRecent:recentSos.length,sosPrevious:previousSos.length,symptoms:symptoms.length},
      evidence,interpretation:"documented_temporal_coincidence_only",readOnly:true,
      limitations:[
        "Eventos documentados no mesmo período não estabelecem causa ou efeito.",
        "Doses sem registro e estoque zerado não comprovam interrupção ou abstinência.",
        "A comparação SOS mede somente eventos informados no VAULT, não indica dose segura ou orientação de tratamento.",
      ],
    });
  }
  return result.sort((a,b) => b.evidence.length - a.evidence.length || a.viewKey.localeCompare(b.viewKey)).slice(0,MAX_OUTPUT);
}
