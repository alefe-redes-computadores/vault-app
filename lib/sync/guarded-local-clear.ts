// lib/sync/guarded-local-clear.ts
import type Dexie from "dexie";

/** Tables explicitly covered by the existing clear action. Unknown or newly added
 * stores are protected until their deletion semantics are reviewed. */
const covered = new Set([
  "persons", "documents", "medicamentos", "renovacoes", "retiradas", "vaults", "vaultMembers",
  "medicos", "farmacias", "hospitais", "locais", "exames", "consultas", "cirurgias", "doseLogs",
  "credentials", "bankCards", "instituicoes", "tratamentos", "cids", "anexos_clinicos",
  "medicamento_tratamentos", "exame_tratamentos", "registros_saude", "health_reminders", "health_goals",
  "health_profiles", "health_devices", "settings", "versiculos", "syncQueue",
]);

export async function clearGuardedLocalData(db: Dexie, clearCovered: () => Promise<void>): Promise<void> {
  const tables = db.tables;
  if (!tables.some(table => table.name === "syncQueue")) throw new Error("Fila de sincronização indisponível. Nenhum dado foi apagado.");
  await db.transaction("rw", tables, async () => {
    if (await db.table("syncQueue").count()) throw new Error("Há operações aguardando sincronização. Nenhum dado foi apagado.");
    for (const table of tables) {
      if (!covered.has(table.name) && await table.count()) {
        throw new Error("Existem dados locais em áreas que precisam de revisão antes da limpeza. Nenhum dado foi apagado.");
      }
    }
    await clearCovered();
  });
}
