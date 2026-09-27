import type { HealthInsightContext } from "@/lib/health-insights";

export type ClinicalTimelineEventType =
  | "dose"
  | "health_record"
  | "appointment"
  | "exam"
  | "pickup"
  | "renewal"
  | "treatment";

export type ClinicalTimelineEvent = {
  id: string;
  personId: string;
  type: ClinicalTimelineEventType;
  occurredAt: string;
  date: string;
  entityType: string;
  entityId?: string;
  relatedEntityIds: string[];
  label: string;
  facts: Record<string, string | number | boolean | null>;
  source: string;
};

function dateOnly(value?: string | null): string | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function isoAt(date?: string | null, time?: string | null): string | null {
  const day = dateOnly(date);
  if (!day) return null;
  const safeTime = /^\d{2}:\d{2}/.test(String(time ?? "")) ? String(time).slice(0, 5) : "12:00";
  return `${day}T${safeTime}:00`;
}

function eventId(type: string, id: unknown, fallback: string): string {
  return `${type}:${String(id ?? fallback)}`;
}

function safeFacts(input: Record<string, unknown>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) =>
      value === null || ["string", "number", "boolean"].includes(typeof value)
    )
  ) as Record<string, string | number | boolean | null>;
}

function related(...ids: Array<unknown>): string[] {
  return Array.from(new Set(ids.flatMap((value) =>
    Array.isArray(value) ? value : [value]
  ).map((value) => String(value ?? "").trim()).filter(Boolean)));
}

export function buildCanonicalClinicalTimeline(
  context: HealthInsightContext
): ClinicalTimelineEvent[] {
  const personId = context.personId;
  const events: ClinicalTimelineEvent[] = [];

  for (const dose of context.doseLogs) {
    const occurredAt = dose.tomado_em || isoAt(dose.data, dose.horario);
    const date = dateOnly(dose.tomado_em || dose.data);
    if (!occurredAt || !date) continue;
    events.push({
      id: eventId("dose", dose.id, `${dose.medicamento_id}:${occurredAt}`),
      personId,
      type: "dose",
      occurredAt,
      date,
      entityType: "medicamento",
      entityId: dose.medicamento_id,
      relatedEntityIds: related(dose.medicamento_id),
      label: dose.dose_kind === "sos" ? "Dose SOS" : dose.dose_kind === "extra" ? "Dose extra" : "Dose programada",
      facts: safeFacts({
        doseKind: dose.dose_kind ?? "scheduled",
        quantidade: dose.quantidade ?? null,
        tomada: Boolean(dose.tomado_em),
        ignorada: Boolean(dose.ignorado_em),
      }),
      source: "doseLogs",
    });
  }

  for (const record of context.registrosSaude) {
    const occurredAt = isoAt(record.data, record.horario);
    const date = dateOnly(record.data);
    if (!occurredAt || !date) continue;
    const raw = record as typeof record & { tratamento_ids?: string[]; tratamentos_ids?: string[]; cid_ids?: string[]; cids_ids?: string[] };
    events.push({
      id: eventId("health_record", record.id, `${record.registro_chave ?? record.tipo}:${occurredAt}`),
      personId,
      type: "health_record",
      occurredAt,
      date,
      entityType: "registro",
      entityId: record.id,
      relatedEntityIds: related(raw.tratamento_ids, raw.tratamentos_ids, raw.cid_ids, raw.cids_ids),
      label: record.nome || record.tipo || "Registro de saúde",
      facts: safeFacts({
        categoria: record.categoria ?? null,
        tipo: record.tipo ?? null,
        intensidade: record.intensidade ?? null,
      }),
      source: "registros_saude",
    });
  }

  for (const item of context.consultas) {
    const date = dateOnly(item.data);
    const occurredAt = isoAt(item.data, item.horario);
    if (!date || !occurredAt) continue;
    events.push({
      id: eventId("appointment", item.id, occurredAt),
      personId,
      type: "appointment",
      occurredAt,
      date,
      entityType: "consulta",
      entityId: item.id,
      relatedEntityIds: related((item as typeof item & { tratamento_id?: string; cid_id?: string }).tratamento_id, (item as typeof item & { cid_id?: string }).cid_id),
      label: "Consulta",
      facts: safeFacts({ status: (item as typeof item & { status?: string }).status ?? null }),
      source: "consultas",
    });
  }

  for (const item of context.exames) {
    const raw = item as typeof item & { data?: string; data_exame?: string; horario?: string; status?: string; tratamento_id?: string; cid_id?: string; nome?: string };
    const sourceDate = raw.data_exame || raw.data;
    const date = dateOnly(sourceDate);
    const occurredAt = isoAt(sourceDate, raw.horario);
    if (!date || !occurredAt) continue;
    events.push({
      id: eventId("exam", item.id, occurredAt),
      personId,
      type: "exam",
      occurredAt,
      date,
      entityType: "exame",
      entityId: item.id,
      relatedEntityIds: related(raw.tratamento_id, raw.cid_id),
      label: raw.nome || "Exame",
      facts: safeFacts({ status: raw.status ?? null }),
      source: "exames",
    });
  }

  for (const item of context.retiradas) {
    const raw = item as typeof item & { data_retirada?: string; data_agendada?: string; data?: string; horario?: string; status?: string; medicamento_id?: string; renovacao_id?: string };
    const sourceDate = raw.data_retirada || raw.data_agendada || raw.data;
    const date = dateOnly(sourceDate);
    const occurredAt = isoAt(sourceDate, raw.horario);
    if (!date || !occurredAt) continue;
    events.push({
      id: eventId("pickup", item.id, occurredAt),
      personId,
      type: "pickup",
      occurredAt,
      date,
      entityType: "retirada",
      entityId: item.id,
      relatedEntityIds: related(raw.medicamento_id, raw.renovacao_id),
      label: "Retirada",
      facts: safeFacts({ status: raw.status ?? null }),
      source: "retiradas",
    });
  }

  for (const item of context.renovacoes) {
    const raw = item as typeof item & { data?: string; data_renovacao?: string; data_receita?: string; medicamento_id?: string; status?: string };
    const sourceDate = raw.data_renovacao || raw.data_receita || raw.data;
    const date = dateOnly(sourceDate);
    const occurredAt = isoAt(sourceDate);
    if (!date || !occurredAt) continue;
    events.push({
      id: eventId("renewal", item.id, occurredAt),
      personId,
      type: "renewal",
      occurredAt,
      date,
      entityType: "renovacao",
      entityId: item.id,
      relatedEntityIds: related(raw.medicamento_id),
      label: "Renovação",
      facts: safeFacts({ status: raw.status ?? null }),
      source: "renovacoes",
    });
  }

  for (const item of context.tratamentos) {
    const raw = item as typeof item & { data_inicio?: string; inicio?: string; status?: string; nome?: string };
    const sourceDate = raw.data_inicio || raw.inicio;
    const date = dateOnly(sourceDate);
    const occurredAt = isoAt(sourceDate);
    if (!date || !occurredAt) continue;
    events.push({
      id: eventId("treatment", item.id, occurredAt),
      personId,
      type: "treatment",
      occurredAt,
      date,
      entityType: "tratamento",
      entityId: item.id,
      relatedEntityIds: [],
      label: raw.nome || "Tratamento",
      facts: safeFacts({ status: raw.status ?? null }),
      source: "tratamentos",
    });
  }

  return events
    .filter((event) => event.personId === personId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
}

export function timelineWindow(
  timeline: ClinicalTimelineEvent[],
  endDate: string,
  days: number
): ClinicalTimelineEvent[] {
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const start = end - Math.max(1, days) * 86_400_000;
  return timeline.filter((event) => {
    const time = new Date(event.occurredAt).getTime();
    return Number.isFinite(time) && time >= start && time <= end;
  });
}
