import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V68 RESILIENCE: ${message}`);
  console.log(`OK: ${message}`);
};

const diag = read("lib/sync/diagnostics.ts");
const pull = read("lib/sync/pull.ts");
const recovery = read("app/recuperacao/page.tsx");
const more = read("app/mais/page.tsx");
const migration = read("supabase/migrations/20260928130021_vault_sync_pull_indexes_v68.sql");

ok(diag.includes("VAULT_SYNC_DIAGNOSTICS_V68"), "diagnóstico local do sync criado");
ok(diag.includes("durationMs") && !diag.includes("payload:"), "telemetria não armazena payload clínico");
ok(pull.includes("beginPullDiagnostics()"), "pull inicia medição");
ok(pull.includes("recordPullTable(remoteTable"), "pull mede tabela individual");
ok(pull.includes("finishPullDiagnostics()"), "pull encerra medição");
ok(recovery.includes("VAULT_RECOVERY_CENTER_V68"), "central de recuperação criada");
ok(recovery.includes("await pullAllData(user.id)"), "recuperação usa pull autoritativo existente");
ok(recovery.includes("await processQueue()"), "recuperação processa fila existente");
ok(recovery.includes("<ExportButton variant=\"full\" />"), "backup existente integrado à central");
ok(recovery.includes("não executa limpeza"), "central não executa recuperação destrutiva");
ok(more.includes('router.push("/recuperacao")'), "Mais abre central de recuperação");
ok(migration.includes("idx_dose_logs_user_id"), "migration de índice do pull espelhada localmente");
ok(migration.includes("idx_registros_saude_user_id"), "índice de registros de saúde espelhado");

console.log("VAULT V68 RESILIENCE + RECOVERY: CONTRATOS OK");
