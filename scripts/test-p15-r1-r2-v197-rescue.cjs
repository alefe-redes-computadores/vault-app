#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");
const detail=read("app/saude/medicamentos/detalhes/page.tsx");
const timeline=read("components/saude/MedicationDoseEvolutionTimeline.tsx");
const legacy=read("scripts/test-v197-medication-treatment-details.cjs");
const gate=read("scripts/test-v63-release-gate.mjs");
for(const [path,source] of [["detalhes",detail],["evolucao",timeline]])assert.equal(ts.createSourceFile(path+".tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length,0,path+": TSX valido");
assert((detail.match(/vault-deferred/g)||[]).length>=5,"V197: ao menos cinco secoes de renderizacao progressiva no detalhe");
assert(detail.includes('className="vault-deferred" history={med.historico_dosagens}'),"classe de renderizacao passada ao componente real");
assert(timeline.includes('className={`${className} space-y-3'),"classe recebida e aplicada na section real");
assert(detail.includes('history={med.historico_dosagens}')&&detail.includes('formatDay={formatDate}'),"historico e datas originais preservados");
assert(timeline.includes('formatDose(item.dosagem_antiga)')&&timeline.includes('formatDay(item.data_mudanca)'),"dados anteriores e datas permanecem visiveis");
assert(legacy.includes('medicationDetail.match(/vault-deferred/g)')&&gate.includes('scripts/test-v197-medication-treatment-details.cjs'),"V197 original segue intacto no release gate");
assert(gate.includes('scripts/test-p15-r1-r2-v197-rescue.cjs'),"contrato preventivo R2 incluido no gate");
console.log("P15 R1 R2 OK: V197 retido sem texto ficticio; componente realmente usa classe progressiva");
