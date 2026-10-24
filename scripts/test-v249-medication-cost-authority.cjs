#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const costs=load('lib/health-intelligence/medication-cost-summary.ts');
const base={user_id:'u',person_id:'p',medicamento_id:'m'};
const summary=costs.summarizeMedicationCosts([
 {...base,id:'rx',data:'2026-10-01'},
 {...base,id:'paid',tipo_aquisicao:'comprado',data_aquisicao:'2026-10-10',preco:50},
 {...base,id:'free',tipo_aquisicao:'sus',data_aquisicao:'2026-10-11',preco:800},
 {...base,id:'future',tipo_aquisicao:'comprado',data_aquisicao:'2026-11-02',preco:70},
 {...base,id:'future-unknown',tipo_aquisicao:'comprado',data_aquisicao:'2026-11-03'},
],'2026-10-24');
assert.equal(summary.realized.length,1);assert.equal(summary.realizedTotal,50);assert.equal(summary.realizedAverage,50);
assert.equal(summary.planned.length,2);assert.equal(summary.plannedKnownTotal,70);assert.equal(summary.plannedWithPrice,1);
assert.equal(costs.nextPlannedMedicationCost(summary).id,'future');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
assert(detail.includes('summarizeMedicationCosts(renovacoes, diaFinanceiro)'));
assert(detail.includes('Planejado · não realizado'));
assert(detail.includes('Não entram no gasto, no preço médio nem no estoque'));
assert(!detail.includes('realizedAcquisitionExpense(item, diaFinanceiro)'));
console.log('VAULT V249 — AUTORIDADE DE CUSTO POR MEDICAMENTO: OK');
