/**
 * Read-only authority boundary for Brain suggested withdrawal detail navigation.
 * A same-owner active withdrawal ID must exist in the canonical local index.
 * Never completes, hides, merges or writes a withdrawal or dose.
 */
export type BrainMedicationActionM150P4 = { href: string; label: string; description: string };
export function medicationBrainActionWithVerifiedWithdrawalM150P4<T extends BrainMedicationActionM150P4>(
  suggestion: T | null,
  scheduledWithdrawalId: string | null | undefined,
): T | null {
  if (!suggestion) return null;
  const match = suggestion.href.match(/^\/saude\/retiradas\/detalhes(?:\?([^#]*))?(?:#.*)?$/i);
  if (!match) return suggestion; // A plan is not a completed/pending withdrawal detail.
  const requested = new URLSearchParams(match[1] || '').get('id');
  if (!requested || !scheduledWithdrawalId || requested !== scheduledWithdrawalId) return null;
  return suggestion;
}
