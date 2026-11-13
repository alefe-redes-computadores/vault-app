/** Shared display-only count formatter; never influences clinical decisions. */
export function formatPtBrQuantity(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
