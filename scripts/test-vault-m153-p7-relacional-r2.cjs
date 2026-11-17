#!/usr/bin/env node
"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const read = p => fs.readFileSync(p,'utf8');
let total = 0;
function ok(value, label){assert.ok(value,`P7 R2: ${label}`); console.log(`✓ ${++total}: ${label}`)}
for (const path of [
 'app/page.tsx','app/saude/medicamentos/page.tsx','components/hoje/TodayFilterPanel.tsx',
 'lib/health-intelligence/medication-treatment-links-p7.ts']) {
 const parsed = ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,`sintaxe ${path}`);
}
const pure = 'lib/health-intelligence/medication-treatment-links-p7.ts';
const mod = new Module(pure,module);
mod._compile(ts.transpileModule(read(pure), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,pure);
const {indexMedicationTreatmentsP7:index, safeTreatmentColorP7:safeColor}=mod.exports;
ok(safeColor('#ab34Cd') === '#AB34CD','cor legitima hexadecimal');
for (const bad of ['red','url(javascript:1)','var(--x)','#1234','rgb(1,2,3)',' #123456;color:red'])
 ok(safeColor(bad)===null,`cor CSS nao confiavel rejeitada: ${bad}`);
const mk=(id,extra={})=>({id,user_id:'u',person_id:'p',tratamento_ids:[],...extra});
const mt=(id,extra={})=>({id,user_id:'u',person_id:'p',nome:'Tratamento '+id,medicamento_ids:[],cor:'#aabbcc',...extra});
const input={userId:'u',personId:'p', medications:[
 mk('m1',{tratamento_ids:['t1']}),mk('m2'),mk('m3',{tratamento_ids:['t2']}),
 mk('foreign-u',{user_id:'other',tratamento_ids:['t1']}),
 mk('foreign-p',{person_id:'other',tratamento_ids:['t1']}),
 mk(undefined,{tratamento_ids:['t1']})],
 treatments:[
 mt('t1',{medicamento_ids:['m1','m2','m2','foreign-u','foreign-p']}),
 mt('t2',{medicamento_ids:['m1'],cor:'url(javascript:1)'}),
 mt('bad-user',{user_id:'other',medicamento_ids:['m1']}),
 mt('bad-person',{person_id:'other',medicamento_ids:['m1']}),
 mt(undefined,{medicamento_ids:['m1']})]};
let map=index(input);
ok(map.get('m1')?.length===2,'ambas direcoes, sem duplicar vinculo repetido');
ok(map.get('m2')?.length===1 && map.get('m2')[0].id==='t1','vinculo explicito tratamento > medicamento');
ok(map.get('m3')?.length===1 && map.get('m3')[0].id==='t2','vinculo explicito medicamento > tratamento');
ok(!map.has('foreign-u')&&!map.has('foreign-p'),'isolamento de titularidade na medicacao');
ok(map.get('m1')?.every(x=>x.id!=='bad-user' && x.id!=='bad-person'),'isolamento de titularidade no tratamento');
ok(map.get('m1')?.find(x=>x.id==='t2')?.cor===null,'cor suspeita nao propagada');
ok(index({...input,personId:null}).size===0 && index({...input,userId:''}).size===0,'sem pessoa ou conta, sem dados');
ok(index({...input,userId:'other',personId:'p'}).size===0,'outra conta nao recebe vinculos');
const meds=read('app/saude/medicamentos/page.tsx'),home=read('app/page.tsx'),filters=read('components/hoje/TodayFilterPanel.tsx');
ok(meds.includes('indexMedicationTreatmentsP7(')&&meds.includes('db.tratamentos.where("[user_id+person_id]")')&&meds.includes('[treatmentOwner.id, activePersonId]'),'query reativa na conta/pessoa');
ok(meds.includes('med.id ? (treatmentsByMedication.get(med.id) || []) : []'),'ID opcional protegido');
ok(meds.includes('data-vault-med360-treatment-tags')&&meds.includes('cardTreatments.length > 0')&&meds.includes('cardTreatments.slice(0,compactCards ? 2 : 3)')&&meds.includes('getVaultTreatmentIcon(t.nome)'),'etiquetas individuais por tratamento, com limite de densidade');
ok(meds.includes('safeTreatmentColorP7(t.cor)')&&meds.includes('style={color?{borderColor:`${color}66`,backgroundColor:`${color}12`,color}:undefined}'),'cores individuais passam pelo sanitizador canônico');
ok(meds.includes('railSize="label"')&&meds.includes('[writing-mode:vertical-rl]'),'tarja R5 inalterada');
ok(meds.includes('selectedRegulatory.sourceLabel')&&meds.includes('selectedRegulatory.verified'),'fonte e verificacao permanecem no dialogo');
ok((meds.match(/setSelectedRegulatory\(regulatoryProfile\)/g)||[]).length===1,'somente um handler regulatorio');
ok(meds.includes('max-w-[380px]')&&meds.includes('overflow-y-auto overscroll-contain')&&meds.includes('safe-area-inset-bottom'),'modal com altura e Safe Area');
ok(home.includes('feedback === "already_knew"')&&home.includes('retiradasAgendaM147.slice(0, 3)'),'Brain e retiradas da R5 preservados');
ok(home.includes('grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2'),'cards responsivos nos 320 px');
ok(filters.includes('fixed inset-x-3')&&filters.includes('min-[600px]:absolute')&&filters.includes('closeOnSelect'),'filtro mobile acessivel');
ok(!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["']/s.test(meds),'nenhum seletor nativo novo');
const v76=read('scripts/test-v76-1-regulatory-edge-contract.mjs');
ok(v76.includes('max-w-[380px]')&&v76.includes('safe-area-inset-bottom')&&v76.includes('overscroll-contain'),'V76.1 exige modal seguro e responsivo');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-m153-p7-relacional-r2.cjs"').length===2,'registrado exatamente uma vez no V63');
console.log(`VAULT M153 P7 RELACIONAL R2 — ${total} testes comportamentais/contratuais OK`);
