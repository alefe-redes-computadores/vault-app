import type { RegistroSaude } from "@/lib/types";
import type { HealthMetric } from "./types";
export type MetricPeriod = "today" | "7" | "30" | "all";
/** Civil dates, including the selected day; missing days are never synthesized. */
export function selectMetricHistory(records: RegistroSaude[], type: HealthMetric, today: string, period: MetricPeriod) {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - (period === "7" ? 6 : 29));
  const since = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  return records.filter(r => r.tipo === type && r.data <= today && (period === "all" || (period === "today" ? r.data === today : r.data >= since)))
    .sort((a,b) => `${b.data}T${b.horario || "00:00"}`.localeCompare(`${a.data}T${a.horario || "00:00"}`));
}
