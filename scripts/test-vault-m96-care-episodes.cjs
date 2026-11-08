"use strict";
/** Hermetic M96 contract. Zero network, zero clinical writes, zero Supabase. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
let count = 0;
const ok = (v, label) => {assert.ok(v, `M96: ${label}`); console.log(`✓ M96 ${++count}: ${label}`);};
const read = (p) => fs.readFileSync(p, "utf8");
function compile(path) {
  const text = read(path);
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  ok(source.parseDiagnostics.length === 0, `sintaxe ${path}`);
  return ts.transpileModule(text, {fileName:path, compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}}).outputText;
}
function pure(path, dependencies = {}) {
  const exports = {};
  const module = {exports};
  new Function("module", "exports", "require", compile(path))(module, exports, (key) => {
    if (Object.prototype.hasOwnProperty.call(dependencies, key)) return dependencies[key];
    throw new Error(`Importação inesperada no teste hermético: ${key}`);
  });
  return module.exports;
}
const safety = pure("lib/clinical-safety-episodes.ts");
const {buildCareEpisodesFromLedger} = pure("lib/health-intelligence/care-episodes.ts", {"@/lib/clinical-safety-episodes": safety});
const TODAY = "2026-11-08T18:00:00.000Z";
const ms = (days) => new Date(Date.parse(TODAY)-days*86400000).toISOString();
const makeAlert = (key, meds, age = 1, severity = "atencao", overrides = {}) => ({
  key, person_id:"p1", insight_id:`insight-${key}`, family:"medication", state:"active",
  first_detected_at:ms(age), last_detected_at:ms(age),
  snapshot:{kind:"alert",categoria:"uso_sos",titulo:`Sinal ${key}`, mensagem:"Texto demonstrativo, sem causalidade",urgencia:severity === "critica" ? "alta" : "media",
    gravidade_seguranca:severity,entidade_tipo:"medicamento",entidade_id:meds[0],entidade_ids:meds,
    evidencias:[],fontes_internas:[],fontes_externas:[]}, ...overrides,
});
const own = (extra = {}) => ({personId:"p1",userId:"u1",medicamentos:[{id:"a",user_id:"u1",person_id:"p1",nome:"Medicamento A"},{id:"b",user_id:"u1",person_id:"p1",nome:"Medicamento B"},{id:"c",user_id:"u1",person_id:"p1",nome:"Medicamento C"}],doseLogs:[],registrosSaude:[],...extra});
const a = makeAlert("a1", ["a"], 1);
const b = makeAlert("b1", ["a", "b"], 2, "critica");
const c = makeAlert("c1", ["b"], 3);
const foreign = makeAlert("foreign", ["a"], 1, "critica", {person_id:"other"});
const input = [a,b,c,foreign];
const clone = JSON.stringify(input);
let grouped = buildCareEpisodesFromLedger(own(), input, TODAY);
ok(grouped.length === 1 && grouped[0].signals.length === 3, "combinação explícita entre medicamentos compartilha sinais sem falsos novos alerts");
ok(grouped[0].requiresAttention && grouped[0].severity === "critica", "maior gravidade original preservada e prioritária");
ok(grouped[0].personId === "p1" && !grouped[0].signalKeys.includes("foreign"), "ledger da outra pessoa nunca contamina episódio");
ok(grouped[0].readOnly && grouped[0].interpretation === "temporal_association_not_causality", "agrupamento não gera diagnóstico nem relação causal");
ok(grouped[0].signals.every(x => x.nature === "pharmacological_risk_hypothesis"), "interpretações do Brain não viram fatos clínicos");
ok(JSON.stringify(input) === clone, "não muta os snapshots originais");
ok(JSON.stringify(buildCareEpisodesFromLedger(own(), [...input].reverse(), TODAY)) === JSON.stringify(grouped), "ordenar o ledger não altera resultado determinístico");
ok(buildCareEpisodesFromLedger(own(), [a,makeAlert("unrelated",["c"],2)], TODAY).length === 0, "sem vínculo farmacêutico explícito não agrupa");
ok(buildCareEpisodesFromLedger(own(), [a,makeAlert("late",["a"], 15)], TODAY).length === 0, "fora de 14 dias não consolida");
ok(buildCareEpisodesFromLedger(own(), [a, makeAlert("resolved",["a"],2,"critica",{state:"resolved"})], TODAY).length === 0, "alertas históricos resolvidos não reabrem por projeção");
ok(buildCareEpisodesFromLedger(own(), [a,makeAlert("unknown",["unknown"],1)], TODAY).length === 0, "medicamento não cadastrado é excluído do agrupamento");
ok(buildCareEpisodesFromLedger(own({userId:""}), input, TODAY).length === 0, "sem conta ativa falha fechado");
ok(buildCareEpisodesFromLedger(own({personId:""}), input, TODAY).length === 0, "sem pessoa ativa falha fechado");
ok(buildCareEpisodesFromLedger(own({medicamentos:own().medicamentos.map(m=>({...m,user_id:"other"}))}), input, TODAY).length === 0, "não lê medicamentos de outra conta");
ok(buildCareEpisodesFromLedger(own(), input, "not a date").length === 0, "timestamp de consulta inválido falha fechado");
const gap = makeAlert("gap", ["a"],1,"atencao",{insight_id:"longitudinal-gap-metadona-a"});
grouped = buildCareEpisodesFromLedger(own(),[a,gap],TODAY);
ok(grouped.length === 1 && grouped[0].signals.some(x=>x.nature==="unconfirmed_gap"), "lacuna de log nunca é interrupção confirmada");
ok(!grouped[0].evidenceRefs.some(ref=>ref.nature==="documented_fact"), "sem DoseLog verificado não fabrica fatos");
const dose={id:"d1",user_id:"u1",person_id:"p1",medicamento_id:"a",data:"2026-11-07",horario:"10:00",tomado_em:"2026-11-07T10:05:00.000Z",quantidade:40,dose_kind:"sos"};
const confirmed=makeAlert("quantity",["a"],1,"importante",{insight_id:"quantidade-confirmada-a-d1",snapshot:{...a.snapshot, gravidade_seguranca:"importante",evidencias:["Quantidade registrada: 40 gotas","Referência interna: 5 gotas"],entidade_id:"a"}});
const validContext=own({doseLogs:[dose]});
grouped=buildCareEpisodesFromLedger(validContext,[a,confirmed],TODAY);
ok(grouped.length===1 && grouped[0].evidenceRefs.some(r=>r.entityType==="dose_log"&&r.entityId==="d1"&&r.binding==="exact"&&r.nature==="documented_fact"), "usa somente verificação M95 para vínculo exato com dose");
ok(!grouped[0].evidenceRefs.some(r=>r.description.includes("dose segura")), "referência interna não vira dose clinicamente segura");
ok(buildCareEpisodesFromLedger(own({doseLogs:[{...dose,quantidade:5}]}),[a,confirmed],TODAY)[0].evidenceRefs.every(r=>r.entityType!=="dose_log"), "quantidade editada invalida vínculo exato obsoleto");
ok(buildCareEpisodesFromLedger(own({doseLogs:[{...dose,user_id:"other"}]}),[a,confirmed],TODAY)[0].evidenceRefs.every(r=>r.entityType!=="dose_log"), "dose de outra conta não aparece");
const report={id:"r1",user_id:"u1",person_id:"p1",medicamento_id:"a",data:"2026-11-07",horario:"11:22",categoria:"sintoma",nome:"Sintoma declarado",tipo:"observacao"};
grouped=buildCareEpisodesFromLedger(own({registrosSaude:[report]}),[a,gap],TODAY);
ok(grouped[0].evidenceRefs.some(r=>r.nature==="user_reported_state"&&r.binding==="user_linked"&&r.entityId==="r1"), "relato pessoal vinculado ao medicamento conserva origem");
ok(buildCareEpisodesFromLedger(own({registrosSaude:[{...report,medicamento_id:"c"}]}),[a,gap],TODAY)[0].evidenceRefs.every(r=>r.entityType!=="health_record"), "relato sem vínculo farmacêutico não é forçado");
ok(buildCareEpisodesFromLedger(own({registrosSaude:[{...report,person_id:"other"}]}),[a,gap],TODAY)[0].evidenceRefs.every(r=>r.entityType!=="health_record"), "relato de outra pessoa nunca aparece");
ok(buildCareEpisodesFromLedger(own({registrosSaude:[{...report,data:"2026-02-30"}]}),[a,gap],TODAY)[0].evidenceRefs.every(r=>r.entityType!=="health_record"), "data impossível excluída");
const hook=read('hooks/useBrainV5Alerts.ts'); compile('hooks/useBrainV5Alerts.ts');
ok(hook.includes('buildCareEpisodesFromLedger')&&hook.includes('careEpisodes,')&&hook.includes('health.context?.personId === activePersonId'), "hook reaproveita contexto compartilhado sem novo motor clínico");
const panel=read('components/vault-intelligence/CareEpisodesPreview.tsx');compile('components/vault-intelligence/CareEpisodesPreview.tsx');
ok(panel.includes('onOpenSignal(signal.key)') && panel.includes('Agrupamento experimental') && panel.includes('if (!episodes.length) return null'), "UI é progressiva, read-only e abre alerta original");
const page=read('app/inteligencia/alertas/page.tsx');compile('app/inteligencia/alertas/page.tsx');
ok(page.includes('<CareEpisodesPreview episodes={brain.careEpisodes}')&&page.includes('onOpenSignal={key=>'), "Central incorpora episódios sem esconder cards existentes");
const notification=read('lib/health-intelligence/notification-policy.ts');
ok(!notification.includes('care-episodes'), "elegibilidade e dedupe das notificações clínicas intocados");
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-vault-m96-care-episodes.cjs"') && gate.includes('"scripts/test-vault-m95-monthly-safety.cjs"'), "teste M96 na release gate preservando M95");
console.log(`VAULT M96 V5.1-A: ${count} verificações e cenários determinísticos OK.`);
