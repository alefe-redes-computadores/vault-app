import type { Medicamento } from "@/lib/types";
import type { MedicationReference } from "@/lib/medication-intelligence/types";

/**
 * Mantém a UI reativa quando o catálogo hidrata um medicamento já visível.
 * É somente uma assinatura de leitura: não consulta rede nem altera o cadastro.
 */
export function medicationCatalogSnapshotFingerprint(
  medication: Pick<Medicamento, "catalog_snapshot">
): string {
  const snapshot = medication.catalog_snapshot;
  if (!snapshot?.reference) return "catalog:none";
  const reference = snapshot.reference as MedicationReference;
  return JSON.stringify({
    schema: snapshot.schema,
    lookupKey: snapshot.lookup_key,
    resolvedAt: snapshot.resolved_at,
    quality: snapshot.quality,
    matchKind: snapshot.match_kind,
    canonicalName: reference.canonicalName,
    activeIngredient: reference.activeIngredient,
    activeIngredients: reference.activeIngredients,
    regulatoryIdentity: reference.regulatoryIdentity,
  });
}
