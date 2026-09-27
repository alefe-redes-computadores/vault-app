import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (condition, label) => {
  if (!condition) throw new Error(`PRE-APK GLOBAL: ${label}`);
  console.log(`OK: ${label}`);
};

const mais = read("app/mais/page.tsx");
const exportButton = read("components/ExportButton.tsx");
const exporter = read("lib/export.ts");
const migration = read("supabase/migrations/20260927_vault_pre_apk_security_hardening.sql");
const crypto = read("lib/crypto.ts");

ok(mais.includes('ExportButton variant="settings"'), "exportação real ligada à tela Mais");
ok(!/Exportar[\s\S]{0,900}Em breve\.\.\./.test(mais), "exportação não usa placeholder Em breve");
ok(exportButton.includes('"settings"'), "ExportButton possui superfície de configurações");

for (const token of [
  "retiradas",
  "registros_saude",
  "health_reminders",
  "health_goals",
]) {
  ok(exporter.includes(token), `backup inclui ${token}`);
}

ok(exporter.includes("medicamentoIds.has(item.medicamento_id)"), "relações medicamento/tratamento são isoladas");
ok(exporter.includes("exameIds.has(item.exame_id)"), "relações exame/tratamento são isoladas");
ok(exporter.includes("vaultIds.has(item.vault_id)"), "memberships de Vault são isoladas");
ok(exporter.includes('version: "3.0"'), "formato de backup versionado");

ok(migration.includes("from anon"), "helpers RLS deixam de ser RPC anônima");
ok(migration.includes("to authenticated"), "helpers RLS continuam disponíveis autenticados");
ok(migration.includes("set search_path = ''"), "trigger fixa search_path");
ok(migration.includes("drop index if exists public.settings_user_id_idx"), "índice duplicado removido de forma idempotente");

// Não fingimos que a criptografia legada virou zero-knowledge nesta cirurgia.
// O contrato impede que alguém remova silenciosamente a declaração honesta da postura.
ok(crypto.includes("legacy_shared_fallback") && crypto.includes("public_client_key"), "postura criptográfica legada continua explicitamente declarada");

console.log("VAULT PRE-APK GLOBAL — CONTRATO OK");
