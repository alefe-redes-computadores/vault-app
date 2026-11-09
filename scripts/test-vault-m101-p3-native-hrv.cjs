#!/usr/bin/env node
"use strict";
/** M101 P3: contratos e políticas herméticos; NÃO compila APK nem lê sensores reais. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
let count = 0;
const check = (cond, message) => { assert.ok(cond, `M101 P3: ${message}`); console.log(`OK ${++count}: ${message}`); };
const read = p => fs.readFileSync(p, "utf8");
function load(p, mocks = {}) {
  const source = read(p);
  const syntax = ts.createSourceFile(p, source, ts.ScriptTarget.Latest, true, p.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  check(syntax.parseDiagnostics.length === 0, `sintaxe TS/TSX: ${p}`);
  const result = ts.transpileModule(source, { fileName: p, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  check(!(result.diagnostics || []).some(x => x.category === ts.DiagnosticCategory.Error), `transpilação: ${p}`);
  const mod = new Module(path.resolve(p), module); mod.filename = path.resolve(p);
  mod.require = id => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  mod._compile(result.outputText, mod.filename);
  return mod.exports;
}
const meta = load("lib/health-profile/types.ts");
const metrics = load("lib/health-profile/metrics.ts");
const conn = load("lib/health-connect/types.ts");
const support = load("lib/health-connect/supported-m101p3.ts");
check(meta.METRICS.hrv_rmssd.unit === "ms" && meta.METRICS.hrv_rmssd.category === "medicao", "RMSSD em milissegundos e categoria medição");
check(conn.CONNECT_METRICS.length === 8 && new Set(conn.CONNECT_METRICS).size === 8, "oito indicadores distintos, sete anteriores preservados");
check(conn.CONNECT_METRICS.includes("passos") && conn.CONNECT_METRICS.includes("caminhada") && conn.CONNECT_METRICS.includes("hrv_rmssd"), "HRV não substitui passos, caminhada ou batimentos");
metrics.validateMetric("hrv_rmssd", 1);
metrics.validateMetric("hrv_rmssd", 45.6);
metrics.validateMetric("hrv_rmssd", 200);
check(true, "valores RMSSD 1–200, inclusive decimais válidos");
for (const bad of [0,-1,0.9,200.1,NaN,Infinity,-Infinity]) assert.throws(() => metrics.validateMetric("hrv_rmssd", bad));
check(true, "valores inválidos e fora da faixa não são aceitos");
metrics.validateMetric("frequencia_cardiaca", 72);
metrics.validateMetric("passos", 10000);
metrics.validateMetric("pressao_arterial", 120, 80);
check(true, "validação de batimentos, passos e pressão preservada");
const { filterReadableConnectTypesM101P3: compatible } = support;
check(compatible(["hrv_rmssd"],undefined).length===0, "APK antigo não recebe HRV");
check(JSON.stringify(compatible(["sono","passos","hrv_rmssd"],undefined))===JSON.stringify(["sono","passos"]), "APK antigo mantém os indicadores existentes");
check(JSON.stringify(compatible(["sono","hrv_rmssd"],["sono","hrv_rmssd"]))===JSON.stringify(["sono","hrv_rmssd"]), "APK novo declara capacidade, HRV passa a ser elegível");
check(JSON.stringify(compatible(["sono","sono","hrv_rmssd"],["hrv_rmssd"]))===JSON.stringify(["sono","hrv_rmssd"]), "seleções deduplicadas e ordem preservada");
const norm = load("lib/health-connect/normalize.ts", {
  "@/lib/health-profile/types": { METRICS: meta.METRICS },
  "@/lib/health-profile/metrics": metrics,
  "./types": { SAMSUNG_ORIGIN: conn.SAMSUNG_ORIGIN },
}).normalizeConnectRecord;
const time = new Date(Date.now()-60*60*1000).toISOString();
const raw = { id: "hrv-sample-001", origin: conn.SAMSUNG_ORIGIN, type: "hrv_rmssd", time, value: 44.7 };
const normalized = norm(raw);
check(normalized.nome === "HRV (RMSSD)" && normalized.valor_medicao === "44.7 ms" && normalized.valor_numerico === 44.7, "valor instantâneo decimal preservado em ms");
check(normalized.source_record_id === `${conn.SAMSUNG_ORIGIN}:hrv_rmssd:hrv-sample-001`, "identidade da origem Samsung preservada");
check(normalized.inicio_em === null && normalized.fim_em === null && normalized.duracao_minutos === undefined, "HRV não vira intervalo de sono nem caminhada");
check(normalized.observacoes.includes("Não é diagnóstico clínico") && normalized.observacoes.includes("sem média diária"), "sem inventar diagnóstico ou média diária");
for (const bad of [
  {origin: "outro.app"}, {dailyAverage: true}, {dailyTotal: true}, {value: 0},
  {value: 201}, {value: NaN}, {time: new Date(Date.now()+3600000).toISOString()},
  {start: new Date(Date.now()-7200000).toISOString(), end: time}, {id: ""},
]) assert.throws(() => norm({...raw,...bad}));
check(true,"normalização rejeita origem falsa, agregação de HRV e dados inválidos");
const kotlin = read("native/health-connect/VaultHealthConnectPlugin.kt");
check(kotlin.includes('"hrv_rmssd" to HeartRateVariabilityRmssdRecord::class'), "API nativa HRV RMSSD correta");
check(kotlin.includes('if("hrv_rmssd" in allowed)') && kotlin.includes('readAll(hc,HeartRateVariabilityRmssdRecord::class,start,end)'), "leitura HRV somente autorizada");
check(kotlin.includes('it.heartRateVariabilityMillis') && kotlin.includes('"hrv_rmssd",it.time,it.heartRateVariabilityMillis'), "hora e valor individual, sem média artificial");
check(kotlin.includes('dataOriginFilter = setOf(DataOrigin(origin))') && kotlin.includes('"com.sec.android.app.shealth"'), "origem Samsung filtrada no nativo");
check(kotlin.includes('.put("supported",JSArray(types.keys.toList()))'), "plugin expõe capacidade por versão");
check(!/insertRecords\(|updateRecords\(|deleteRecords\(/.test(kotlin), "sem escrita no Health Connect");
const manifest = read("scripts/patch-android-health-connect-v113.mjs");
check(manifest.includes('"READ_HEART_RATE_VARIABILITY"') && !manifest.includes('"WRITE_HEART_RATE_VARIABILITY"'), "permissão específica de somente leitura");
const v113 = read("scripts/test-v113-health-connect.mjs");
check(v113.includes('.length,8)') && v113.includes('READ_HEART_RATE_VARIABILITY') && v113.includes('READ_STEPS'), "regressão Android exige 8 permissões READ");
const panel = read("components/saude/HealthConnectPanel.tsx");
check(panel.includes('status?.supported?.includes("hrv_rmssd")') && panel.includes('HRV RMSSD exige o APK atualizado'), "PWA oculta HRV em APK legado e comunica atualização");
check(panel.includes('eligibleTypes') && panel.includes('requestPermissions({types:eligibleTypes})'), "não solicita permissão a plugin incompatível");
const sync = read("lib/health-connect/sync.ts");
check(sync.includes('filterReadableConnectTypesM101P3(connection.types, nativeStatus.supported)') && sync.includes('healthConnectBridge.read({types:readTypes,days:28})'), "sincronização existente convive com APK anterior");
check(sync.includes('if (!response.granted.some(t => readTypes.includes(t)))'), "permissão efetiva verificada no subconjunto compatível");
check(read("components/saude/HealthMetricDetails.tsx").includes("HRV (RMSSD) é uma medição pontual"), "histórico esclarece unidade e contexto, sem diagnóstico");
check(read("lib/health-records.ts").includes('tipo: "hrv_rmssd"') && read("lib/health-profile/dashboard-index.ts").includes('"hrv_rmssd"'), "registro e projeção clínica conhecem HRV");
check(!read("lib/health-connect/evidence-m100.ts").includes('["HRV",') && read("lib/health-connect/evidence-m100.ts").includes('"Estágios do sono"'), "aviso antigo reflete nova capacidade e limites ainda não suportados");
const gate = read("scripts/test-v63-release-gate.mjs");
check(gate.includes('"scripts/test-vault-m101-p3-native-hrv.cjs"') && gate.includes('"scripts/test-vault-m101-p2-native-steps.cjs"') && gate.includes('"scripts/test-vault-m100-p1-family-health.cjs"'), "gate agrega P3 sem eliminar P2/M100");
check(read("native/health-connect/PermissionsRationaleActivity.kt").includes('HRV RMSSD pontual'), "aviso nativo explica HRV e escopo");
console.log(`M101 P3: ${count} garantias herméticas aprovadas. APK Kotlin/Gradle e sensores reais requerem homologação.`);
