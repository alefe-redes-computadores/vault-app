/** M53: a loading toast has indefinite lifetime only while it is loading. */
export type VaultToastKind = "success" | "error" | "info" | "loading";
export function resolveToastDuration(
  previousType: VaultToastKind,
  previousDuration: number | undefined,
  nextType: VaultToastKind,
  explicitDuration?: number,
): number {
  if (explicitDuration !== undefined) return Number.isFinite(explicitDuration) && explicitDuration >= 0 ? explicitDuration : 3000;
  if (previousType === nextType) return previousDuration ?? (nextType === "loading" ? 0 : 3000);
  if (nextType === "loading") return 0;
  // A completed loading operation must become visible for a meaningful time.
  if (previousType === "loading" || !previousDuration) return nextType === "error" ? 4000 : 3000;
  return previousDuration;
}
