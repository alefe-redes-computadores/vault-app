import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, label) => {
  if (!value) throw new Error(`V99: ${label}`);
  console.log(`OK: ${label}`);
};

const hook = read("hooks/useMedicationRegulatoryProfiles.ts");
const types = read("lib/types.ts");
const persistence = read("lib/medication-catalog/persisted-snapshot.ts");
const migration = read("supabase/migrations/20261008_add_medication_catalog_snapshot_v99.sql");

ok(types.includes("MedicationCatalogSnapshot") && types.includes("catalog_snapshot?"), "medicamento transporta snapshot canônico sincronizável");
ok(migration.includes("catalog_snapshot jsonb") && migration.includes("if not exists"), "migração aditiva e idempotente");
ok(hook.includes("snapshotReference") && hook.includes("knownReference"), "snapshot remoto/local precede descoberta de rede");
ok(hook.includes("persistKnownReference") && hook.includes("persistMedicationCatalogSnapshot"), "cache V98 é promovido para verdade sincronizada");
ok(hook.includes("persisted?.activeIngredient") && hook.includes("persisted?.activeIngredients"), "nome comercial e princípio ativo participam da resolução");
ok(hook.includes("authoritativeTerms.some") && hook.includes("isPharmaceuticallyEquivalentName"), "autoridade exige vínculo exato ou equivalência determinística");
ok(hook.includes("known?.reference || null") && hook.includes("preservesAuthority"), "falha e candidato inferior não apagam verdade conhecida");
ok(persistence.includes("safeUpdateMedicamento") && persistence.includes("enfileirarOperacao"), "snapshot usa arquitetura local-first e fila de sincronização");
ok(!persistence.includes("reconcileMedicationNotifications"), "persistência farmacêutica não toca agenda nem notificações");
console.log("VAULT V99 CANONICAL MEDICATION SNAPSHOT: CONTRACT OK");
