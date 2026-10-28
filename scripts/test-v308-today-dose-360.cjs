#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {buildPendingDoseBacklog}=load('lib/pending-dose-backlog.ts');
const medication={id:'m',user_id:'u',person_id:'p',nome:'Med',dosagem:'10 mg',medico:'',data_receita:'',proxima_renovacao:'',status:'ativo',tipo_uso:'continuo',estoque_horarios:['08:00','20:00','08:00'],created_at:'2026-10-24T12:00:00Z'};
const logs=[{id:'done',user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-10-26',horario:'08:00',tomado_em:'2026-10-26T08:00:00Z',created_at:'',updated_at:''},{id:'other',user_id:'u',person_id:'other',medicamento_id:'m',data:'2026-10-27',horario:'08:00',tomado_em:'x',created_at:'',updated_at:''}];
const rows=buildPendingDoseBacklog({medications:[medication],logs,userId:'u',personId:'p',today:'2026-10-28',currentTime:'10:00',lookbackDays:7});
assert(rows.some(row=>row.data==='2026-10-24'&&row.diaLabel==='Anterior'),'keeps older reviewable days');
assert(!rows.some(row=>row.data<'2026-10-24'),'does not invent slots before local medication history');
assert(!rows.some(row=>row.data==='2026-10-26'&&row.horario==='08:00'),'resolved slot is absent');
assert(rows.some(row=>row.data==='2026-10-28'&&row.horario==='08:00'),'due today is present');
assert(!rows.some(row=>row.data==='2026-10-28'&&row.horario==='20:00'),'future slot today is not overdue');
assert.equal(new Set(rows.map(row=>`${row.data}|${row.horario}`)).size,rows.length,'duplicate schedule times collapse');

const modal=fs.readFileSync(path.join(root,'components/PendingDosesModal.tsx'),'utf8');
assert(modal.includes('resolvedKeysRef')&&modal.includes('doses.filter'),'reactive session does not cycle back to a resolved snapshot');
assert(modal.includes('motivo:\n                        "nao_realizada"'),'not performed is explicit, not inferred from absence');
const today=fs.readFileSync(path.join(root,'app/hoje/page.tsx'),'utf8');
assert(today.includes('finally {\n      // Nenhuma exceção inesperada pode deixar a tela travada'),'batch lock has an unconditional release');
const repository=fs.readFileSync(path.join(root,'lib/repositories/doseLogs.ts'),'utf8');
assert(repository.includes('requestedReason === existingReason'),'same ignored outcome is idempotent');
assert(repository.includes('"nao_realizada"'),'ignored status carries an explicit default reason');
console.log('VAULT V308 — Hoje e Doses 360: backlog, temporal states, session stability and idempotency OK');
