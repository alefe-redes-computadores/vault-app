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

export function filterTimelineItems<T extends TimelineItemShape>(items: T[], status: TimelineStatus, period: TimelinePeriod, isToday: boolean): T[] {
  let result = items;
  if (status === "tomados") result = result.filter(item => item.tomada && !item.isDataConflict);
  else if (status === "pendentes") result = result.filter(item => !item.tomada && !item.ignorada && !item.isDataConflict && !item.isSintoma && (isToday ? !item.isExpectedUnconfirmed : item.isExpectedUnconfirmed));
  else if (status === "ignorados") result = result.filter(item => item.ignorada && !item.isDataConflict);
  if (period !== "todos") result = result.filter(item => timelinePeriod(item.horario) === period);
  return result;
}

export function visibleTimelineItems<T extends TimelineItemShape>(items: T[], options: { isToday: boolean; status: TimelineStatus; showResolved: boolean }): T[] {
  if (!options.isToday || options.status !== "todos" || options.showResolved) return items;
  return items.filter(item => !item.tomada && !item.ignorada && !item.isDataConflict);
}

export function groupTimelineItems<T extends TimelineItemShape>(items: T[], context: { isToday: boolean; selectedDate: string; today: string; nowTime: string }): Array<[TimelineGroupKey, T[]]> {
  const groups = new Map<TimelineGroupKey, T[]>();
  const add = (key: TimelineGroupKey, item: T) => groups.set(key, [...(groups.get(key) || []), item]);
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
      ? [[key, rows.sort((a, b) => a.horario.localeCompare(b.horario))] as [TimelineGroupKey, T[]]]
      : [];
  });
}

export function summarizeTimeline(items: TimelineItemShape[]) {
  const routine = items.filter(item => !item.isExpectedUnconfirmed && !item.isDataConflict && !item.isAvulsa && !item.isSintoma);
  return {
    totalTomadas: routine.filter(item => item.tomada).length,
    totalPendentes: routine.filter(item => !item.tomada && !item.ignorada).length,
    totalEsperadasSemConfirmacao: items.filter(item => item.isExpectedUnconfirmed).length,
    totalIgnoradas: routine.filter(item => item.ignorada).length,
  };
}
