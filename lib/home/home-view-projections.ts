// VAULT M2 — calculos derivados da Home; sem consultas ou gravacoes.
import { getDocumentAlerts } from "@/lib/health-utils";
import { isOverdueWithdrawal } from "@/lib/withdrawal-agenda";
import type { Retirada } from "@/lib/types";

export function selectHomeDocumentAlerts(
  documents: Parameters<typeof getDocumentAlerts>[0],
  personId: string | null | undefined,
): ReturnType<typeof getDocumentAlerts> {
  if (!personId) return [];
  return getDocumentAlerts(documents || []).filter(alert =>
    alert.daysUntil <= 5 && alert.daysUntil >= -7
  );
}

export function countHomeTakenDoseLogs(logs: readonly { tomado_em?: string | null }[]): number {
  return logs.filter(log => Boolean(log.tomado_em)).length;
}

export function selectHomeOverdueWithdrawals<T extends Pick<Retirada, "status" | "data">>(
  withdrawals: T[], today: string,
): T[] {
  return withdrawals.filter(withdrawal => isOverdueWithdrawal(withdrawal, today));
}
