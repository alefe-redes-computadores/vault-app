/**
 * CI360 P1 — Projeção factual e somente leitura sobre o contexto canônico do Brain.
 * Não diagnostica, não compara limites farmacológicos e não modifica registros.
 * B05.1: só timestamps de tomadas efetivamente confirmadas entram na janela móvel.
 * B05.2: lacuna de dados nunca vira dose perdida.
 * B05.3: coincidências de calendário não são interações nem causalidade.
 * B05.4: SOS e extra mantêm contagens separadas.
 * B05.5: estoque/receita não são inferidos desta projeção.
 * B05.6: Plano de Segurança permanece acesso voluntário fora do motor.
 */
import type { HealthInsightContext } from "@/lib/health-insights";

export type BrainEvidenceWindowCI360 = {
  state: "ready" | "unavailable";
  reason: string | null;
  asOfISO: string;
  confirmed24h: number;
  scheduled24h: number;
  sos24h: number;
  extra24h: number;
  unspecified24h: number;
  confirmed30d: number;
  ignored30d: number;
  sos30d: number;
  extra30d: number;
  distinctDoseDays30d: number;
  distinctRecordDays30d: number;
  documentedDays30d: number;
  sharedMedicationDays30d: number;
  conflicts30d: number;
  missingTakenClock30d: number;
  futureTakenClock30d: number;
  pendingSync30d: number;
  sevenDays: ReadonlyArray<{ dayISO: string; confirmed: number; record: boolean }>;
  source: "person_scoped_local_snapshot";
};

const MS_DAY = 86_400_000;
function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}
function shiftDay(day: string, delta: number): string {
  return new Date(Date.parse(day + "T12:00:00Z") + delta * MS_DAY).toISOString().slice(0, 10);
}
/** Hora exata com offset explícito; data programada ou horário local solto não comprovam tomada. */
function actualTakeTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
function blank(asOfISO: string, reason: string): BrainEvidenceWindowCI360 {
  return { state:"unavailable", reason, asOfISO, confirmed24h:0, scheduled24h:0, sos24h:0, extra24h:0,
    unspecified24h:0, confirmed30d:0, ignored30d:0, sos30d:0, extra30d:0, distinctDoseDays30d:0,
    distinctRecordDays30d:0, documentedDays30d:0, sharedMedicationDays30d:0, conflicts30d:0,
    missingTakenClock30d:0, futureTakenClock30d:0, pendingSync30d:0, sevenDays:[], source:"person_scoped_local_snapshot" };
}

export function buildBrainEvidenceWindowCI360(
  context: HealthInsightContext | null | undefined,
  asOfISO: string,
): BrainEvidenceWindowCI360 {
  const now = Date.parse(asOfISO);
  if (!context?.userId || !context.personId || !validDay(context.hoje) ||
      typeof asOfISO !== "string" || !Number.isFinite(now)) {
    return blank(asOfISO, "Pessoa, data clínica ou horário de referência indisponível; nenhuma conclusão será inferida.");
  }
  const userId = context.userId!;
  const personId = context.personId;
  const hoje = context.hoje!;
  const first30 = shiftDay(hoje, -29);
  const first7 = shiftDay(hoje, -6);
  const trackedMedIds = new Set(context.medicamentos
    .filter(m => m.user_id === userId && m.person_id === personId && Boolean(m.id))
    .map(m => m.id!));
  const recordsDays = new Set<string>();
  const seenRecordIds = new Set<string>();
  for (const record of context.registrosSaude) {
    if (record.user_id !== userId || record.person_id !== personId ||
        !record.id || seenRecordIds.has(record.id) || !validDay(record.data) ||
        record.data < first30 || record.data > hoje) continue;
    seenRecordIds.add(record.id);
    recordsDays.add(record.data);
  }
  const doseDays = new Set<string>();
  const medsByDay = new Map<string, Set<string>>();
  const takenByDay = new Map<string, number>();
  const seenDoseIds = new Set<string>();
  const result = blank(asOfISO, "");
  result.state = "ready";
  result.reason = null;
  for (const log of context.doseLogs) {
    if (log.user_id !== userId || log.person_id !== personId || !log.id ||
        !trackedMedIds.has(log.medicamento_id) || seenDoseIds.has(log.id)) continue;
    seenDoseIds.add(log.id);
    const recordedDay = validDay(log.data) && log.data >= first30 && log.data <= hoje;
    const taken = Boolean(log.tomado_em);
    const ignored = Boolean(log.ignorado_em);
    if (!recordedDay && !taken) continue;
    if (taken && ignored) {
      if (recordedDay) result.conflicts30d++;
      continue; // Conflito não comprova tomada nem ignorada.
    }
    if (log.dose_kind === "planned") continue; // Agendamento não é consumo.
    if (ignored && recordedDay) {
      result.ignored30d++;
      doseDays.add(log.data);
      continue;
    }
    if (!taken) continue;
    const actual = actualTakeTimestamp(log.tomado_em);
    if (recordedDay && actual === null) result.missingTakenClock30d++;
    if (actual !== null && actual > now) {
      if (recordedDay) result.futureTakenClock30d++;
      continue; // Futuro não é tomada já realizada.
    }
    if (recordedDay && actual !== null) {
      result.confirmed30d++;
      doseDays.add(log.data);
      takenByDay.set(log.data, (takenByDay.get(log.data) || 0) + 1);
      const medIds = medsByDay.get(log.data) || new Set<string>();
      medIds.add(log.medicamento_id);
      medsByDay.set(log.data, medIds);
      if (log.dose_kind === "sos") result.sos30d++;
      if (log.dose_kind === "extra") result.extra30d++;
      if (log.synced === false) result.pendingSync30d++;
    }
    if (actual === null || actual > now || actual < now - MS_DAY) continue;
    result.confirmed24h++;
    if (log.dose_kind === "sos") result.sos24h++;
    else if (log.dose_kind === "extra") result.extra24h++;
    else if (log.dose_kind === "scheduled") result.scheduled24h++;
    else result.unspecified24h++;
  }
  result.distinctDoseDays30d = doseDays.size;
  result.distinctRecordDays30d = recordsDays.size;
  result.documentedDays30d = new Set([...doseDays, ...recordsDays]).size;
  result.sharedMedicationDays30d = [...medsByDay.values()].filter(ids => ids.size >= 2).length;
  result.sevenDays = Array.from({length:7}, (_,i) => {
    const dayISO = shiftDay(first7, i);
    return { dayISO, confirmed: takenByDay.get(dayISO) || 0, record: recordsDays.has(dayISO) };
  });
  return result;
}
