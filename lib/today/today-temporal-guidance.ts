/** R9 R5: presentation only; never changes dose status or writes stock. */
export function todayTemporalGuidance(input: {
  isFuturo: boolean; isPassado: boolean; recorded: number; unconfirmed: number;
}): string | null {
  if (input.isFuturo) return "Previsão: horários planejados ainda não são doses realizadas.";
  if (input.isPassado && input.recorded === 0) return "Sem registros neste dia; ausência de confirmação não significa dose ignorada.";
  if (input.isPassado && input.unconfirmed > 0) return "Histórico parcial: horários sem confirmação não contam como tomados nem ignorados.";
  return null;
}
