/** P15 R9 R9: title supplements only. Never change the schedule's grouping,
 * state or event authority. A group count is not an adherence measure.
 */
export function todayTimelineGroupContext(subtitle: string, count: number): string {
  if (!Number.isSafeInteger(count) || count <= 0) return subtitle;
  return `${subtitle} · ${count} ${count === 1 ? "registro" : "registros"}`;
}
