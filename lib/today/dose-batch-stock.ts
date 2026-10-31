/**
 * One-pass partition of already eligible dose candidates.
 * Never creates records, marks doses as taken, or guesses clinical stock.
 */
export function partitionDoseBatchByStock<T>(items: readonly T[], isKnownEmpty: (item: T) => boolean): {
  withoutStock: T[]; withStock: T[];
} {
  const withoutStock: T[] = [];
  const withStock: T[] = [];
  for (const item of items) {
    (isKnownEmpty(item) ? withoutStock : withStock).push(item);
  }
  return { withoutStock, withStock };
}
