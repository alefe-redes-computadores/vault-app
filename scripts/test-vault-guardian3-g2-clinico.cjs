#!/usr/bin/env node
'use strict';
/** Guardian³ G2-01/G2-03 + M5 A11 adversarial evidence. Local mocks only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const read = (p) => fs.readFileSync(p, 'utf8');
let checks = 0;
function ok(test, message) { assert.ok(test, message); checks++; }
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
function compile(p, mocks) {
  const result = ts.transpileModule(read(p), {fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},reportDiagnostics:true});
  ok(!(result.diagnostics || []).some(x=>x.category===ts.DiagnosticCategory.Error), 'Transpilação TS isolada: ' + p);
  const localModule = new Module(p, module);
  localModule.filename = p;
  localModule.paths = [];
  const mockRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks,id)) return mocks[id];
    throw Error('Import não autorizado no ensaio: '+id);
  };
  localModule.require = mockRequire;
  localModule._compile(result.outputText, p);
  return localModule.exports;
}
const fmt = compile('lib/rehab-m5/format-count-a7m5.ts',{}).pluralClinicalCountA7M5;
for (const [noun, expected] of [
  ['sessao',['0 sessões','1 sessão','2 sessões']],
  ['horario',['0 horários','1 horário','2 horários']],
  ['registro',['0 registros','1 registro','2 registros']],
  ['data',['0 datas','1 data','2 datas']],
]) {
  for (const [n,text] of expected.entries()) equal(fmt(n,noun),text,`${noun} ${n}`);
}
equal(fmt(12,'sessao'),'12 sessões','Mais de duas sessões');
for (const n of [-1,1.5,Infinity,NaN,Number.MAX_SAFE_INTEGER+1]) {
  assert.throws(()=>fmt(n,'registro'),/Contagem clínica inválida/);checks++;
}
assert.throws(()=>fmt(1,'desconhecido'),/não reconhecida/);checks++;
const planner=read('components/saude/RehabRecurringPlannerA7M5.tsx');
const finder=read('components/saude/ClinicalRecordFinderA7M5.tsx');
for (const [f,s] of [[planner,'sessão(ões)'],[planner,'horário(s)'],[finder,'registro(s)']]) ok(!f.includes(s),'Plural mecânico ausente: '+s);
for (const phrase of [
  "pluralClinicalCountA7M5(result.created,'sessao')",
  "pluralClinicalCountA7M5(result.skipped,'data')",
  "pluralClinicalCountA7M5(slots.length,'horario')",
  "pluralClinicalCountA7M5(slots.length,'sessao')",
  "result.created===1?'agendada':'agendadas'",
  "slots.length===1?'será cadastrado':'serão cadastrados'",
  "slots.length===1?'agendado':'agendados'",
]) ok(planner.includes(phrase),'Plural contextual presente: '+phrase);
ok(finder.includes("pluralClinicalCountA7M5(found.length,'registro')"),'Seletor tem contagem singular/plural');
ok(finder.includes("found.length===1?'encontrado':'encontrados'"),'Seletor concordância preservada');
for (const phrase of ['min-h-11','<HealthTimePicker','<CustomDatePicker','inFlight.current','setConsent(false)','aria-expanded'])
  ok(planner.includes(phrase),'Contrato UX/guard preservado: '+phrase);
ok(finder.includes('found.slice(0,n)')&&finder.includes('setN(x=>x+24)'),'Seletor não trunca silenciosamente');
const gate=read('scripts/test-v63-release-gate.mjs');
const block=gate.split('const contracts = [')[1]?.split('];')[0]||'';
const list=[...block.matchAll(/"(scripts\/[^"\n]+)"/g)].map(v=>v[1]);
equal(list.length,558,'V63 composto de exatamente 558 contratos');
equal(list.filter(x=>x==='scripts/test-vault-a11-integral-360.cjs').length,1,'A11 unica no V63');
equal(list.filter(x=>x==='scripts/test-vault-guardian3-ux.cjs').length,1,'Guardian3 UX unico no V63');
for (const filename of [
 'scripts/test-vault-a7-m5-clinical-continuity-360.cjs',
 'scripts/test-vault-ga02-ga07-guardian.cjs',
 'scripts/test-vault-a10-integral-360.cjs',
 'scripts/test-vault-guardian-ga01-gp2-clinical.cjs',
]) equal(list.filter(x=>x===filename).length,1,'Contrato permanente exatamente uma vez: '+filename);
ok(gate.includes('if (result.status !== 0) process.exit('),'V63 fail-fast preservado');
ok(gate.includes('if (failedContracts.length > 0)'),'V63 coleta bloqueia qualquer falha');
ok(gate.includes('scripts/test-v70-super-integrity-ux-contract.mjs'),'V70 integridade preservada');
ok(gate.includes('scripts/test-v70-final-completeness-contract.mjs'),'V70 completude preservada');
// Recurrence is intentionally unchanged: local idempotency does not prove cross-device locking.
const recurrence=read('lib/rehab-m5/recurrence-a7m5.ts');
for (const needle of [
 "import {scheduleRehabSessionM5} from './repository'",
 "const current=await db.rehab_sessions_m5.where('[user_id+person_id]').equals([uid,input.personId]).toArray()",
 'const duplicates=new Set(current.filter(',
 'if(duplicates.has(at)){skipped++;continue;}',
 'await scheduleRehabSessionM5(',
 'Falhou em ${slot}',
]) ok(recurrence.includes(needle),'M5 escritor, escopo e dedupe local preservados: '+needle);
const validDay = (s)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function fixture() {
 const saved=[];let writes=0,failAt=0;
 const person={id:'P1',user_id:'U1'},program={id:'R1',user_id:'U1',person_id:'P1',deleted_at:null,status:'active'};
 const db={persons:{get:async()=>person},rehab_programs_m5:{get:async()=>program},rehab_sessions_m5:{where:()=>({equals:()=>({toArray:async()=>saved.slice()})})}};
 const mocks={
  '@/lib/db':{db},
  '@/lib/supabase/local-auth':{getLocalFirstAuthUser:async()=>({data:{user:{id:'U1'}},error:null})},
  './repository':{scheduleRehabSessionM5:async (input)=>{writes++;if(failAt&&writes===failAt)throw Error('falha de escrita simulada');saved.push({id:'S'+writes,user_id:'U1',person_id:'P1',program_id:input.programId,scheduled_at:input.scheduledAt,deleted_at:null});}},
  '@/lib/surgery-a7/types':{validDayA7:validDay},
 };
 return {api:compile('lib/rehab-m5/recurrence-a7m5.ts',mocks),saved,setFail:(n)=>{failAt=n;},getWrites:()=>writes};
}
const common={personId:'P1',programId:'R1',startDay:'2026-11-23',endDay:'2026-11-29',weekdays:[1,3,5],clock:'09:00',mode:'clinic',timezone:'America/Sao_Paulo'};
(async()=>{
 const a=fixture();
 equal(a.api.expandRehabSlotsA7M5(common).length,3,'Três dias civis planejados');
 equal(await a.api.scheduleRehabSeriesA7M5(common),{created:3,skipped:0,total:3},'Primeiro cadastro local');
 equal(await a.api.scheduleRehabSeriesA7M5(common),{created:0,skipped:3,total:3},'Reexecução local não duplica');
 equal(a.saved.length,3,'Persistências locais sem duplicatas');
 const b=fixture();
 b.setFail(2);
 await assert.rejects(()=>b.api.scheduleRehabSeriesA7M5(common),/Foram criadas 1 sessões, 0 já existiam/);checks++;
 equal(b.saved.length,1,'Falha parcial não apaga primeira gravação');
 const left=fixture(),right=fixture();
 await Promise.all([left.api.scheduleRehabSeriesA7M5({...common,endDay:common.startDay,weekdays:[1]}),right.api.scheduleRehabSeriesA7M5({...common,endDay:common.startDay,weekdays:[1]})]);
 equal(left.saved.length,1,'Dispositivo A: gravação local isolada');
 equal(right.saved.length,1,'Dispositivo B: gravação local isolada');
 equal(left.saved[0].scheduled_at,right.saved[0].scheduled_at,'Lacuna A11: dois aparelhos conseguem registrar mesmo horário antes do pull');
 ok(!recurrence.includes('onConflict')&&!recurrence.includes('server-side unique'),'Sem alegar deduplicação remota não implementada');
 console.log(`GUARDIAN3_G2_CLINICO_OK | ${checks} verificações herméticas | sem SQL/rede | A11: concorrência real não homologada`);
})().catch(e=>{console.error('GUARDIAN3_G2_CLINICO_BLOQUEADO',e);process.exitCode=1;});
