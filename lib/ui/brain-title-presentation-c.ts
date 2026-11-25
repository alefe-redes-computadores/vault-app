/** Macro C F2: identity must be structured; never infer clinical names from insight prose. */
export function sharedMedicationTitleC(titles: readonly string[], verifiedMedicationName?: string | null): string {
  void titles;
  if (typeof verifiedMedicationName !== 'string') return 'Medicamento';
  const cleaned = verifiedMedicationName.trim();
  if (!cleaned || cleaned.length > 120 || /[\u0000-\u001f]/.test(cleaned)) return 'Medicamento';
  return cleaned;
}
export function observationTitleC(title: string, groupLabel: string): string {
  if (groupLabel !== 'Medicamento' && title.startsWith(`${groupLabel}: `)) {
    return title.slice(groupLabel.length + 2);
  }
  return title;
}
