#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const cache=new Map();
function load(rel){
 const full=path.join(root,rel);if(cache.has(full))return cache.get(full).exports;
 const src=fs.readFileSync(full,'utf8');const parsed=ts.transpileModule(src,{fileName:full,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 assert.deepEqual((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],rel);
 const mod=new Module(full,module);mod.filename=full;mod.paths=Module._nodeModulePaths(path.dirname(full));cache.set(full,mod);
 mod.require=id=>{if(id.startsWith('@/lib/health-intelligence/'))return load(`lib/health-intelligence/${id.split('/').at(-1)}.ts`);throw Error('Unexpected runtime import '+id+' from '+rel)};
 mod._compile(parsed.outputText,full);return mod.exports;
}
const {buildDoseMonthMetrics}=load('lib/health-intelligence/dose-month-metrics.ts');
const date='2026-10-22',owned={user_id:'u1',person_id:'p1'};
const dose=(id,day,hour,kind,opts={})=>({id,medicamento_id:'m1',data:day,horario:hour,dose_kind:kind,...owned,...opts});
const logs=[
 dose('a',date,'09:00','scheduled',{tomado_em:'2026-10-22T09:03:00',synced:false}),
 dose('dup',date,'09:00','scheduled',{ignorado_em:'2026-10-22T09:10:00'}),
 dose('other',date,'10:00','scheduled',{ignorado_em:'2026-10-22T10:00:00'}),
 dose('take2',date,'15:00','scheduled',{tomado_em:'2026-10-22T15:00:00'}),
 dose('pending',date,'11:00','planned'),
 dose('sos1',date,'12:00','sos',{tomado_em:'2026-10-22T12:00:00'}),
 dose('sos2',date,'12:00','sos',{tomado_em:'2026-10-22T12:05:00'}),
 dose('extra',date,'14:00','extra',{tomado_em:'2026-10-22T14:00:00'}),
 dose('foreign',date,'09:00','scheduled',{user_id:'u2',tomado_em:'2026-10-22T09:00:00'}),
 dose('anotherPerson',date,'09:00','scheduled',{person_id:'p2',tomado_em:'2026-10-22T09:00:00'}),
 dose('future','2026-10-23','09:00','scheduled',{tomado_em:'2026-10-23T09:00:00'}),
 dose('bad','2026-02-30','09:00','scheduled',{tomado_em:'2026-02-30T09:00:00'}),
];
const month=buildDoseMonthMetrics({logs,personId:'p1',userId:'u1',today:date,days:30});
assert.deepEqual(month.total,{taken:1,ignored:1,unconfirmed:1,conflicts:1,sos:2,extra:1,pendingSync:1});
assert.equal(month.documentedDays,1);assert.equal(month.decisions,2);assert.equal(month.takenOfDecisions,50);
assert.equal(buildDoseMonthMetrics({logs,userId:'u3',personId:'p1',today:date,days:30}).documentedDays,0);
assert.equal(buildDoseMonthMetrics({logs,userId:'u1',personId:'',today:date}).days.length,0);
assert.equal(buildDoseMonthMetrics({logs,userId:'u1',personId:'p1',today:'2026-02-30'}).days.length,0);
const {buildHealthFactorTrend}=load('lib/health-intelligence/health-factor-trends.ts');
const record=(id,date,category,type,intensity,duration,opts={})=>({id,data:date,categoria:category,tipo:type,nome:type,horario:'10:00',intensidade:intensity,duracao_minutos:duration,...owned,...opts});
const records=[record('s1',date,'habito','sono',undefined,410),record('s2',date,'habito','sono',undefined,370),record('s1',date,'habito','sono',undefined,410),record('w',date,'habito','caminhada',undefined,30),record('pain',date,'sintoma','dor',7,undefined),record('pain2',date,'sintoma','dor',5,undefined),record('mood',date,'humor','humor',8,undefined),record('foreign',date,'sintoma','dor',1,undefined,{user_id:'u2'}),record('other',date,'sintoma','dor',1,undefined,{person_id:'p2'}),record('future','2026-10-23','sintoma','dor',1,undefined),record('invalid','2026-02-30','sintoma','dor',1,undefined),record('nonsense',date,'sintoma','dor',20,undefined)];
const input={records,userId:'u1',personId:'p1',today:date,days:7};
const sleep=buildHealthFactorTrend({...input,factor:'sono'}),pain=buildHealthFactorTrend({...input,factor:'sintoma'}),mood=buildHealthFactorTrend({...input,factor:'humor'});
assert.equal(sleep.documentedDays,1);assert.equal(sleep.max,410);assert.equal(sleep.samples,2);
assert.equal(pain.mean,6);assert.equal(pain.samples,2);assert.equal(mood.mean,8);
assert.equal(buildHealthFactorTrend({...input,factor:'sintoma',userId:'u2'}).samples,1);
assert.equal(buildHealthFactorTrend({...input,factor:'sintoma',userId:''}).samples,0);
const {buildSymptomTrendObservations}=load('lib/health-intelligence/health-factor-observations.ts');
const seven=[20,19,18,17],older=[13,12,11,10];
const symptoms=[...seven.map((d,i)=>record('current'+i,`2026-10-${d}`,'sintoma','dor',7,undefined)),...older.map((d,i)=>record('old'+i,`2026-10-${d}`,'sintoma','dor',3,undefined))];
const context={registrosSaude:symptoms,userId:'u1',personId:'p1',hoje:date};
const insights=buildSymptomTrendObservations(context);
assert.equal(insights.length,1);assert.equal(insights[0].kind,'observation');assert.equal(insights[0].periodoDias,14);
assert.equal(buildSymptomTrendObservations({...context,userId:undefined}).length,0);
assert.equal(buildSymptomTrendObservations({...context,hoje:'2026-02-30'}).length,0);
assert.equal(buildSymptomTrendObservations({...context,registrosSaude:symptoms.slice(0,2)}).length,0);
// Real composed app files, not only synthetic anchors.
const requires={
 'app/hoje/page.tsx':['<DoseMonthOverview','personId={activePersonId}','import { DoseMonthOverview }'],
 'app/saude/minha-saude/page.tsx':['<HealthTrendsExplorer','<AvatarCareWorkspace','import { HealthTrendsExplorer }'],
 'app/saude/tratamentos/detalhes/page.tsx':['<TreatmentSymptomTimeline dossier={careDossier}','<TreatmentVisitBrief dossier={careDossier}'],
 'components/saude/TreatmentCareLinks.tsx':['Aquisições vinculadas','Documentos relacionados','/saude/renovacao/detalhes?id=','/saude/documentos/detalhes?id='],
 'lib/health-insights.ts':['buildSymptomTrendObservations','insights.push(...buildSymptomTrendObservations('],
 'scripts/test-v63-release-gate.mjs':['scripts/test-v228-final-experience.cjs','scripts/test-v227-care-network-avatar.cjs'],
};
for(const [file,checks] of Object.entries(requires)){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 for(const item of checks)assert.ok(src.includes(item),`${file} missing ${item}`);
 const compiled=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,`Syntax ${file}`);
}
console.log('VAULT V228 QA: 30-day dose calendar, person/account scope, explicit status, SOS, factor comparisons, Brain and Avatar integration, treatment links and release gate OK');
