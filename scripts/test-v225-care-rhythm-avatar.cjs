// VAULT V225: real clinical relationships, owner isolation, no diagnosis.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const pureCache=new Map();
function loadPure(file){
  if(pureCache.has(file))return pureCache.get(file).exports;
  const source=fs.readFileSync(file,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const box={exports:{}};
  pureCache.set(file,box);
  new Function('module','exports','require',compiled)(box,box.exports,(name)=>name==='@/lib/dose-slot-authority'?loadPure('lib/dose-slot-authority.ts'):(()=>{throw new Error('Unexpected runtime dependency '+name)})());
  return box.exports;
}
const {buildCareRhythm,buildCareRhythmInsights}=loadPure(process.env.V225_ENGINE_FILE || 'lib/health-intelligence/care-rhythm.ts');
const today='2026-10-22';
const rec=(id,date,type,value,options={})=>({id,user_id:'u1',person_id:'p1',data:date,horario:'08:00',categoria:type==='sono'||type==='caminhada'?'habito':type==='humor'?'humor':'sintoma',tipo:type,nome:type,unidade_medida:'min',duracao_minutos:value,...options});
const dose=(id,date,kind='scheduled',taken=true,options={})=>({id,user_id:'u1',person_id:'p1',medicamento_id:'med1',data:date,horario:'10:00',dose_kind:kind,tomado_em:taken?`${date}T10:00:00`:undefined,...options});
const dates=['2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22'];
const records=dates.flatMap((date,index)=>[rec(`sleep${index}`,date,'sono',360+index*15),rec(`walk${index}`,date,'caminhada',20)]);
records.push(rec('mood1',dates[0],'humor',undefined,{contexto:'[humor:v1]bem'}));
records.push(rec('mood2',dates[1],'humor',undefined,{contexto:'[humor:v1]triste'}));
records.push(rec('mood3',dates[2],'humor',undefined,{contexto:'neutro'})); // unverified mood excluded
records.push(rec('s1',dates[0],'dor',5),rec('s2',dates[1],'dor',6));
records.push(rec('s1',dates[0],'dor',5)); // duplicate ID ignored
records.push(rec('future','2026-10-23','sono',500));
records.push(rec('impossible','2026-02-30','sono',500));
records.push(rec('other','2026-10-22','sono',700,{person_id:'p2'}));
records.push(rec('wrong-unit','2026-10-21','sono',600,{unidade_medida:'h'}));
records.push(rec('zero','2026-10-22','caminhada',0));
const ctx={personId:'p1',hoje:today,medicamentos:[],tratamentos:[],consultas:[],exames:[],cids:[],cirurgias:[],documentos:[],renovacoes:[],retiradas:[],registrosSaude:records,doseLogs:[dose('a',dates[0],'sos'),dose('b',dates[1],'extra'),dose('c',dates[2],'planned'),dose('d',dates[2],'scheduled',false),dose('e',dates[2],'scheduled',false,{ignorado_em:`${dates[2]}T10:00:00`}),dose('x',dates[2],'sos',true,{person_id:'p2'})]};
const summary=buildCareRhythm(ctx,30,today);
assert.equal(summary.sleep.days,5);
assert.equal(summary.sleep.averageMinutes,390);
assert.equal(summary.walk.days,5);
assert.equal(summary.walk.recordedMinutes,100);
assert.equal(summary.mood.declaredDays,2);
assert.equal(summary.mood.positiveDays,1);
assert.equal(summary.symptoms.records,2);
assert.equal(summary.symptoms.documentedDays,2);
assert.equal(summary.overlap.sleepAndSymptoms,2);
assert.equal(summary.overlap.walkAndMood,2);
assert.equal(summary.overlap.sleepAndSosExtra,2);
assert.equal(summary.doses.taken,2);
assert.equal(summary.doses.sosExtra,2);
assert.equal(summary.doses.ignored,1);
assert.equal(summary.recentDays.length,7);
assert.equal(summary.recentDays[0].date,'2026-10-16');
assert.equal(summary.dataQuality.excludedInvalid,1);
assert.equal(buildCareRhythm({...ctx,personId:'p2'},30,today).sleep.days,1);
assert.equal(buildCareRhythm(ctx,7,'2026-02-30').recentDays.length,0);

// V225 R2: factor analysis only compares two *observed* subsets.
const observedDates=['2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20'];
const paired=observedDates.flatMap((date,index)=>[
  rec(`paired-s-${index}`,date,'sono',index<4?360:480),
  rec(`paired-w-${index}`,date,'caminhada',index<4?15:40),
  rec(`paired-m-${index}`,date,'humor',undefined,{contexto:index<4?'[humor:v1]triste':'[humor:v1]bem'})
]);
const pairedSummary=buildCareRhythm({...ctx,registrosSaude:paired,doseLogs:[]},30,today);
assert.equal(pairedSummary.factorComparisons.length,2);
assert.equal(pairedSummary.factorComparisons[0].below.days,4);
assert.equal(pairedSummary.factorComparisons[0].atLeast.days,4);
assert.equal(pairedSummary.factorComparisons[0].below.averageScore,2);
assert.equal(pairedSummary.factorComparisons[0].atLeast.averageScore,4);
assert.equal(pairedSummary.factorComparisons[0].confidence,'baixa');
assert.equal(buildCareRhythm({...ctx,registrosSaude:paired.filter(x=>x.tipo!=='humor'),doseLogs:[]},30,today).factorComparisons.length,0,'No reported mood is not neutral mood');
assert.equal(buildCareRhythm({...ctx,registrosSaude:paired.filter(x=>x.tipo!=='sono'),doseLogs:[]},30,today).factorComparisons.some(f=>f.id==='sleep-mood'),false,'No sleep record does not mean no sleep');
assert.equal(buildCareRhythm({...ctx,registrosSaude:paired.filter(x=>x.data!=='2026-10-13'&&x.data!=='2026-10-14'),doseLogs:[]},30,today).factorComparisons.length,0,'Require minimum 3 days in each group');
const duplicateScheduled=buildCareRhythm({...ctx,registrosSaude:[],doseLogs:[dose('one',today,'scheduled'),dose('two',today,'scheduled')]},7,today);
assert.equal(duplicateScheduled.doses.taken,1,'Scheduled slot collision with distinct IDs cannot double-count');
const parallelSos=buildCareRhythm({...ctx,registrosSaude:[],doseLogs:[dose('one',today,'sos'),dose('two',today,'sos')]},7,today);
assert.equal(parallelSos.doses.sosExtra,2,'Distinct real SOS entries must stay independent');
assert.equal(buildCareRhythm({...ctx,registrosSaude:[rec('a',today,'sono',400,{user_id:'u1'}),rec('b',today,'sono',500,{user_id:'u2'})],doseLogs:[]},7,today).dataQuality.ownershipConflict,true);
const local=buildCareRhythm({...ctx,registrosSaude:[rec('unsynced',today,'sono',400,{synced:false})],doseLogs:[dose('dose-unsynced',today,'sos',true,{synced:false})]},7,today);
assert.equal(local.dataQuality.localUnsynced,2);

const insights=buildCareRhythmInsights(ctx);
assert.equal(insights.length,3);
assert.ok(insights.every(x=>x.kind==='observation'&&x.confianca!=='alta'&&x.amostra>=2));
assert.ok(insights.every(x=>x.limitacaoSeguranca?.includes('não demonstra causalidade')));
const scarce=buildCareRhythmInsights({...ctx,registrosSaude:records.slice(0,1),doseLogs:[]});
assert.equal(scarce.length,0,'Sparse input cannot yield false correlation');

if(process.argv.includes('--pure')) {console.log('VAULT V225 PURE ENGINE: valid date/unit, person scope, reports, sync-neutrality and observational insights OK');process.exit(0);}

const brain=fs.readFileSync('lib/health-intelligence/longitudinal-insights.ts','utf8');
const report=fs.readFileSync('lib/clinical-report.ts','utf8');
const reportPage=fs.readFileSync('app/saude/registros/relatorio/page.tsx','utf8');
const avatar=fs.readFileSync('components/saude/HealthAvatar3D.tsx','utf8');
const avatarPanel=fs.readFileSync('app/saude/minha-saude/page.tsx','utf8');
const mood=fs.readFileSync('components/saude/AvatarMoodEvidence.tsx','utf8');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
for(const [path,source] of [['lib/clinical-report.ts',report],['lib/health-intelligence/longitudinal-insights.ts',brain],['app/saude/registros/relatorio/page.tsx',reportPage],['app/saude/minha-saude/page.tsx',avatarPanel],['components/saude/HealthAvatar3D.tsx',avatar]]){
 const sf=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(sf.parseDiagnostics.length,0,`Syntax in ${path}: ${sf.parseDiagnostics.map(x=>x.messageText).join('; ')}`);
}
assert.match(brain,/\.\.\.buildCareRhythmInsights\(scoped\)/);
assert.match(brain,/\.\.\.buildRecordedDoseTrendInsight\(scoped, today\)/);
assert.match(report,/rhythm: CareRhythmSummary/);
assert.match(report,/return record.categoria === \"sintoma\";/);
assert.match(brain,/\(item\) => item.categoria === \"sintoma\"/);
assert.match(report,/buildCareRhythm\(context, periodDays/);
assert.match(reportPage,/<CareRhythmPanel summary=\{report.rhythm\}/);
assert.match(fs.readFileSync('app/hoje/page.tsx','utf8'),/Diário rápido do dia/);
assert.match(fs.readFileSync('app/hoje/page.tsx','utf8'),/preset=humor&return_to=/);
assert.match(avatarPanel,/const careRhythm=useMemo/);
assert.match(avatarPanel,/Rotina documentada · últimos 7 dias/);
assert.match(mood,/expressão do Avatar continua dependendo exclusivamente/);
assert.match(avatar,/signalMaterial\.emissiveIntensity=level===0\?\.14/);
assert.match(avatar,/renderer\.forceContextLoss\(\)/);
assert.doesNotMatch(avatar,/requestAnimationFrame\(animate\)/);
assert.match(gate,/scripts\/test-v225-care-rhythm-avatar\.cjs/);
assert.match(gate,/scripts\/test-v224-clinical-journal-consultation-avatar\.cjs/);
assert.match(gate,/scripts\/test-v223-today-longitudinal-avatar\.cjs/);
assert.match(gate,/scripts\/test-v222-continuity-avatar-experience\.cjs/);
console.log('VAULT V225: real recorded rhythm, missing-data neutrality, scope, Brain, report, Avatar and release contracts OK');
