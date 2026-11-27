import {runMacro02ResidualWrite} from '@/lib/sync/macro02-residual-write';
import {prepareMacro02ClinicalWrite} from "@/lib/sync/macro02-authority";
import {medicationPending} from '@/lib/dose-premium/atomic-envelope';
import { db, safeUpdateMedicamento } from "@/lib/db";
import { enfileirarOperacao, solicitarProcessamentoSync } from "@/lib/sync/enfileirarOperacao";
import type { MedicationCatalogSnapshot } from "@/lib/types";
import { catalogScopeSTB } from "@/lib/health/medication-reference-fit-stb";

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
  snapshot: MedicationCatalogSnapshot,
  expectedScope?: string
): Promise<void> {
  if (!medicationId || !personId) return Promise.resolve();
  const existing = writes.get(medicationId);
  if (existing) return existing;

  const task = (async () => {
    const current = await db.medicamentos.get(medicationId);
    if (!current || current.person_id !== personId || (expectedScope && catalogScopeSTB(current) !== expectedScope)) return;
    if (stableSnapshot(current.catalog_snapshot) === stableSnapshot(snapshot)) return;

    const authority=await prepareMacro02ClinicalWrite(current.user_id);
    await runMacro02ResidualWrite(authority,current.user_id,[db.medicamentos,db.syncQueue],async()=>{
    await authority.assertCurrent();
    const fresh=await db.medicamentos.get(medicationId);if(!fresh||fresh.user_id!==current.user_id||fresh.person_id!==personId||fresh.updated_at!==current.updated_at)return;
    if(medicationPending(await db.syncQueue.toArray(),{user_id:current.user_id,person_id:personId,medicationId}).length)return;
    await safeUpdateMedicamento(medicationId, {
      catalog_snapshot: snapshot,
      updated_at: new Date().toISOString(),
      synced: false,
    });

    const complete = await db.medicamentos.get(medicationId);
    if (complete) await enfileirarOperacao("medicamentos", "update", complete,{dispatchSync:false});
    await authority.assertCurrent();
    },'medication-metadata');solicitarProcessamentoSync();
  })().finally(() => writes.delete(medicationId));

  writes.set(medicationId, task);
  return task;
}
