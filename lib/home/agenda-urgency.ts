/** Read-only visual priority. A late withdrawal is already included in the total. */
export function homeAgendaUrgency(total: number, lateWithdrawals: number) {
  const valid = (n: number) => Number.isSafeInteger(n) && n > 0 ? n : 0;
  const count = valid(total);
  const overdue = Math.min(count, valid(lateWithdrawals));
  return {
    total: count,
    overdue,
    label: overdue > 0
      ? `${overdue} retirada${overdue === 1 ? "" : "s"} pendente${overdue === 1 ? "" : "s"} após a data prevista`
      : count === 1 ? "1 compromisso na agenda" : `${count} compromissos na agenda`,
    tone: overdue > 0 ? "attention" as const : "neutral" as const,
  };
}
