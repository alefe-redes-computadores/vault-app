// VAULT M3 — reducer puro da paleta de identidade do medicamento.
// Remove cor selecionada; a terceira substitui a mais antiga, sem mutar o estado.
export function toggleMedicationIdentityColor(previous: readonly string[], hex: string, formato?: string): string[] {
  // M3 P1: na edição humana, cores duplas somente para cápsulas.
  // Sem formato informado preserva a assinatura/semântica histórica da função.
  // Dados já salvos não são alterados silenciosamente ao carregar uma tela.
  if (formato && formato !== "capsula") return previous.length === 1 && previous[0] === hex ? [] : [hex];
  if (previous.includes(hex)) return previous.filter(color => color !== hex);
  if (previous.length >= 2) return [previous[1], hex];
  return [...previous, hex];
}
