import type { TimelineItemShape, TimelineStatus } from "@/lib/today/timeline-summary";

/** Matches visibleTimelineItems's default collapse; never infers a completed or ignored dose. */
export function countHiddenTodayResolved<T extends TimelineItemShape>(
  items: readonly T[],
  options: { isToday: boolean; status: TimelineStatus; showResolved: boolean },
): number {
  if (!options.isToday || options.status !== "todos" || options.showResolved) return 0;
  let count = 0;
  for (const item of items) if (item.tomada || item.ignorada || item.isDataConflict) count++;
  return count;
}
