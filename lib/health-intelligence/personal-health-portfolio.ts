import type { HealthInsightContext } from "@/lib/health-insights";

export type PersonalHealthCoverage = "none" | "limited" | "recent";
export type PersonalHealthPortfolio = {
  records7d: number;
  records30d: number;
  activeDays30d: number;
  metricsObserved: number;
  deviceRecords30d: number;
  manualRecords30d: number;
  latestDate: string | null;
  coverage: PersonalHealthCoverage;
  note: string;
};

const validDay = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const subtractDays = (day: string, amount: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - amount);
  return date.toISOString().slice(0, 10);
};

/** One scoped pass over records already loaded by the shared Brain context. */
export function buildPersonalHealthPortfolio(context: HealthInsightContext): PersonalHealthPortfolio {
  const today = context.hoje || "";
  const empty: PersonalHealthPortfolio = { records7d:0, records30d:0, activeDays30d:0, metricsObserved:0, deviceRecords30d:0, manualRecords30d:0, latestDate:null, coverage:"none", note:"Sem registros suficientes para resumir cobertura." };
  if (!context.personId || !context.userId || !validDay(today)) return empty;
  const from7 = subtractDays(today, 6), from30 = subtractDays(today, 29);
  const days = new Set<string>(), metrics = new Set<string>(), seen = new Set<string>();
  let records7d=0, records30d=0, deviceRecords30d=0, manualRecords30d=0, latestDate:string|null=null;
  for (const record of context.registrosSaude) {
    if (record.person_id !== context.personId || record.user_id !== context.userId || !validDay(record.data) || record.data > today) continue;
    const identity = record.source_record_id ? `${record.source || ""}:${record.device_id || ""}:${record.source_record_id}` : record.id || `${record.tipo}:${record.data}:${record.horario || ""}:${record.valor_numerico ?? ""}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    if (!latestDate || record.data > latestDate) latestDate = record.data;
    if (record.data >= from7) records7d += 1;
    if (record.data < from30) continue;
    records30d += 1; days.add(record.data); metrics.add(record.tipo);
    if (record.source === "health_connect" || record.source === "samsung_manual" || record.device_id) deviceRecords30d += 1;
    else manualRecords30d += 1;
  }
  const coverage: PersonalHealthCoverage = records30d === 0 ? "none" : days.size >= 5 && metrics.size >= 2 ? "recent" : "limited";
  return { records7d, records30d, activeDays30d:days.size, metricsObserved:metrics.size, deviceRecords30d, manualRecords30d, latestDate, coverage,
    note:"Cobertura descreve os registros disponíveis; não mede saúde, adesão ou qualidade clínica." };
}
