import type {
  ActiveProbe,
  ActiveProbeEvent,
  ActiveProbeEventType,
  ActiveProbePreferences,
  ActiveProbeResponse,
  ActiveProbeStatus,
} from "./types";

const FINAL = new Set<ActiveProbeStatus>(["answered", "dismissed", "expired", "cancelled"]);
const TRANSITIONS: Record<ActiveProbeStatus, readonly ActiveProbeStatus[]> = {
  scheduled: ["eligible", "expired", "cancelled"],
  eligible: ["shown", "expired", "cancelled"],
  shown: ["answered", "dismissed", "snoozed", "expired", "cancelled"],
  snoozed: ["eligible", "expired", "cancelled"],
  answered: [], dismissed: [], expired: [], cancelled: [],
};

const validIso = (value: string) => Number.isFinite(Date.parse(value));
const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && validIso(`${value}T12:00:00Z`);
const cleanId = (value: string) => value.trim().slice(0, 256);

export function validateActiveProbeEvent(input: ActiveProbeEvent): ActiveProbeEvent {
  const event = {
    ...input,
    event_id: cleanId(input.event_id),
    user_id: cleanId(input.user_id),
    person_id: cleanId(input.person_id),
    source_entity_type: cleanId(input.source_entity_type),
    source_entity_id: cleanId(input.source_entity_id),
    medication_id: input.medication_id ? cleanId(input.medication_id) : undefined,
    acquisition_id: input.acquisition_id ? cleanId(input.acquisition_id) : undefined,
    evidence_refs: input.evidence_refs.slice(0, 20).map(ref => ({type: cleanId(ref.type), id: cleanId(ref.id)})),
  };
  if (!event.event_id || !event.user_id || !event.person_id || !event.source_entity_type || !event.source_entity_id)
    throw new Error("Evento de sondagem sem escopo ou origem.");
  if (!validDay(event.event_date) || !validIso(event.confirmed_at)) throw new Error("Evento de sondagem com data inválida.");
  if (event.event_type === "manufacturer_lot_started" && (!event.acquisition_id || event.source !== "user_confirmed"))
    throw new Error("Início de lote exige aquisição e confirmação explícita.");
  if (event.event_type === "confirmed_sos_use" && event.source !== "persisted_record")
    throw new Error("Uso SOS exige registro persistido confirmado.");
  return event;
}

export function activeProbeIdempotencyKey(event: ActiveProbeEvent, checkpoint: string): string {
  const safeCheckpoint = checkpoint.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32);
  if (!safeCheckpoint) throw new Error("Checkpoint inválido.");
  return ["probe", "v1", event.user_id, event.person_id, event.event_type, event.source_entity_id, event.event_id, safeCheckpoint].join(":");
}

export function preferenceAllows(eventType: ActiveProbeEventType, preferences: ActiveProbePreferences): boolean {
  if (!preferences.enabled || preferences.consentVersion < 1) return false;
  return eventType === "manufacturer_lot_started" ? preferences.manufacturer
    : eventType === "confirmed_sos_use" ? preferences.confirmedSos
    : eventType === "temporary_course_ended" ? preferences.temporaryCourse
    : preferences.fourAxes;
}

export function canTransitionProbe(from: ActiveProbeStatus, to: ActiveProbeStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionProbe(probe: ActiveProbe, to: ActiveProbeStatus, at: string): ActiveProbe {
  if (!validIso(at)) throw new Error("Data de transição inválida.");
  if (!canTransitionProbe(probe.status, to)) throw new Error(`Transição inválida: ${probe.status} → ${to}.`);
  return {...probe, status: to, updated_at: new Date(at).toISOString()};
}

export function answerProbe(probe: ActiveProbe, response: ActiveProbeResponse): ActiveProbe {
  if (probe.status !== "shown" || response.probe_id !== probe.id || response.user_id !== probe.user_id || response.person_id !== probe.person_id || !validIso(response.answered_at) || !response.option_key.trim())
    throw new Error("Sondagem indisponível para resposta.");
  return {
    ...probe,
    status: "answered",
    sync_state: "local_pending",
    sync_error_code: undefined,
    updated_at: new Date(response.answered_at).toISOString(),
  };
}

export function isProbeDue(probe: ActiveProbe, now: string): boolean {
  const nowMs = Date.parse(now), due = Date.parse(probe.due_at), expires = Date.parse(probe.expires_at);
  return Number.isFinite(nowMs) && Number.isFinite(due) && Number.isFinite(expires) &&
    !FINAL.has(probe.status) && nowMs >= due && nowMs < expires &&
    (!probe.snoozed_until || nowMs >= Date.parse(probe.snoozed_until));
}

export function selectNextProbe(probes: readonly ActiveProbe[], userId: string, personId: string, now: string): ActiveProbe | null {
  const rank: Record<ActiveProbeEventType, number> = {
    temporary_course_ended: 0,
    confirmed_sos_use: 1,
    manufacturer_lot_started: 2,
    axis_shift_eligible: 3,
  };
  return probes.filter(probe => probe.user_id === userId && probe.person_id === personId && isProbeDue(probe, now))
    .sort((a,b) => rank[a.trigger_type] - rank[b.trigger_type] || a.due_at.localeCompare(b.due_at) || a.id.localeCompare(b.id))[0] ?? null;
}

export function withinFrequencyLimit(probes: readonly ActiveProbe[], userId: string, personId: string, now: string, max = 2): boolean {
  const nowMs = Date.parse(now), since = nowMs - 7 * 86400000;
  if (!Number.isFinite(nowMs)) return false;
  const count = probes.filter(probe => probe.user_id === userId && probe.person_id === personId &&
    Date.parse(probe.created_at) >= since && Date.parse(probe.created_at) <= nowMs && probe.status !== "cancelled").length;
  return count < max;
}
