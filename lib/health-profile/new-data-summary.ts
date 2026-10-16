import type { RegistroSaude } from "@/lib/types";
import { METRICS, type HealthMetric } from "./types";

export type NewHealthDataGroup = { type: HealthMetric; count: number; latest: RegistroSaude };

export function healthRecordArrivalKey(record: RegistroSaude): string | null {
  if (record.source !== "health_connect" && record.source !== "samsung_manual") return null;
  const identity = record.source_record_id || record.id;
  return identity ? `${record.source}:${identity}` : null;
}

export function selectNewHealthData(records: RegistroSaude[], seen: ReadonlySet<string>, now = new Date()): { keys: string[]; groups: NewHealthDataGroup[] } {
  const cutoff = now.getTime() - 36 * 60 * 60 * 1000;
  const selected = records.filter(record => {
    const key = healthRecordArrivalKey(record);
    if (!key || seen.has(key) || !Object.prototype.hasOwnProperty.call(METRICS, record.tipo)) return false;
    const arrived = Date.parse(record.updated_at || record.created_at || `${record.data}T${record.horario || "00:00"}`);
    return Number.isFinite(arrived) && arrived >= cutoff && arrived <= now.getTime() + 60_000;
  });
  const map = new Map<HealthMetric, NewHealthDataGroup>();
  for (const record of selected) {
    const type = record.tipo as HealthMetric;
    const current = map.get(type);
    if (!current) map.set(type,{type,count:1,latest:record});
    else {
      current.count++;
      const currentTime = `${current.latest.data}T${current.latest.horario || "00:00"}`;
      const nextTime = `${record.data}T${record.horario || "00:00"}`;
      if (nextTime > currentTime) current.latest = record;
    }
  }
  return { keys:selected.map(healthRecordArrivalKey).filter((key):key is string=>Boolean(key)), groups:[...map.values()] };
}

export function compactSeenHealthData(previous: string[], added: string[], limit=300): string[] {
  return [...new Set([...previous,...added])].slice(-Math.max(1,limit));
}
