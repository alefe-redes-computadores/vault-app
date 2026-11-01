import type { TimelineStatus, TimelinePeriod } from "@/lib/today/timeline-summary";

/** Pure UI intent; eligibility and real dose states remain in timeline-summary.ts. */
export function toggleTodayStatus(current: TimelineStatus, selected: Exclude<TimelineStatus, "todos">): TimelineStatus {
  return current === selected ? "todos" : selected;
}
export function toggleTodayPeriod(current: TimelinePeriod, selected: Exclude<TimelinePeriod, "todos">): TimelinePeriod {
  return current === selected ? "todos" : selected;
}
