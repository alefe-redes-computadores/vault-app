import type { TodayTimelineItem } from "@/lib/today/build-timeline-items";

/** Preserve the existing identity: a log has a distinct operation key from its scheduled slot. */
export function relevantDoseProcessingId(
  item: Pick<TodayTimelineItem, "logId" | "medicamentoId" | "horario">,
  activeId: string | null,
): string | null {
  const ownId = item.logId ? `log-${item.logId}` : `${item.medicamentoId}-${item.horario}`;
  return activeId === ownId ? activeId : null;
}
