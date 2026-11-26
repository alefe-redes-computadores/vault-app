#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
let checks = 0;
const ok = (truth, name) => { assert.ok(truth, "CI360 P1: " + name); checks++; };
const read = path => fs.readFileSync(path, "utf8");
const enginePath = "lib/health-intelligence/brain-evidence-window-ci360.ts";
const componentPath = "components/health-intelligence/BrainEvidenceWindowCI360.tsx";
const page = read("app/inteligencia/page.tsx");
const engine = read(enginePath);
const component = read(componentPath);
const gate = read("scripts/test-v63-release-gate.mjs");
for (const [file, source] of [[enginePath, engine], [componentPath, component], ["app/inteligencia/page.tsx", page]]) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  ok(parsed.parseDiagnostics.length === 0, `Sintaxe ${file}`);
}
ok(page.includes('import { BrainEvidenceWindowCI360 } from "@/components/health-intelligence/BrainEvidenceWindowCI360";'), "Importação canônica");
ok(page.includes('<BrainEvidenceWindowCI360 context={health.context} onNavigate={href=>router.push(preserveReturn(href))}/>'), "Projeção na central real sem segundo contexto");
ok((page.match(/<BrainEvidenceWindowCI360 context=/g)||[]).length === 1, "Uma única superfície factual");
ok(page.indexOf('<BrainEvidenceWindowCI360 context=') > page.indexOf('id="insight-evidencias"'), "Painel dentro de evidências sob demanda");
ok(component.includes('useMemo(() => buildBrainEvidenceWindowCI360(context, asOfISO)') && !component.includes('db.') && !component.includes('supabase'), "Reutiliza contexto e não cria segunda query");
ok(component.includes('/saude/medicamentos/historico') && component.includes('/saude/relatorios') && component.includes('/saude/pharmalens') && component.includes('/saude/fornecimento') && component.includes('/saude/plano-seguranca') && component.includes('onNavigate('), "Destinos existentes e retorno contextual");
ok(engine.includes('log.user_id !== userId || log.person_id !== personId') && engine.includes('record.user_id !== userId || record.person_id !== personId'), "Conta e pessoa filtradas novamente na fronteira");
ok(engine.includes('classifyDoseRealization(log)') && engine.includes("evidence.state==='pending'") && engine.includes("evidence.state==='conflict'"), "Tomada real, plano e conflitos separados");
ok(!engine.includes('applyStockDelta') && !engine.includes('mgPer') && !engine.includes('sendMessage') && !engine.includes('diagnosis'), "Sem writes nem equivalência clínica inventada");
ok((gate.match(/"scripts\/test-vault-ci360-p1-evidence.cjs"/g)||[]).length === 1, "Contrato único no gate canônico");
const js = ts.transpileModule(engine, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m = new Module(enginePath,module);m.require=id=>id==='../dose-slot-authority'?require('./vault-macro02-test-pure-loader.cjs').loadMacro02Pure(id):require(id);m._compile(js,enginePath);
const run = m.exports.buildBrainEvidenceWindowCI360;
const now = "2026-11-16T03:00:00.000Z";
const med = (id, person="p") => ({id,nome:id,user_id:"u",person_id:person,status:"ativo"});
const taken = (id, kind="scheduled", at="2026-11-16T01:20:00.000Z", overrides={}) => ({id,user_id:"u",person_id:"p",medicamento_id:"m1",data:"2026-11-16",horario:"22:00",tomado_em:at,dose_kind:kind,synced:true,...overrides});
const health = (id, date="2026-11-15", overrides={}) => ({id,user_id:"u",person_id:"p",data:date,...overrides});
const context = (doseLogs=[],registrosSaude=[],medicamentos=[med("m1"),med("m2")]) => ({userId:"u",personId:"p",hoje:"2026-11-16",doseLogs,registrosSaude,medicamentos});
const rows = [
 taken("scheduled"),
 taken("sos","sos","2026-11-16T00:20:00.000Z"),
 taken("extra","extra","2026-11-15T20:00:00.000Z",{data:"2026-11-15",medicamento_id:"m2"}),
 taken("old","scheduled","2026-11-14T12:00:00.000Z",{data:"2026-11-14"}),
 taken("other-medicine","scheduled","2026-11-14T10:00:00.000Z",{data:"2026-11-14",medicamento_id:"m2"}),
 taken("future","scheduled","2026-11-18T03:00:00.000Z",{data:"2026-11-16"}),
 taken("planned","planned",undefined,{tomado_em:undefined}),
 taken("untrusted-time","scheduled","2026-11-16 00:30",{}),
 taken("ignored","scheduled",undefined,{tomado_em:undefined,ignorado_em:"2026-11-16T02:00:00.000Z"}),
 taken("conflict","scheduled","2026-11-16T01:00:00.000Z",{ignorado_em:"2026-11-16T01:10:00.000Z"}),
 taken("other-person","sos","2026-11-16T01:00:00.000Z",{person_id:"other"}),
 taken("other-user","sos","2026-11-16T01:00:00.000Z",{user_id:"intruder"}),
 taken("unlinked","sos","2026-11-16T01:00:00.000Z",{medicamento_id:"missing"}),
 taken("scheduled"),
];
const result = run(context(rows,[health("r1"),health("r2","2026-11-15",{person_id:"other"})]),now);
ok(result.state==="ready" && result.confirmed24h===3, "Janela móvel usa três confirmações elegíveis, sem duplicatas");
ok(result.scheduled24h===1 && result.sos24h===1 && result.extra24h===1, "SOS, extra e programada independentes");
ok(result.confirmed30d===5 && result.ignored30d===1, "30 dias apenas confirmações reais e ignoradas explícitas");
ok(result.conflicts30d===1 && result.missingTakenClock30d===1 && result.futureTakenClock30d===1, "Conflitos e timestamps inválidos não viram tomados");
ok(result.distinctDoseDays30d===3 && result.distinctRecordDays30d===1 && result.documentedDays30d===3, "Cobertura é união de dias documentados, não adesão");
ok(result.sharedMedicationDays30d===1 && result.sos30d===1 && result.extra30d===1, "Coincidência de medicamentos observacional e SOS separados");
ok(result.sevenDays.length===7 && result.sevenDays[6].confirmed===2, "Sete dias renderizados com ordem canônica");
ok(result.source==="person_scoped_local_snapshot" && result.pendingSync30d===0, "Origem factual identificada sem inventar sincronia");
ok(run(context([taken("only-foreign","sos",undefined,{person_id:"other"})]),now).confirmed24h===0, "Isolamento não mostra outra pessoa");
ok(run(context([taken("pending","sos",undefined,{tomado_em:undefined})]),now).confirmed24h===0, "Sem tomada comprovada não cria consumo");
ok(run({...context(),personId:""},now).state==="unavailable", "Sem titular falha fechada");
ok(run(context(rows),"invalid date").state==="unavailable", "Data de referência inválida falha fechada");
ok(run(context([taken("offset","scheduled","2026-11-15T00:00:00-03:00",{data:"2026-11-15"})]),now).confirmed24h===1, "Fuso com offset respeita limite absoluto de 24h");
ok(run(context([taken("out","scheduled","2026-11-15T02:59:59.000Z",{data:"2026-11-15"})]),now).confirmed24h===0, "Fora da janela de 24h não entra");
ok(run(context([taken("unsynced","sos",undefined,{synced:false})]),now).pendingSync30d===1, "Sincronização pendente distingue cópia local");
ok(run(context([taken("not-ours","sos",undefined,{medicamento_id:"absent"})]),now).confirmed24h===0, "Medicamento ausente da pessoa não vaza contagem");
const snapshot = context(rows,[health("r1")]);const before = JSON.stringify(snapshot);
run(snapshot,now);ok(JSON.stringify(snapshot)===before,"Motor não modifica registros ou contexto de entrada");
console.log(`CI360 P1 — ${checks} contratos e comportamentos aprovados`);
