import { classifyClinicalSchedule } from "@/lib/health-intelligence/clinical-time";

export type TimelineStatus = "todos" | "tomados" | "pendentes" | "ignorados";
export type TimelinePeriod = "todos" | "manha" | "tarde" | "noite";
export type TimelineGroupKey = "agora" | "atrasadas" | "depois" | "avulsas" | "revisao" | "concluidas" | "ignoradas" | "manha" | "tarde" | "noite";

export type TimelineItemShape = {
  horario: string;
  tomada: boolean;
  ignorada: boolean;
  isDataConflict?: boolean;
  isExpectedUnconfirmed?: boolean;
  isAvulsa?: boolean;
  isSintoma?: boolean;
  doseKind?: "sos" | "extra" | "planned";
};

export const timelinePeriod = (time: string): Exclude<TimelinePeriod, "todos"> => {
  const hour = Number(String(time || "00:00").split(":")[0]);
  return hour >= 5 && hour < 12 ? "manha" : hour >= 12 && hour < 18 ? "tarde" : "noite";
};

/** M24: one pass for status+period, retaining the old filtering semantics. */
export function filterTimelineItems<T extends TimelineItemShape>(items: T[], status: TimelineStatus, period: TimelinePeriod, isToday: boolean): T[] {
  if (status === "todos" && period === "todos") return items;
  const filtered: T[] = [];
  for (const item of items) {
    if (status === "tomados" && (!item.tomada || item.isDataConflict)) continue;
    if (status === "pendentes" && (item.tomada || item.ignorada || item.isDataConflict || item.isSintoma ||
      (isToday ? item.isExpectedUnconfirmed : !item.isExpectedUnconfirmed))) continue;
    if (status === "ignorados" && (!item.ignorada || item.isDataConflict)) continue;
    if (period !== "todos" && timelinePeriod(item.horario) !== period) continue;
    filtered.push(item);
  }
  return filtered;
}

/** M25: allocate visible array only after a resolved item truly needs hiding. */
export function visibleTimelineItems<T extends TimelineItemShape>(items: T[], options: { isToday: boolean; status: TimelineStatus; showResolved: boolean }): T[] {
  if (!options.isToday || options.status !== "todos" || options.showResolved) return items;
  let filtered: T[] | null = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.tomada || item.ignorada || item.isDataConflict) {
      if (filtered === null) filtered = items.slice(0, i);
    } else if (filtered !== null) filtered.push(item);
  }
  return filtered ?? items;
}

/** M25: grouping receives sorted projections in the usual case; avoid re-sorting those buckets. */
function sortTimelineBucketIfNeeded<T extends TimelineItemShape>(rows: T[]): T[] {
  for (let index = 1; index < rows.length; index++) {
    if (rows[index - 1].horario.localeCompare(rows[index].horario) > 0) {
      rows.sort((a, b) => a.horario.localeCompare(b.horario));
      break;
    }
  }
  return rows;
}

export function groupTimelineItems<T extends TimelineItemShape>(items: T[], context: { isToday: boolean; selectedDate: string; today: string; nowTime: string }): Array<[TimelineGroupKey, T[]]> {
  const groups = new Map<TimelineGroupKey, T[]>();
  // M18: linear bucket append. The previous spread copied the whole bucket
  // for every single item, causing O(n²) work in crowded hour groups.
  const add = (key: TimelineGroupKey, item: T) => {
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  };
  for (const item of items) {
    if (!context.isToday) { add(timelinePeriod(item.horario), item); continue; }
    if (item.isDataConflict) { add("revisao", item); continue; }
    if (item.tomada) { add("concluidas", item); continue; }
    if (item.ignorada) { add("ignoradas", item); continue; }
    if (item.isAvulsa && item.doseKind !== "planned") { add("avulsas", item); continue; }
    const bucket = classifyClinicalSchedule({ eventDate: context.selectedDate, scheduledTime: item.horario, today: context.today, nowTime: context.nowTime, nowWindowMinutes: 15 });
    add(bucket === "now" ? "agora" : bucket === "past" || bucket === "past-day" ? "atrasadas" : "depois", item);
  }
  const canonicalOrder: TimelineGroupKey[] = context.isToday
    ? ["agora", "atrasadas", "depois", "avulsas", "revisao", "concluidas", "ignoradas"]
    : ["manha", "tarde", "noite"];
  return canonicalOrder.flatMap(key => {
    const rows = groups.get(key);
    return rows?.length
      ? [[key, sortTimelineBucketIfNeeded(rows)] as [TimelineGroupKey, T[]]]
      : [];
  });
}

export function summarizeTimeline(items: TimelineItemShape[]) {
  // M18: one pass with exactly the same clinical denominator as V345.
  // An unconfirmed historical slot remains unconfirmed evidence, never a missed dose.
  let totalTomadas = 0;
  let totalPendentes = 0;
  let totalEsperadasSemConfirmacao = 0;
  let totalIgnoradas = 0;
  for (const item of items) {
    if (item.isExpectedUnconfirmed) totalEsperadasSemConfirmacao++;
    if (item.isExpectedUnconfirmed || item.isDataConflict || item.isAvulsa || item.isSintoma) continue;
    if (item.tomada) totalTomadas++;
    if (!item.tomada && !item.ignorada) totalPendentes++;
    if (item.ignorada) totalIgnoradas++;
  }
  return { totalTomadas, totalPendentes, totalEsperadasSemConfirmacao, totalIgnoradas };
}
