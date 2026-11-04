import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, label) => {
  if (!value) throw new Error(`V91: ${label}`);
  console.log(`OK: ${label}`);
};

const pull = read("lib/sync/pull.ts");
const providers = read("components/Providers.tsx");
const doses = read("components/DoseNotificationReconciler.tsx");
const contractFiles = fs
  .readdirSync("scripts")
  .filter(
    (name) =>
      /^test-.*\.(?:mjs|cjs|js)$/.test(name) &&
      name !== "test-v91-sync-pipeline-performance-contract.mjs"
  );

ok(pull.includes("VAULT_SYNC_PIPELINE_V91"), "pipeline V91 presente");
ok(pull.includes("localTable.bulkGet(rowIds)"), "leitura Dexie em lote");
ok(pull.includes("localTable.bulkPut(pendingWrites)"), "gravação Dexie em lote");
ok((pull.match(/await runPullTasks\(\[/g) || []).length === 2, "grupos independentes possuem concorrência limitada");
ok(pull.includes("concurrency = 4"), "concorrência limitada a quatro tarefas");
ok(providers.includes("VAULT_NOTIFICATION_IDLE_MOUNT_V91"), "notificações saem do caminho da primeira pintura");
ok(providers.includes("notificationReconcilersReady"), "montagem ociosa protegida");
ok(!providers.includes("<OverdueDoseNotificationReconciler />"), "observador atrasado duplicado removido");
ok(!providers.includes("<ScheduledDoseNotificationReconciler />"), "observador agendado duplicado removido");
ok(doses.includes("reconcileScheduledDoseNotifications"), "agenda de doses preservada");
ok(doses.includes("reconcileOverdueDoseNotifications"), "atrasos preservados");
// M66 R2: desde a consolidação por proprietário, o reconciliador usa
// UMA assinatura reativa envolvendo AS DUAS tabelas em uma transação Dexie.
// Duas assinaturas separadas aumentariam leituras e perderiam a atomicidade.
const liveQueryCalls = (doses.match(/useLiveQuery\(/g) || []).length;
const ownerScopedReads = (doses.match(/\.where\("\[user_id\+person_id\]"\)\.equals\(owner\)\.toArray\(\)/g) || []).length;
ok(liveQueryCalls === 1 &&
   doses.includes('db.transaction("r",[db.medicamentos,db.doseLogs]') &&
   doses.includes('const owner=[user.id,activePersonId]') &&
   ownerScopedReads === 2 &&
   doses.includes('snapshot.userId!==user.id || snapshot.personId!==activePersonId') &&
   doses.includes('doseNotificationPipeline.enqueue('),
   "uma assinatura transacional para duas tabelas da mesma conta e pessoa, sem duplicar notificações");
const legacyContracts = contractFiles.filter((file) => {
  const source = read(`scripts/${file}`);
  return (
    source.includes('components/OverdueDoseNotificationReconciler.tsx') ||
    source.includes('components/ScheduledDoseNotificationReconciler.tsx') ||
    source.includes('<OverdueDoseNotificationReconciler />') ||
    source.includes('<ScheduledDoseNotificationReconciler />')
  );
});
ok(
  legacyContracts.length === 0,
  `todos os contratos usam a arquitetura consolidada${legacyContracts.length ? `: ${legacyContracts.join(", ")}` : ""}`
);

console.log("V91 SYNC PIPELINE PERFORMANCE — CONTRATO OK");
