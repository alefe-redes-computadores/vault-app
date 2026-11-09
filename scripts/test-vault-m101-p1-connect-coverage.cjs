#!/usr/bin/env node
"use strict";
/** M101 P1 — suíte hermética, sem Dexie, Android, Supabase ou rede. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
let count = 0;
const check = (truth, reason) => { assert.ok(truth, `M101 P1: ${reason}`); count++; };
const read = name => fs.readFileSync(name, "utf8");
const file = "lib/health-connect/coverage-m101.ts";
const source = read(file);
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
check(tree.parseDiagnostics.length === 0, "módulo de cobertura tem sintaxe TS válida");
const types = ["sono", "peso", "pressao_arterial", "frequencia_cardiaca", "oxigenacao", "caminhada"];
const labels = Object.fromEntries(types.map(metric => [metric, { label: metric }]));
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = new Module(path.resolve(file), module);
mod.filename = path.resolve(file);
mod.require = key => {
  if (key === "./types") return { CONNECT_METRICS: types };
  if (key === "@/lib/health-profile/types") return { METRICS: labels };
  throw Error("Import inesperado em módulo puro: " + key);
};
mod._compile(output, path.resolve(file));
const project = mod.exports.projectHealthConnectCoverageM101;
const now = new Date(2026, 10, 9, 12, 0, 0).getTime();
const connection = { id:"u", user_id:"u", person_id:"p", types:["sono","peso","caminhada"], revision:"r" };
const status = { availability:"available", granted:["sono","peso"] };
const prefix = "com.sec.android.app.shealth:";
const metric = (type, date, id, person="p", user="u", more={}) => ({
  id, tipo:type, source:"health_connect", source_record_id:prefix + id, data:date, user_id:user, person_id:person, ...more
});
const rows = [
  metric("sono", "2026-11-09", "s1"),
  metric("sono", "2026-11-09", "s1", "p", "u", { id:"duplicate" }),
  metric("sono", "2026-11-08", "s2"),
  metric("peso", "2026-11-04", "w1"),
  metric("caminhada", "2026-10-14", "c1"),
  metric("sono", "2026-11-09", "leak-person", "other"),
  metric("sono", "2026-11-09", "leak-user", "p", "other"),
  metric("sono", "2026-11-10", "future"),
  metric("sono", "2026-10-10", "old"),
  metric("sono", "2026-11-31", "invalid"),
  metric("sono", "2026-11-09", "manual", "p", "u", {source:"manual"}),
  metric("sono", "2026-11-09", "wrong-origin", "p", "u", {source_record_id:"other-app:id"}),
  metric("oxigenacao", "2026-11-09", "not-selected"),
];
const r = project(rows, connection, status, "u", "p", now);
check(r.linked && r.selectedCount === 3 && r.permittedCount === 2, "vínculo por conta/pessoa e permissões parciais");
check(r.samples28 === 4, "dedupe de origem e janela de 28 dias");
const sleep = r.metrics.find(m => m.metric === "sono");
check(sleep.samples28 === 2 && sleep.days7 === 2 && sleep.days28 === 2, "sono conta dias com dado, não dias presumidos");
check(sleep.latestDay === "2026-11-09" && sleep.ageDays === 0, "recência vem da data registrada");
const weight = r.metrics.find(m => m.metric === "peso");
check(weight.samples28 === 1 && weight.days7 === 1 && weight.ageDays === 5, "peso mantém recência objetiva");
const walk = r.metrics.find(m => m.metric === "caminhada");
check(walk.permission === "denied" && walk.samples28 === 1 && walk.days7 === 0 && walk.days28 === 1, "revogação não apaga dado importado anteriormente");
check(r.metrics.find(m => m.metric === "oxigenacao").samples28 === 0, "tipo não selecionado não agrega registros");
check(project(rows, connection, status, "other", "p", now).samples28 === 0, "conta estranha não lê registros");
check(project(rows, connection, status, "u", "other", now).samples28 === 0, "outra pessoa não lê registros");
check(project(rows, null, status, "u", "p", now).samples28 === 0, "sem vínculo não lê dados");
check(project(rows, connection, null, "u", "p", now).metrics.find(m => m.metric === "sono").permission === "unknown", "sem status não inventa autorização");
check(project([], connection, status, "u", "p", now).samples28 === 0, "sem dados permanece zero REGISTROS, não zero fisiológico");
check(project(rows, connection, status, "u", "p", Number.NaN).samples28 === 0, "relógio inválido não cria cobertura");
const component = read("components/saude/HealthConnectCoverageM101.tsx");
const uiTree = ts.createSourceFile("coverage.tsx", component, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
check(uiTree.parseDiagnostics.length === 0, "componente TSX analisa sem erros");
check(component.includes('where("[user_id+person_id]").equals([userId, personId])'), "consulta Dexie usa índice conta+pessoa");
check(component.includes("open && linked && userId"), "consulta adiada até expansão explícita");
check(!/<select\b/i.test(component) && !/<input\b[^>]*type=["'](?:date|time|datetime-local)/i.test(component), "mantém contrato visual V112");
check(component.includes('Promise.resolve([] as RegistroSaude[])') && component.includes('useLiveQuery<RegistroSaude[]>'), "listas vazias tipadas evitam regressão M100");
check(
  component.includes(') ?? EMPTY_CONNECT_ROWS_M101;') &&
  component.includes('const EMPTY_CONNECT_ROWS_M101: RegistroSaude[] = [];'),
  "hook Dexie usa assinatura de 2 argumentos e fallback estável"
);
const panel = read("components/saude/HealthConnectPanel.tsx");
check(panel.includes('HealthConnectCoverageM101') && panel.includes('userId={user?.id}'), "painel integrado com dono autenticado");
check(panel.includes('linked && native && <button') && panel.includes('Sincronizar agora'), "sincronização manual sempre disponível no APK vinculado");
check(panel.includes('window.addEventListener("focus"') && panel.includes('document.addEventListener("visibilitychange"'), "permissões revalidadas no retorno ao app");
const gate=read("scripts/test-v63-release-gate.mjs");
check(gate.includes('"scripts/test-vault-m101-p1-connect-coverage.cjs"'), "prova M101 P1 integrada ao gate global");
const native = read("native/health-connect/VaultHealthConnectPlugin.kt");
check(native.includes('private val origin = "com.sec.android.app.shealth"') && native.includes('readAll(hc,') && !native.includes('HealthPermission.getWritePermission'), "origem e leitura nativa read-only preservadas");
console.log(`VAULT M101 P1: ${count} verificações herméticas aprovadas. APK físico requer homologação.`);
