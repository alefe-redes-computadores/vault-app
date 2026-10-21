import type { Retirada } from "@/lib/types";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isOpenWithdrawal(withdrawal: Pick<Retirada, "status">): boolean {
  return withdrawal.status === "agendada";
}

export function isOverdueWithdrawal(
  withdrawal: Pick<Retirada, "data" | "status">,
  today: string
): boolean {
  return ISO_DAY.test(today) && ISO_DAY.test(withdrawal.data) &&
    isOpenWithdrawal(withdrawal) && withdrawal.data < today;
}

export function withdrawalDaysOverdue(date: string, today: string): number {
  if (!ISO_DAY.test(date) || !ISO_DAY.test(today) || date >= today) return 0;
  const from = Date.parse(`${date}T12:00:00Z`);
  const to = Date.parse(`${today}T12:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function compareWithdrawals(left: Retirada, right: Retirada): number {
  const date = left.data.localeCompare(right.data);
  if (date) return date;
  return (left.horario || "23:59").localeCompare(right.horario || "23:59");
}

/**
 * An open withdrawal never disappears at midnight. On Today's operational view,
 * unresolved past rows remain visible beside today's commitments. Historical and
 * future date views remain exact and do not duplicate an overdue item.
 */
export function withdrawalsForAgendaDate(
  rows: Retirada[],
  selectedDate: string,
  today: string
): Retirada[] {
  return rows
    .filter((row) => row.data === selectedDate ||
      (selectedDate === today && isOverdueWithdrawal(row, today)))
    .sort(compareWithdrawals);
}

export function openWithdrawalsDueBy(rows: Retirada[], today: string): Retirada[] {
  return rows
    .filter((row) => isOpenWithdrawal(row) && ISO_DAY.test(row.data) && row.data <= today)
    .sort(compareWithdrawals);
}
