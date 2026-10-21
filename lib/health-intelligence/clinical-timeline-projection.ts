import type {
  ClinicalTimelineEvent,
  ClinicalTimelineEventType,
} from "./clinical-timeline-v4";

export const CLINICAL_TIMELINE_TYPE_LABEL: Record<ClinicalTimelineEventType, string> = {
  dose: "Dose",
  health_record: "Registro",
  appointment: "Consulta",
  exam: "Exame",
  pickup: "Retirada",
  renewal: "Receita / renovação",
  treatment: "Tratamento",
};

const DAY_MS = 86_400_000;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function clinicalCivilTime(value: string): number | null {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const time = new Date(year, month - 1, day, 12).getTime();
  return Number.isFinite(time) ? time : null;
}

export function clinicalTimelineEventDetail(event: ClinicalTimelineEvent): string {
  const status = typeof event.facts.status === "string" ? event.facts.status.replaceAll("_", " ") : "";
  const label = CLINICAL_TIMELINE_TYPE_LABEL[event.type];
  return status ? `${label} · ${status}` : label;
}

export function clinicalTimelineRoute(event: ClinicalTimelineEvent): string | null {
  if (!event.entityId) return null;
  const id = encodeURIComponent(event.entityId);
  switch (event.entityType) {
    case "consulta": return `/saude/consultas/detalhes?id=${id}`;
    case "exame": return `/saude/exames/detalhes?id=${id}`;
    case "retirada": return `/saude/retiradas/detalhes?id=${id}`;
    case "renovacao": return `/saude/renovacao/detalhes?id=${id}`;
    case "tratamento": return `/saude/tratamentos/detalhes?id=${id}`;
    case "registro": return `/saude/registros/detalhes?id=${id}`;
    case "medicamento": return `/saude/medicamentos/detalhes?id=${id}`;
    default: return null;
  }
}

export function buildClinicalTimelineProjection({
  timeline,
  type,
  period,
  query,
  today,
}: {
  timeline: ClinicalTimelineEvent[];
  type: "all" | ClinicalTimelineEventType;
  period: 30 | 90 | 3650;
  query: string;
  today: string;
}) {
  const todayTime = clinicalCivilTime(today) ?? Date.now();
  const cutoff = todayTime - (period - 1) * DAY_MS;
  const needle = normalize(query);
  const events: ClinicalTimelineEvent[] = [];
  const grouped = new Map<string, ClinicalTimelineEvent[]>();
  const categories = new Set<ClinicalTimelineEventType>();
  const routeById = new Map<string, string>();
  let navigable = 0;

  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const event = timeline[index];
    if (type !== "all" && event.type !== type) continue;
    if (period !== 3650 && (clinicalCivilTime(event.date) ?? -Infinity) < cutoff) continue;
    if (needle) {
      const searchable = `${event.label} ${CLINICAL_TIMELINE_TYPE_LABEL[event.type]} ${event.source} ${clinicalTimelineEventDetail(event)}`;
      if (!normalize(searchable).includes(needle)) continue;
    }

    events.push(event);
    const day = grouped.get(event.date);
    if (day) day.push(event);
    else grouped.set(event.date, [event]);
    categories.add(event.type);
    const route = clinicalTimelineRoute(event);
    if (route) {
      routeById.set(event.id, route);
      navigable += 1;
    }
  }

  return {
    events,
    groups: [...grouped.entries()] as Array<[string, ClinicalTimelineEvent[]]>,
    routeById,
    stats: { days: grouped.size, categories: categories.size, navigable },
  };
}
