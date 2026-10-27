#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function resolve(file){for(const candidate of [file,file+'.ts',file+'/index.ts'])if(fs.existsSync(candidate))return candidate;return file;}
function load(rel){const file=resolve(path.isAbsolute(rel)?rel:path.join(root,rel));if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const ok=(condition,label)=>{assert.ok(condition,label);console.log('OK:',label);};
const {buildDoseMonthMetrics}=load('lib/health-intelligence/dose-month-metrics');
const {buildCareRhythm}=load('lib/health-intelligence/care-rhythm');
const {compareRecordedDoseWindows}=load('lib/health-intelligence/recorded-dose-trend');
const {buildPlannedRealizedSummary}=load('lib/health-intelligence/planned-realized');
const owner={user_id:'u',person_id:'p'},day='2026-10-27';
const row=(id,date,time,fields={})=>({id,...owner,medicamento_id:'m',data:date,horario:time,dose_kind:'scheduled',...fields});
const conflict=[row('taken',day,'08:00',{tomado_em:`${day}T08:01:00`}),row('ignored',day,'08:00',{ignorado_em:`${day}T08:02:00`})];
const month=buildDoseMonthMetrics({logs:conflict,userId:'u',personId:'p',today:day,days:7});
assert.deepEqual([month.total.taken,month.total.ignored,month.total.conflicts,month.decisions],[0,0,1,0]);
ok(true,'métrica mensal exclui contradição dos desfechos clínicos');
const base={userId:'u',personId:'p',hoje:day,registrosSaude:[],doseLogs:conflict,medicamentos:[],renovacoes:[],tratamentos:[],consultas:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]};
const rhythm=buildCareRhythm(base,7,day);
assert.equal(rhythm.dataQuality.doseConflicts,1);assert.deepEqual(rhythm.doses,{taken:0,sosExtra:0,ignored:0});
ok(true,'ritmo longitudinal torna conflito visível sem votar tomada');
assert.equal(buildPlannedRealizedSummary(base,7,day).conflicts,1);
ok(true,'planejado versus realizado compartilha a mesma autoridade');
const dates=Array.from({length:28},(_,i)=>new Date(Date.UTC(2026,9,27)-i*86400000).toISOString().slice(0,10));
const trendLogs=dates.map((date,i)=>row(`r${i}`,date,'09:00',i<14?{tomado_em:`${date}T09:00:00`}:{ignorado_em:`${date}T09:00:00`}));
trendLogs.push({...trendLogs[0],id:'contradiction',tomado_em:undefined,ignorado_em:`${dates[0]}T09:02:00`});
const trend=compareRecordedDoseWindows(trendLogs,'u','p',day);
assert.ok(trend&&trend.current.decided===13,'slot contraditório precisa sair da tendência');
ok(true,'tendência usa somente decisões canônicas');
const brief=fs.readFileSync(path.join(root,'components/saude/DoseEvidenceBrief.tsx'),'utf8');
const workspace=fs.readFileSync(path.join(root,'components/saude/AvatarCareWorkspace.tsx'),'utf8');
const central=fs.readFileSync(path.join(root,'app/inteligencia/page.tsx'),'utf8');
ok(brief.includes('Ausência de registro não é dose perdida')&&brief.includes('conflito(s) para revisar'),'resumo explica limites e qualidade dos dados');
ok(workspace.includes('<DoseEvidenceBrief')&&central.includes('<DoseEvidenceBrief'),'Brain e Avatar exibem a mesma evidência');
console.log('\nVAULT V278 — BRAIN + EVIDÊNCIA CANÔNICA DE DOSES: OK');
