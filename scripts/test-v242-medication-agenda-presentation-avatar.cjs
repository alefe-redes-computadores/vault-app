#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {plannedPrescriptionAgendaState,medicationCarePresentation}=load('lib/health-intelligence/medication-care-decision.ts');
assert.deepEqual(plannedPrescriptionAgendaState('2026-10-22','2026-10-23','2026-10-23'),{visible:true,overdue:true,day:'2026-10-22'});
assert.deepEqual(plannedPrescriptionAgendaState('2026-10-22','2026-10-24','2026-10-23'),{visible:false,overdue:false,day:'2026-10-22'});
assert.deepEqual(plannedPrescriptionAgendaState('2026-10-25','2026-10-25','2026-10-23'),{visible:true,overdue:false,day:'2026-10-25'});
assert.equal(medicationCarePresentation({stage:'withdrawal_overdue'},null).tone,'critical');
assert.equal(medicationCarePresentation({stage:'acquisition_planned'},null).tone,'planning');
assert.equal(medicationCarePresentation({stage:'stable'},'nenhuma').tone,'stable');
const list=read('app/saude/medicamentos/page.tsx');
assert(list.includes('medicationCarePresentation(careDecision, insight?.urgencia)'),'lista tolera insight ausente');
assert(!list.includes('insight.urgencia ==='),'acesso inseguro removido');
const today=read('app/hoje/page.tsx');
for(const token of ['plannedPrescriptionAgendaState(','continua pendente até registrar ou reagendar','router.push(evento.actionHref)','evento.atrasada ? "Pendente"'])assert(today.includes(token),`Hoje: ${token}`);
const notifications=read('lib/notifications.ts');
assert(notifications.includes('"Renovação de receita"'));
assert(notifications.includes('abra o Vault para registrar ou reagendar'));
const avatar=read('components/saude/HealthAvatar3D.tsx');
assert(avatar.includes('V242: volume labial curto'));
assert(avatar.includes('const lipTint=oval('));
console.log('V242 MEDICATION AGENDA + PRESENTATION + AVATAR: pendência persistente, tons, notificação e face OK');
