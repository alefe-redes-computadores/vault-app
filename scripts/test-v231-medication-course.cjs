#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');const cache=new Map();
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;
 const m=new Module(file,module);m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);
 m.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):require(id);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {temporaryCourseSummaries}=load('lib/health-intelligence/temporary-course-insights.ts');
const note='Tratamento temporário · 2026-10-21 · 4 dia(s)',old='Tratamento temporário · 2026-10-10 · 2 dia(s)';
const med={id:'m',person_id:'p',user_id:'u',nome:'Teste',status:'ativo'};
const row=(id,date,motivo,rest={})=>({id,person_id:'p',user_id:'u',medicamento_id:'m',data:date,horario:'08:00',dose_kind:'planned',motivo,...rest});
const context={personId:'p',userId:'u',hoje:'2026-10-23',medicamentos:[med],doseLogs:[row('a','2026-10-21',note),row('b','2026-10-24',note),row('c','2026-10-10',old,{tomado_em:'2026-10-10T08:00:00'}),row('foreign','2026-10-22',note,{user_id:'x'})]};
const active=temporaryCourseSummaries(context);assert.equal(active.length,1);assert.equal(active[0].overdue,1);assert.equal(active[0].pending,1);assert.equal(active[0].taken,0);
const all=temporaryCourseSummaries(context,true);assert.equal(all.length,2);assert.equal(all[1].taken,1);assert.equal(all[1].pending,0);
assert.deepEqual(temporaryCourseSummaries({...context,userId:'x'},true),[]);
const card=fs.readFileSync(path.join(root,'components/saude/TemporaryCourseMedicationCard.tsx'),'utf8');
assert(card.includes('temporaryCourseSummaries('));assert(card.includes('log.user_id === med.user_id'));assert(card.includes('Ajustar período e horários'));
const detail=fs.readFileSync(path.join(root,'app/saude/medicamentos/detalhes/page.tsx'),'utf8');
assert(detail.includes('<TemporaryCourseMedicationCard med={med} doseLogs={doseLogs}'));assert(detail.includes('intent=posologia'));
const gate=fs.readFileSync(path.join(root,'scripts/test-v63-release-gate.mjs'),'utf8');assert(gate.includes('scripts/test-v231-medication-course.cjs'));
console.log('V231: períodos separados, pendência anterior explícita, histórico concluído, escopo de conta e integração da tela de medicamento OK');
