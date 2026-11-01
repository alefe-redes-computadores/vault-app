/** P15 R9 R10. Textual indication of the *recorded* routine, not a
 * medical adherence score. Zero scheduled slots must not mean 100% taken.
 */
export function homeRoutineSummaryNote(scheduled: number, taken: number): string {
  if (!Number.isFinite(scheduled) || scheduled <= 0) return "Sem doses programadas: isso não indica rotina cumprida.";
  const total = Math.max(0, Math.floor(scheduled));
  if (total === 0) return "Sem doses programadas: isso não indica rotina cumprida.";
  const confirmed = Number.isFinite(taken) ? Math.max(0, Math.min(total, Math.floor(taken))) : 0;
  if (confirmed === 0) return "Nenhuma tomada confirmada nas doses programadas desta visão.";
  if (confirmed < total) return `${total - confirmed} dose${total - confirmed === 1 ? "" : "s"} programada${total - confirmed === 1 ? "" : "s"} sem tomada confirmada nesta visão.`;
  return "Todas as doses programadas desta visão têm tomada registrada.";
}
