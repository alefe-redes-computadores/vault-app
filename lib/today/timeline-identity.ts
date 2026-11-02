import type { TodayTimelineItem } from "@/lib/today/build-timeline-items";

/** Read-only, committed projection for the currently selected account, person and day. */
export type TodayTimelineSnapshot<T extends TodayTimelineItem> = {
  scopeKey: string;
  items: T[];
};

/**
 * Never assign the same identity to an SOS log and its scheduled slot.
 * Legacy records without a log ID have no safe stable identity.
 */
export function todayTimelineIdentity(item: TodayTimelineItem): string | null {
  if (item.isSintoma) {
    return item.sintomaId ? JSON.stringify(["symptom", item.sintomaId]) : null;
  }
  if (item.isAvulsa) {
    return item.logId ? JSON.stringify(["log", item.logId]) : null;
  }
  return item.medicamentoId && item.horario
    ? JSON.stringify(["slot", item.medicamentoId, item.horario]) : null;
}

/**
 * Fail-closed structural equality for our pure UI projection. It includes
 * nested evidence (insight, behavior, color arrays) and rejects exotic objects,
 * cycles/depth overflow rather than silently showing stale clinical details.
 */
export function sameTodayTimelineValue(left: unknown, right: unknown, depth = 0): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (depth >= 9) return false;
  const leftArray = Array.isArray(left);
  if (leftArray !== Array.isArray(right)) return false;
  if (leftArray && (left as unknown[]).length !== (right as unknown[]).length) return false;
  if (!leftArray && (Object.getPrototypeOf(left) !== Object.prototype ||
    Object.getPrototypeOf(right) !== Object.prototype)) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(rightRecord, key) ||
        !sameTodayTimelineValue(leftRecord[key], rightRecord[key], depth + 1)) return false;
  }
  return true;
}

/**
 * O(n) keyed reconciliation. Reuse an item only if its identity is unique in
 * BOTH snapshots and ALL fields match. Account/person/date/review changes reset
 * the entire cache; the caller supplies only the last COMMITTED snapshot.
 */
export function reconcileTodayTimelineItems<T extends TodayTimelineItem>(
  previous: TodayTimelineSnapshot<T> | null,
  scopeKey: string,
  projected: T[],
): TodayTimelineSnapshot<T> {
  if (!previous || previous.scopeKey !== scopeKey) return {scopeKey, items: projected};
  const oldUnique = new Map<string, T>();
  const oldDuplicates = new Set<string>();
  for (const item of previous.items) {
    const key = todayTimelineIdentity(item);
    if (key === null) continue;
    if (oldUnique.has(key)) {oldDuplicates.add(key); oldUnique.delete(key);}
    else if (!oldDuplicates.has(key)) oldUnique.set(key, item);
  }
  const newCounts = new Map<string, number>();
  for (const item of projected) {
    const key = todayTimelineIdentity(item);
    if (key !== null) newCounts.set(key, (newCounts.get(key) ?? 0) + 1);
  }
  const stabilized = projected.map(item => {
    const key = todayTimelineIdentity(item);
    if (key === null || newCounts.get(key) !== 1) return item;
    const earlier = oldUnique.get(key);
    return earlier && sameTodayTimelineValue(earlier, item) ? earlier : item;
  });
  if (stabilized.length === previous.items.length &&
      stabilized.every((item, index) => item === previous.items[index])) return previous;
  return {scopeKey, items: stabilized};
}
