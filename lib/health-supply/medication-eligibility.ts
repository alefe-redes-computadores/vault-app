import type { Medicamento } from "@/lib/types";

/** Suspended routine and continued SOS use are independent concepts.
 *  Never reactivate a discontinued routine when allowing a registered SOS medication
 *  to remain visible for supply and a scheduled pickup.
 */
export function isSupplyMedicationEligible(med: Pick<Medicamento, "status" | "tipo_uso">): boolean {
  return med.status !== "descontinuado" || med.tipo_uso === "sos";
}
