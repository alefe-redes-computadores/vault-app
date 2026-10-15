import type { Medicamento, Retirada } from "@/lib/types";

/** Suspended routine and continued SOS use are independent concepts.
 *  Never reactivate a discontinued routine when allowing a registered SOS medication
 *  to remain visible for supply and a scheduled pickup.
 */
export function isSupplyMedicationEligible(med: Pick<Medicamento, "status" | "tipo_uso">): boolean {
  return med.status !== "descontinuado" || med.tipo_uso === "sos";
}

/** Retirada já registrada é um vínculo logístico explícito, não prova de tratamento ativo.
 * Nunca reativa automaticamente medicamento ou dose, e nunca associa por nome.
 */
export function hasRecordedSupplyWithdrawal(
  med: Pick<Medicamento, "id" | "person_id" | "user_id">,
  withdrawals: Pick<Retirada, "medicamento_id" | "person_id" | "user_id" | "status">[],
  personId: string,
  userId: string
): boolean {
  return !!med.id && !!personId && !!userId && med.person_id === personId && med.user_id === userId &&
    withdrawals.some(r => r.medicamento_id === med.id && r.person_id === personId && r.user_id === userId &&
      (r.status === "agendada" || r.status === "realizada"));
}

/** SOS pode continuar no fornecimento; medicação descontinuada sem SOS só pode
 * ser associada a uma retirada real existente dessa mesma pessoa e conta.
 */
export function canTrackSupplyMedication(
  med: Pick<Medicamento, "id" | "person_id" | "user_id" | "status" | "tipo_uso">,
  withdrawals: Pick<Retirada, "medicamento_id" | "person_id" | "user_id" | "status">[],
  personId: string,
  userId: string
): boolean {
  return !!med.id && !!personId && !!userId && med.person_id === personId && med.user_id === userId &&
    (isSupplyMedicationEligible(med) || hasRecordedSupplyWithdrawal(med, withdrawals, personId, userId));
}
