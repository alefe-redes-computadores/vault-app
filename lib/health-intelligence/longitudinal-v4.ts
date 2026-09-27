import type { HealthInsightContext } from "@/lib/health-insights";
import type { ClinicalTimelineEvent } from "@/lib/health-intelligence/clinical-timeline-v4";

export type LongitudinalSignalV4 = {
  id: string;
  kind: "trend" | "change_point" | "persistence" | "recurrence" | "temporal_relation";
  subject: string;
  direction?: "increasing" | "decreasing" | "stable" | "oscillating";
  sample: number;
  observedDays: number;
  confidenceScore: number;
  evidence: string[];
  shadowOnly: true;
};

const DAY = 86_400_000;

function dateMs(value: string): number {
  return new Date(`${value.slice(0, 10)}T12:00:00`).getTime();
}

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function confidence(sample: number, days: number): number {
  return Math.min(100, Math.round(Math.min(1, sample / 10) * 55 + Math.min(1, days / 7) * 45));
}

export function buildLongitudinalSignalsV4(
  context: HealthInsightContext,
  timeline: ClinicalTimelineEvent[]
): LongitudinalSignalV4[] {
  const today = dateMs(context.hoje || new Date().toISOString().slice(0, 10));
  const records = context.registrosSaude.filter((item) => item.data && (item.categoria === "sintoma" || typeof item.intensidade === "number"));
  const groups = new Map<string, typeof records>();

  for (const record of records) {
    const key = record.registro_chave || `${record.categoria || "registro"}:${normalize(record.tipo || record.nome || "geral")}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const signals: LongitudinalSignalV4[] = [];

  for (const [key, items] of groups) {
    const recent = items.filter((item) => {
      const time = dateMs(item.data!);
      const age = Math.floor((today - time) / DAY);
      return age >= 0 && age < 14;
    });
    if (recent.length < 3) continue;

    const days = new Set(recent.map((item) => item.data)).size;
    const values = recent.map((item) => item.intensidade).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const ordered = [...recent].sort((a, b) => String(a.data).localeCompare(String(b.data)));
    const midpoint = Math.floor(ordered.length / 2);
    const first = ordered.slice(0, midpoint).map((i) => i.intensidade).filter((v): v is number => typeof v === "number");
    const second = ordered.slice(midpoint).map((i) => i.intensidade).filter((v): v is number => typeof v === "number");
    const avg = (arr: number[]) => arr.length ? arr.reduce((sum, value) => sum + value, 0) / arr.length : null;
    const a = avg(first);
    const b = avg(second);

    let direction: LongitudinalSignalV4["direction"] = "stable";
    if (a !== null && b !== null && b - a >= 1) direction = "increasing";
    else if (a !== null && b !== null && a - b >= 1) direction = "decreasing";
    else if (values.length >= 4 && Math.max(...values) - Math.min(...values) >= 4) direction = "oscillating";

    signals.push({
      id: `v4-trend:${normalize(key)}`,
      kind: "trend",
      subject: key,
      direction,
      sample: recent.length,
      observedDays: days,
      confidenceScore: confidence(recent.length, days),
      evidence: [
        `${recent.length} registro(s) em ${days} dia(s) nos últimos 14 dias`,
        ...(a !== null && b !== null ? [`Média da primeira metade: ${a.toFixed(1)}; segunda metade: ${b.toFixed(1)}`] : []),
      ],
      shadowOnly: true,
    });

    if (days >= 4) {
      signals.push({
        id: `v4-persistence:${normalize(key)}`,
        kind: "persistence",
        subject: key,
        sample: recent.length,
        observedDays: days,
        confidenceScore: confidence(recent.length, days),
        evidence: [`O mesmo assunto apareceu em ${days} dias distintos na janela de 14 dias.`],
        shadowOnly: true,
      });
    }
  }

  // VAULT_BRAIN_V4_CHANGE_POINT
  // Detecta mudança sustentada entre duas metades da janela.
  // É uma descrição estatística do histórico, nunca diagnóstico.
  for (const [key, items] of groups) {
    const recent = [...items]
      .filter((item) => {
        if (!item.data || typeof item.intensidade !== "number") return false;
        const age = Math.floor((today - dateMs(item.data)) / DAY);
        return age >= 0 && age < 30;
      })
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));

    if (recent.length < 6) continue;

    const midpoint = Math.floor(recent.length / 2);
    const first = recent.slice(0, midpoint);
    const second = recent.slice(midpoint);

    const mean = (values: typeof recent) =>
      values.length
        ? values.reduce((sum: number, item) => sum + Number(item.intensidade || 0), 0) / values.length
        : null;

    const before = mean(first);
    const after = mean(second);

    if (before === null || after === null) continue;

    const delta = after - before;
    if (Math.abs(delta) < 2) continue;

    const days = new Set(recent.map((item) => item.data)).size;

    signals.push({
      id: `v4-change-point:${normalize(key)}`,
      kind: "change_point",
      subject: key,
      direction: delta > 0 ? "increasing" : "decreasing",
      sample: recent.length,
      observedDays: days,
      confidenceScore: confidence(recent.length, days),
      evidence: [
        `Mudança de média observada entre duas partes da janela de 30 dias: ${before.toFixed(1)} → ${after.toFixed(1)}.`,
        `Diferença observada: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} em ${recent.length} registros.`,
      ],
      shadowOnly: true,
    });
  }


  const sos = timeline.filter((event) => event.type === "dose" && (event.facts.doseKind === "sos" || event.facts.doseKind === "extra"));
  const byMedication = new Map<string, typeof sos>();
  for (const event of sos) {
    const key = event.entityId || "sem-medicamento";
    byMedication.set(key, [...(byMedication.get(key) ?? []), event]);
  }
  for (const [medicationId, events] of byMedication) {
    const recent = events.filter((event) => {
      const age = Math.floor((today - dateMs(event.date)) / DAY);
      return age >= 0 && age < 14;
    });
    const days = new Set(recent.map((event) => event.date)).size;
    if (recent.length < 3 || days < 2) continue;
    signals.push({
      id: `v4-recurrence:sos:${medicationId}`,
      kind: "recurrence",
      subject: `medicamento:${medicationId}`,
      sample: recent.length,
      observedDays: days,
      confidenceScore: confidence(recent.length, days),
      evidence: [`${recent.length} dose(s) SOS/extra em ${days} dia(s) nos últimos 14 dias.`],
      shadowOnly: true,
    });
  }

  // VAULT_BRAIN_V4_TEMPORAL_RELATION
  // Associação temporal não implica causalidade.
  // Apenas registra que dois tipos de evento apareceram próximos no tempo.
  const healthEvents = timeline.filter((event) => event.type === "health_record");
  const sosEvents = timeline.filter(
    (event) =>
      event.type === "dose" &&
      (event.facts.doseKind === "sos" || event.facts.doseKind === "extra")
  );

  const relations = new Map();

  for (const record of healthEvents) {
    const recordTime = new Date(record.occurredAt).getTime();
    if (!Number.isFinite(recordTime)) continue;

    for (const dose of sosEvents) {
      const doseTime = new Date(dose.occurredAt).getTime();
      if (!Number.isFinite(doseTime)) continue;

      const distanceHours = Math.abs(recordTime - doseTime) / 3_600_000;
      if (distanceHours > 24) continue;

      const subject = normalize(record.label || record.entityId || "registro");
      const medication = dose.entityId || "sem-medicamento";
      const relationKey = `${subject}:${medication}`;

      const current = relations.get(relationKey) || {
        subject,
        medication,
        pairs: [],
        days: new Set(),
      };

      current.pairs.push({ record, dose, distanceHours });
      current.days.add(record.date);
      relations.set(relationKey, current);
    }
  }

  for (const [relationKey, relation] of relations) {
    if (relation.pairs.length < 3 || relation.days.size < 2) continue;

    const averageHours =
      relation.pairs.reduce((sum: number, pair: { distanceHours: number }) => sum + pair.distanceHours, 0) /
      relation.pairs.length;

    signals.push({
      id: `v4-temporal-relation:${normalize(relationKey)}`,
      kind: "temporal_relation",
      subject: `${relation.subject} ↔ medicamento:${relation.medication}`,
      sample: relation.pairs.length,
      observedDays: relation.days.size,
      confidenceScore: confidence(relation.pairs.length, relation.days.size),
      evidence: [
        `${relation.pairs.length} proximidade(s) temporal(is) em ${relation.days.size} dia(s).`,
        `Distância média entre os eventos: ${averageHours.toFixed(1)} hora(s).`,
        "A proximidade temporal não demonstra que um evento causou o outro.",
      ],
      shadowOnly: true,
    });
  }


  return signals;
}
