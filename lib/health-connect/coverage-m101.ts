/** M101 P1 — cobertura de dados observados, não inferência clínica.
 * Os indicadores só usam registros importados, vinculados à conta e pessoa.
 * Ausência de leitura jamais se transforma em zero ou em diagnóstico.
 */
import type { RegistroSaude } from "@/lib/types";
import { METRICS, type HealthMetric } from "@/lib/health-profile/types";
import { CONNECT_METRICS, type ConnectConnection, type ConnectStatus } from "./types";

export type ConnectMetricCoverageM101 = {
  metric: HealthMetric;
  label: string;
  selected: boolean;
  permission: "granted" | "denied" | "unknown";
  samples28: number;
  days7: number;
  days28: number;
  latestDay: string | null;
  ageDays: number | null;
};
export type ConnectCoverageM101 = {
  linked: boolean;
  selectedCount: number;
  permittedCount: number;
  samples28: number;
  metrics: ConnectMetricCoverageM101[];
};

function dayNumber(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  const check = new Date(stamp);
  return check.getUTCFullYear() === year && check.getUTCMonth() + 1 === month && check.getUTCDate() === day
    ? Math.floor(stamp / 86_400_000) : null;
}
function todayKey(now: number): string | null {
  if (!Number.isFinite(now)) return null;
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Relatório privado, determinístico e sem números clínicos/identificadores externos. */
export function projectHealthConnectCoverageM101(
  records: readonly RegistroSaude[],
  connection: ConnectConnection | null | undefined,
  status: ConnectStatus | null | undefined,
  userId: string | null | undefined,
  personId: string,
  now = Date.now()
): ConnectCoverageM101 {
  const linked = Boolean(userId && personId && connection?.user_id === userId && connection.person_id === personId);
  const selected = new Set(linked ? connection!.types.filter(type => CONNECT_METRICS.includes(type)) : []);
  const available = status?.availability === "available";
  const granted = new Set(available ? status!.granted : []);
  const today = todayKey(now);
  const currentDay = today ? dayNumber(today) : null;
  const grouped = new Map<HealthMetric, { ids: Set<string>; days: Set<number>; days7: Set<number>; latest: number | null; latestDay: string | null }>();
  for (const metric of CONNECT_METRICS) grouped.set(metric, { ids: new Set(), days: new Set(), days7: new Set(), latest: null, latestDay: null });
  if (linked && currentDay !== null) {
    for (const row of records) {
      if (row.user_id !== userId || row.person_id !== personId || row.source !== "health_connect") continue;
      const group = grouped.get(row.tipo as HealthMetric);
      if (!group || !selected.has(row.tipo as HealthMetric)) continue;
      const key = row.source_record_id?.trim();
      if (!key || !key.startsWith("com.sec.android.app.shealth:")) continue;
      const day = dayNumber(row.data);
      if (day === null || day > currentDay || day < currentDay - 27) continue;
      const unique = `${row.tipo}|${key}`;
      if (group.ids.has(unique)) continue;
      group.ids.add(unique);
      group.days.add(day);
      if (day >= currentDay - 6) group.days7.add(day);
      if (group.latest === null || day > group.latest) {
        group.latest = day;
        group.latestDay = row.data;
      }
    }
  }
  const metrics = CONNECT_METRICS.map(metric => {
    const group = grouped.get(metric)!;
    return {
      metric,
      label: METRICS[metric].label,
      selected: selected.has(metric),
      permission: !available ? "unknown" as const : granted.has(metric) ? "granted" as const : "denied" as const,
      samples28: group.ids.size,
      days7: group.days7.size,
      days28: group.days.size,
      latestDay: group.latestDay,
      ageDays: group.latest === null || currentDay === null ? null : currentDay - group.latest,
    };
  });
  return {
    linked,
    selectedCount: selected.size,
    permittedCount: metrics.filter(item => item.selected && item.permission === "granted").length,
    samples28: metrics.reduce((total, item) => total + item.samples28, 0),
    metrics,
  };
}
