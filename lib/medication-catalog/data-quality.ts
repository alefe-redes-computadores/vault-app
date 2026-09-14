import { dosageMatchesPresentations } from "@/lib/medication-intelligence/presentation-match";
import type { MedicationPresentation } from "@/lib/medication-intelligence/types";

export type MedicationCatalogQuality =
  | { status: "not_checked"; matches: true; message: string }
  | { status: "catalog_unavailable"; matches: true; message: string }
  | { status: "verified"; matches: true; message: string }
  | { status: "mismatch"; matches: false; message: string };

export function assessMedicationCatalogQuality(
  dosage: string,
  presentations: MedicationPresentation[],
  hasCatalogReference: boolean
): MedicationCatalogQuality {
  if (!dosage.trim() || !hasCatalogReference) {
    return { status: "not_checked", matches: true, message: "Dosagem ainda não comparada com uma referência oficial." };
  }
  if (presentations.length === 0) {
    return { status: "catalog_unavailable", matches: true, message: "A referência foi encontrada, mas não há apresentações suficientes para confirmar a dosagem." };
  }
  if (dosageMatchesPresentations(dosage, presentations)) {
    return { status: "verified", matches: true, message: "Dosagem encontrada entre as apresentações consultadas." };
  }
  return { status: "mismatch", matches: false, message: "Dosagem não encontrada nas apresentações consultadas. Confira a receita ou a embalagem." };
}
