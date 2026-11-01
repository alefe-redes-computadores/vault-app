/** Events are independent: a prescription or future acquisition never adds stock. */
export function medicationJourneySignal(input: {
  overdueWithdrawals: number;
  pendingWithdrawals: number;
  plannedAcquisitions: number;
  completedAcquisitions: number;
}) {
  const n = (x: number) => Number.isSafeInteger(x) && x > 0 ? x : 0;
  if (n(input.overdueWithdrawals) > 0) return {
    label: "Revisar retirada agendada", tone: "attention" as const,
    explanation: "Data vencida não comprova ausência de retirada. Confira a situação registrada.",
  };
  if (n(input.pendingWithdrawals) > 0) return {
    label: "Retirada em acompanhamento", tone: "planning" as const,
    explanation: "Uma retirada agendada permanece pendente até registro da realização ou cancelamento.",
  };
  if (n(input.plannedAcquisitions) > 0) return {
    label: "Aquisição ainda planejada", tone: "planning" as const,
    explanation: "Compra futura não conta como aquisição concluída, gasto ou entrada em estoque.",
  };
  if (n(input.completedAcquisitions) > 0) return {
    label: "Histórico de aquisição", tone: "neutral" as const,
    explanation: "Aquisição registrada não garante quantidade de estoque disponível hoje.",
  };
  return {
    label: "Dados de fornecimento a conferir", tone: "neutral" as const,
    explanation: "Sem evento confirmado nesta visão não significa falha de cuidado ou de tratamento.",
  };
}
