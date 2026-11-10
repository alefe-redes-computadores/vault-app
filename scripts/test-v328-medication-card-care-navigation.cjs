#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
const read = f => fs.readFileSync(f, "utf8");
const card = read("components/list/ListCard.tsx");
const meds = read("app/saude/medicamentos/page.tsx");
const details = read("app/saude/medicamentos/detalhes/page.tsx");
const helper = read("lib/health-intelligence/medication-care-navigation.ts");
for (const [path, source, kind] of [["ListCard.tsx",card,ts.ScriptKind.TSX],["medicamentos.tsx",meds,ts.ScriptKind.TSX],["detalhes.tsx",details,ts.ScriptKind.TSX],["navigation.ts",helper,ts.ScriptKind.TS]]) {
  const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);
  assert.equal(parsed.parseDiagnostics.length,0,`${path}: JSX/TS válido`);
}
assert(meds.includes('railSize="slim"') && meds.includes('aria-label={`Ver classificação da receita:'), "classificação permanece interativa em faixa fina");
assert(meds.includes('writingMode: "vertical-rl"'),"classificação vertical compacta preservada");
assert.equal((meds.match(/setSelectedRegulatory\(regulatoryProfile\)/g)||[]).length,1,"uma ação regulatória, não duas");
assert(meds.includes('medicationRegulatoryShortLabel(regulatoryProfile, receita?.sigla)'),"incerteza e abreviação regulatórias preservadas");
assert(meds.includes('"Conferir SUS"') && meds.includes('"Revisar continuidade"'),"CTAs curtos, sem perda de título completo");
assert(meds.includes('router.push(careAction.href)') && meds.includes('setQuickDoseMedId(med.id!)'),"ações reais preservadas");
assert(meds.includes('aria-label={`${careAction.description} para ${med.nome}`}'),"rótulo completo preservado");
assert(card.includes('railSize === "slim"') && card.includes('isTight ? "p-2.5 pl-6" : "p-3 pl-6"'),"padding fino opt-in sem afetar outras listagens");
assert(details.includes('navigateCareAction(brainCareAction?.href || careDecision.actionHref'),"próxima etapa não reabre mesma rota");
assert(details.includes('navigateCareAction(accessAction.href'),"alerta secundário não reabre mesma rota");
assert(details.includes('document.getElementById(destination.sectionId)?.scrollIntoView'),"revela seção real");
const compiled=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function("module","exports",compiled)(mod,mod.exports);
const resolve=mod.exports.resolveMedicationCareNavigation;
const self="/saude/medicamentos/detalhes?id=m%20x";
assert.deepEqual(resolve({href:self,currentMedicationId:"m x",title:"Revisar continuidade"}),{kind:"section",sectionId:"medicamento-rotina"});
assert.deepEqual(resolve({href:self,currentMedicationId:"m x",title:"Conferir vínculo do processo SUS"}),{kind:"section",sectionId:"medicamento-fornecimento"});
assert.deepEqual(resolve({href:self,currentMedicationId:"m x",title:"Registrar receita"}),{kind:"section",sectionId:"medicamento-jornada"});
assert.deepEqual(resolve({href:self,currentMedicationId:"outro",title:"Revisar continuidade"}),{kind:"route",href:self});
assert.deepEqual(resolve({href:"/saude/renovacao/novo?medicamento_id=m",currentMedicationId:"m"}),{kind:"route",href:"/saude/renovacao/novo?medicamento_id=m"});
assert(meds.includes('supplyRoute?.mode === "hybrid"'), "SUS e comprado independentes");
console.log("VAULT V328/M109: identidade regulatória, densidade e ações de cuidado sem navegação silenciosa OK");
