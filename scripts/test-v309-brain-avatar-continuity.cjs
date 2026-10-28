#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):id.startsWith('./')?load(path.join(path.dirname(rel),id)+(path.extname(id)?'':'.ts')):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {buildConsultationWindow}=load('lib/health-intelligence/consultation-window.ts');
const context={personId:'p',userId:'u',hoje:'2026-10-28',consultas:[{person_id:'p',status:'realizada',data:'2026-10-20'},{person_id:'other',status:'realizada',data:'2026-10-27'}],doseLogs:[{person_id:'p',data:'2026-10-21',tomado_em:'x'},{person_id:'p',data:'2026-10-22',ignorado_em:'x'},{person_id:'p',data:'2026-10-23',dose_kind:'planned'},{person_id:'other',data:'2026-10-24',tomado_em:'x'}],registrosSaude:[{person_id:'p',data:'2026-10-25'},{person_id:'other',data:'2026-10-26'}],retiradas:[{person_id:'p',status:'realizada',data:'2026-10-26'},{person_id:'p',status:'agendada',data:'2026-10-27'}],medicamentos:[{person_id:'p',updated_at:'2026-10-24T12:00:00Z'},{person_id:'other',updated_at:'2026-10-24T12:00:00Z'}]};
const summary=buildConsultationWindow(context,'2026-10-28');
assert.equal(summary.start,'2026-10-20');
assert.deepEqual({health:summary.healthRecords,taken:summary.takenDoses,ignored:summary.ignoredDoses,pending:summary.pendingDoseRecords,withdrawals:summary.realizedWithdrawals,updates:summary.medicationUpdates},{health:1,taken:1,ignored:1,pending:1,withdrawals:1,updates:1},'counts explicit events for the active person only');
assert(summary.evidence.some(line=>line.includes('explicitamente registradas')),'dose authority remains explicit');
const invalid=buildConsultationWindow(context,'');
assert.equal(invalid.days,null);assert.equal(invalid.takenDoses,0,'invalid reference date never invents a window');

const forecast=fs.readFileSync(path.join(root,'lib/health-intelligence/care-forecast.ts'),'utf8');
assert(forecast.includes('kind: "sos_stock_attention"')&&forecast.includes('não projeta consumo nem presume necessidade'),'SOS zero stock is attention, not inferred consumption');
const plan=fs.readFileSync(path.join(root,'lib/health-intelligence/care-plan.ts'),'utf8');
assert(plan.includes('relatedSteps: [...new Set')&&plan.includes('buildConsultationWindow'),'Brain preserves joined steps and consultation evidence');
const panel=fs.readFileSync(path.join(root,'components/health-intelligence/BrainCarePlan.tsx'),'utf8');
assert(panel.includes('Desde a última consulta')&&panel.includes('Dias sem registro não são tratados como falha'),'UI explains the no-inference rule');
const avatar2d=fs.readFileSync(path.join(root,'components/saude/HealthBody.tsx'),'utf8');
const avatar3d=fs.readFileSync(path.join(root,'components/saude/HealthAvatar3D.tsx'),'utf8');
assert(avatar2d.includes('humor explicitamente registrado')&&avatar2d.includes('rotateZ(.35deg)'),'2D posture is contextual and explained');
assert(avatar3d.includes('Não cria animação contínua')&&avatar3d.includes('model.rotation.z'),'3D posture reuses the model without render-loop cost');
console.log('VAULT V309 — Brain temporal, SOS authority, joined care steps and contextual Avatar posture OK');
