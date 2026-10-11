import { db, safeUpdateMedicamento } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import type { MedicationCatalogSnapshot } from "@/lib/types";

const writes = new Map<string, Promise<void>>();

function stableSnapshot(value: MedicationCatalogSnapshot | null | undefined): string {
  if (!value) return "";
  return JSON.stringify(value);
}

/**
 * Persiste somente a identidade farmacêutica. Não reconcilia notificações,
 * receita, agenda ou estoque e nunca bloqueia a experiência da lista.
 */
export function persistMedicationCatalogSnapshot(
  medicationId: string,
  personId: string | undefined,
  snapshot: MedicationCatalogSnapshot
): Promise<void> {
  if (!medicationId || !personId) return Promise.resolve();
  const existing = writes.get(medicationId);
  if (existing) return existing;

  const task = (async () => {
    const current = await db.medicamentos.get(medicationId);
    if (!current || current.person_id !== personId) return;
    if (stableSnapshot(current.catalog_snapshot) === stableSnapshot(snapshot)) return;

    await safeUpdateMedicamento(medicationId, {
      catalog_snapshot: snapshot,
      updated_at: new Date().toISOString(),
      synced: false,
    });

    const complete = await db.medicamentos.get(medicationId);
    if (complete) await enfileirarOperacao("medicamentos", "update", complete);
  })().finally(() => writes.delete(medicationId));

  writes.set(medicationId, task);
  return task;
}
