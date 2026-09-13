import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";

export type ClinicalReportPeriod = 7 | 30 | 90;

export type ClinicalReport = {
  periodDays: ClinicalReportPeriod;
  current: { start: string; end: string };
  previous: { start: string; end: string };
  coverage: { currentDays: number; previousDays: number };
  totals: {
    records: number;
    symptoms: number;
    measurements: number;
    hydrationRecords: number;
    scheduledTaken: number;
    sosTaken: number;
    extraTaken: number;
    ignored: number;
  };
  comparison: {
    recordsDelta: number | null;
    symptomDelta: number | null;
    sosExtraDelta: number | null;
  };
  symptoms: Array<{ label: string; occurrences: number; days: number; averageIntensity: number | null }>;
  medications: Array<{ id: string; name: string; dosage?: string; scheduledTaken: number; sosTaken: number; extraTaken: number; ignored: number }>;
  activeTreatments: Array<{ id: string; name: string; startedAt?: string }>;
  insights: HealthInsight[];
  dataQuality: {
    discardedRecords: number;
    inconsistencies: string[];
    comparable: boolean;
  };
};

const DAY = 86_400_000;

function normalize(value: unknown): string {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const result = new Date(year, month - 1, day);
  return Number.isNaN(result.getTime()) ? null : result;
}

function iso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shift(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function within(value: string | undefined, start: Date, end: Date): boolean {
  const date = parseDate(value);
  return Boolean(date && date >= start && date <= end);
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function isHydration(record: HealthInsightContext["registrosSaude"][number]): boolean {
  const text = normalize(`${record.categoria} ${record.tipo} ${record.nome} ${record.registro_chave}`);
  return text.includes("hidrat") || text.includes("agua");
}

function isSymptom(record: HealthInsightContext["registrosSaude"][number]): boolean {
  return record.categoria === "sintoma" || typeof record.intensidade === "number";
}

function isTaken(dose: HealthInsightContext["doseLogs"][number]): boolean {
  return Boolean(dose.tomado_em);
}

function calculateWindow(context: HealthInsightContext, start: Date, end: Date) {
  const records = context.registrosSaude.filter((item) => within(item.data, start, end));
  const doses = context.doseLogs.filter((item) => within(item.data, start, end));
  return {
    records,
    doses,
    symptoms: records.filter(isSymptom),
    coverage: new Set([...records.map((item) => item.data), ...doses.map((item) => item.data)].filter(Boolean)).size,
    sosExtra: doses.filter((item) => isTaken(item) && (item.dose_kind === "sos" || item.dose_kind === "extra")).length,
  };
}

export function buildClinicalReport(context: HealthInsightContext, allInsights: HealthInsight[], periodDays: ClinicalReportPeriod, todayValue?: string): ClinicalReport {
  const today = parseDate(todayValue || context.hoje) || new Date();
  const currentStart = shift(today, -(periodDays - 1));
  const previousEnd = shift(currentStart, -1);
  const previousStart = shift(previousEnd, -(periodDays - 1));
  const current = calculateWindow(context, currentStart, today);
  const previous = calculateWindow(context, previousStart, previousEnd);

  const symptomGroups = new Map<string, typeof current.symptoms>();
  for (const record of current.symptoms) {
    const key = record.registro_chave || `${record.categoria}:${normalize(record.tipo || record.nome)}`;
    symptomGroups.set(key, [...(symptomGroups.get(key) || []), record]);
  }
  const symptoms = Array.from(symptomGroups.values()).map((items) => {
    const values = items.map((item) => item.intensidade).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return {
      label: items[0].nome || items[0].tipo || "Sintoma",
      occurrences: items.length,
      days: new Set(items.map((item) => item.data)).size,
      averageIntensity: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null,
    };
  }).sort((a, b) => b.occurrences - a.occurrences);

  const medicationById = new Map(context.medicamentos.map((item) => [item.id, item]));
  const medicationGroups = new Map<string, typeof current.doses>();
  for (const dose of current.doses) medicationGroups.set(dose.medicamento_id, [...(medicationGroups.get(dose.medicamento_id) || []), dose]);
  const medications = Array.from(medicationGroups.entries()).map(([id, doses]) => {
    const medication = medicationById.get(id);
    return {
      id,
      name: medication?.nome || "Medicamento removido",
      dosage: medication?.dosagem,
      scheduledTaken: doses.filter((item) => isTaken(item) && item.dose_kind !== "sos" && item.dose_kind !== "extra").length,
      sosTaken: doses.filter((item) => isTaken(item) && item.dose_kind === "sos").length,
      extraTaken: doses.filter((item) => isTaken(item) && item.dose_kind === "extra").length,
      ignored: doses.filter((item) => Boolean(item.ignorado_em)).length,
    };
  }).sort((a, b) => (b.sosTaken + b.extraTaken + b.scheduledTaken) - (a.sosTaken + a.extraTaken + a.scheduledTaken));

  const scheduledTaken = current.doses.filter((item) => isTaken(item) && item.dose_kind !== "sos" && item.dose_kind !== "extra").length;
  const sosTaken = current.doses.filter((item) => isTaken(item) && item.dose_kind === "sos").length;
  const extraTaken = current.doses.filter((item) => isTaken(item) && item.dose_kind === "extra").length;
  const compatibleInsights = allInsights.filter((item) =>
    item.kind === "pattern" &&
    item.confianca !== "baixa" &&
    (!item.periodoDias || item.periodoDias <= periodDays)
  ).slice(0, 6);
  const discardedRecords = [
    ...context.registrosSaude.map((item) => item.data),
    ...context.doseLogs.map((item) => item.data),
  ].filter((value) => Boolean(value) && !parseDate(value)).length;
  const inconsistencies = allInsights
    .filter((item) => item.kind === "data_quality")
    .map((item) => item.mensagem)
    .filter(Boolean)
    .slice(0, 5);

  return {
    periodDays,
    current: { start: iso(currentStart), end: iso(today) },
    previous: { start: iso(previousStart), end: iso(previousEnd) },
    coverage: { currentDays: current.coverage, previousDays: previous.coverage },
    totals: {
      records: current.records.length,
      symptoms: current.symptoms.length,
      measurements: current.records.filter((item) => item.categoria === "medicao" && !isHydration(item)).length,
      hydrationRecords: current.records.filter(isHydration).length,
      scheduledTaken,
      sosTaken,
      extraTaken,
      ignored: current.doses.filter((item) => Boolean(item.ignorado_em)).length,
    },
    comparison: {
      recordsDelta: percentDelta(current.records.length, previous.records.length),
      symptomDelta: percentDelta(current.symptoms.length, previous.symptoms.length),
      sosExtraDelta: percentDelta(sosTaken + extraTaken, previous.sosExtra),
    },
    symptoms,
    medications,
    activeTreatments: context.tratamentos.filter((item) => item.status === "ativo").map((item) => ({ id: item.id || item.nome, name: item.nome, startedAt: item.data_inicio })),
    insights: compatibleInsights,
    dataQuality: {
      discardedRecords,
      inconsistencies,
      comparable: previous.coverage > 0,
    },
  };
}
