/**
 * M67 HF1 — closing a retroactive review must not create a navigation loop.
 * A manual visit opened from medication details uses the existing history entry.
 * A post-acquisition invite (or direct deep link) replaces itself with details.
 * This module is navigation-only; it never infers or persists a dose.
 */
export type RetroReviewExitAction = "back" | "replace";

export function retroReviewExitAction(
  stockMode: "manual" | "counted" | "added",
  origin: string | null,
): RetroReviewExitAction {
  return stockMode === "manual" && origin === "detalhes" ? "back" : "replace";
}
