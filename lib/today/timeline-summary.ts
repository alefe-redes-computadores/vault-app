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

/** Pure visual/metric authority; never mutate doses or infer missing outcomes. */
export function isScheduledRoutineEvidence(item:TimelineItemShape):boolean {
  return !item.isExpectedUnconfirmed && !item.isDataConflict && !item.isAvulsa &&
    !item.isSintoma && item.doseKind!=="planned" && item.doseKind!=="sos" && item.doseKind!=="extra";
}

export const timelinePeriod = (time: string): Exclude<TimelinePeriod, "todos"> => {
  const hour = Number(String(time || "00:00").split(":")[0]);
  return hour >= 5 && hour < 12 ? "manha" : hour >= 12 && hour < 18 ? "tarde" : "noite";
};

/** M24: one pass for status+period, retaining the old filtering semantics. */
export function filterTimelineItems<T extends TimelineItemShape>(items: T[], status: TimelineStatus, period: TimelinePeriod, isToday: boolean): T[] {
  if (status === "todos" && period === "todos") return items;
  const filtered: T[] = [];
  for (const item of items) {
    if (status === "tomados" && (!item.tomada || item.isDataConflict || item.doseKind === "planned")) continue;
    if (status === "pendentes" && (item.tomada || item.ignorada || item.isDataConflict || item.isSintoma ||
      item.isAvulsa || item.doseKind==="planned" || item.doseKind==="sos" || item.doseKind==="extra" ||
      (isToday ? item.isExpectedUnconfirmed : !item.isExpectedUnconfirmed))) continue;
    if (status === "ignorados" && (!item.ignorada || item.isDataConflict || item.doseKind === "planned")) continue;
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
    if (item.doseKind!=="planned" && (item.tomada || item.ignorada || item.isDataConflict)) {
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

export function groupTimelineItems<T extends TimelineItemShape>(items: T[], context: { isToday: boolean; selectedDate: string; today: string; nowTime: string; coLocatePlannedWithScheduled?: boolean }): Array<[TimelineGroupKey | "horarios", T[]]> {
  const groups = new Map<TimelineGroupKey | "horarios", T[]>();
  // M18: linear bucket append. The previous spread copied the whole bucket
  // for every single item, causing O(n²) work in crowded hour groups.
  const add = (key: TimelineGroupKey | "horarios", item: T) => {
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  };
  // Only when resolved rows are deliberately visible: co-locate a planned
  // DoseLog with its regular siblings; keep their distinct clinical states.
  const plannedTimes=new Set<string>(),routineTimes=new Set<string>();
  if(context.isToday && context.coLocatePlannedWithScheduled){
    for(const item of items){
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.horario)||item.isDataConflict||item.isSintoma)continue;
      if(item.doseKind==="planned")plannedTimes.add(item.horario);
      else if(isScheduledRoutineEvidence(item))routineTimes.add(item.horario);
    }
  }
  const sharedTimes=new Set([...plannedTimes].filter(time=>routineTimes.has(time)));
  for (const item of items) {
    if (!context.isToday) { add(timelinePeriod(item.horario), item); continue; }
    if (item.isDataConflict) { add("revisao", item); continue; }
    if(sharedTimes.has(item.horario) && (item.doseKind==="planned" || isScheduledRoutineEvidence(item))){add("horarios",item);continue;}
    // A planned event cannot turn into a completed dose through legacy flags.
    if(item.doseKind==="planned"){
      const plannedBucket=classifyClinicalSchedule({eventDate:context.selectedDate,scheduledTime:item.horario,today:context.today,nowTime:context.nowTime,nowWindowMinutes:15});
      add(plannedBucket==="now"?"agora":plannedBucket==="past"||plannedBucket==="past-day"?"atrasadas":"depois",item);
      continue;
    }
    if (item.tomada) { add("concluidas", item); continue; }
    if (item.ignorada) { add("ignoradas", item); continue; }
    if (item.isAvulsa) { add("avulsas", item); continue; }
    const bucket = classifyClinicalSchedule({ eventDate: context.selectedDate, scheduledTime: item.horario, today: context.today, nowTime: context.nowTime, nowWindowMinutes: 15 });
    add(bucket === "now" ? "agora" : bucket === "past" || bucket === "past-day" ? "atrasadas" : "depois", item);
  }
  const canonicalOrder: Array<TimelineGroupKey | "horarios"> = context.isToday
    ? ["agora", "horarios", "atrasadas", "depois", "avulsas", "revisao", "concluidas", "ignoradas"]
    : ["manha", "tarde", "noite"];
  return canonicalOrder.flatMap(key => {
    const rows = groups.get(key);
    return rows?.length
      ? [[key, sortTimelineBucketIfNeeded(rows)] as [TimelineGroupKey | "horarios", T[]]]
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
    // Planned/SOS/extra are neither pending routine nor realized adherence.
    if(item.doseKind==="planned" || item.doseKind==="sos" || item.doseKind==="extra") continue;
    if (item.isExpectedUnconfirmed) totalEsperadasSemConfirmacao++;
    if (!isScheduledRoutineEvidence(item)) continue;
    if (item.tomada) totalTomadas++;
    if (!item.tomada && !item.ignorada) totalPendentes++;
    if (item.ignorada) totalIgnoradas++;
  }
  return { totalTomadas, totalPendentes, totalEsperadasSemConfirmacao, totalIgnoradas };
}
