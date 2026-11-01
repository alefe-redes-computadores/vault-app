// VAULT M3 — reducer puro da paleta de identidade do medicamento.
// Remove cor selecionada; a terceira substitui a mais antiga, sem mutar o estado.
export function toggleMedicationIdentityColor(previous: readonly string[], hex: string): string[] {
  if (previous.includes(hex)) return previous.filter(color => color !== hex);
  if (previous.length >= 2) return [previous[1], hex];
  return [...previous, hex];
}
