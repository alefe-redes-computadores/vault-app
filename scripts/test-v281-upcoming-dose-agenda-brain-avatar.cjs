#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const ok=(v,label)=>{assert.ok(v,label);console.log('OK:',label)};
const {buildUpcomingDoseAgenda}=load('lib/health-intelligence/upcoming-dose-agenda.ts');
const row=(id,date,time,extra={})=>({id,user_id:'u',person_id:'p',medicamento_id:'m',data:date,horario:time,dose_kind:'planned',...extra});
const context={userId:'u',personId:'p',hoje:'2026-10-27',medicamentos:[{id:'m',nome:'Fenergan'}],doseLogs:[row('past','2026-10-26','23:00'),row('today','2026-10-27','23:00'),row('tomorrow','2026-10-28','08:00'),row('taken','2026-10-29','08:00',{tomado_em:'2026-10-29T08:00:00'}),row('later','2026-11-20','08:00'),row('other','2026-10-28','09:00',{user_id:'x'})],renovacoes:[],tratamentos:[],registrosSaude:[],consultas:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]};
const agenda=buildUpcomingDoseAgenda(context,7);
assert.equal(agenda.today.length,1);assert.equal(agenda.future.length,1);assert.equal(agenda.next.medicationName,'Fenergan');assert.equal(agenda.hiddenAfterHorizon,1);
ok(true,'agenda limita horizonte, respeita owner/pessoa e exclui passado ou resolvido');
assert.equal(agenda.future[0].dayOffset,1);assert.equal(agenda.future[0].time,'08:00');
ok(true,'hoje e futuro permanecem estados temporais distintos');
const ui=fs.readFileSync(path.join(root,'components/saude/UpcomingDoseAgenda.tsx'),'utf8');
ok(ui.includes('Dose futura é planejamento')&&ui.includes('não aparece como atrasada'),'interface não antecipa julgamento clínico');
const avatar=fs.readFileSync(path.join(root,'components/saude/AvatarCareWorkspace.tsx'),'utf8');
const central=fs.readFileSync(path.join(root,'app/inteligencia/page.tsx'),'utf8');
const history=fs.readFileSync(path.join(root,'components/saude/DoseMonthOverview.tsx'),'utf8');
ok(avatar.includes('<UpcomingDoseAgenda')&&central.includes('<UpcomingDoseAgenda')&&history.includes('<UpcomingDoseAgenda'),'Avatar, Brain e histórico compartilham a mesma agenda');
console.log('\nVAULT V281 — AGENDA FUTURA + BRAIN + AVATAR: OK');
