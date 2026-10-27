const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = file => fs.readFileSync(file,'utf8');
function load(file) {
  const transpiled = ts.transpileModule(source(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  const scopedRequire=(name)=>name==='@/lib/dose-slot-authority'?load('lib/dose-slot-authority.ts'):require(name);
  new Function('module','exports','require',transpiled)(module,module.exports,scopedRequire);
  return module.exports;
}
const {compareRecordedDoseWindows} = load('lib/health-intelligence/recorded-dose-trend.ts');
const {groupScheduleSlots,eligibleGroupDoseKeys} = load('lib/dose-schedule-groups.ts');
const day=(offset)=>new Date(Date.UTC(2026,9,22)-offset*86400000).toISOString().slice(0,10);
const sample=[];
for(let i=0;i<14;i++)sample.push({user_id:'owner',person_id:'p1',medicamento_id:'m1',data:day(i),horario:'08:00',tomado_em:i<12?`${day(i)}T08:00:00`:undefined,ignorado_em:i>=12?`${day(i)}T08:00:00`:undefined});
for(let i=14;i<28;i++)sample.push({user_id:'owner',person_id:'p1',medicamento_id:'m1',data:day(i),horario:'08:00',tomado_em:i<19?`${day(i)}T08:00:00`:undefined,ignorado_em:i>=19?`${day(i)}T08:00:00`:undefined});
const result=compareRecordedDoseWindows(sample,'owner','p1','2026-10-22');
assert.ok(result,'Two documented 14-day periods should produce a trend');
assert.equal(result.current.takenPercent,86);
assert.equal(result.previous.takenPercent,36);
assert.equal(result.deltaPoints,50);
assert.equal(result.confidence,'alta');
assert.equal(compareRecordedDoseWindows(sample,'owner','p2','2026-10-22'),null,'Other person must not enter trend');
assert.equal(compareRecordedDoseWindows(sample,'other','p1','2026-10-22'),null,'Other user must not enter trend');
assert.equal(compareRecordedDoseWindows(sample.slice(0,4),'owner','p1','2026-10-22'),null,'Sparse samples must not produce alerts');
assert.equal(compareRecordedDoseWindows(sample,'owner','p1','2026-02-30'),null,'Invalid date not accepted');
const foreign={...sample[1], user_id:'other',tomado_em:undefined,ignorado_em:'2026-10-21T08:00:00'};
assert.deepEqual(compareRecordedDoseWindows([...sample,foreign],'owner','p1','2026-10-22'),result);
const sos=sample.map(x=>({...x,dose_kind:'sos'}));
assert.equal(compareRecordedDoseWindows(sos,'owner','p1','2026-10-22'),null,'SOS is not scheduled adherence');
const dup={...sample[1],tomado_em:undefined,ignorado_em:'2026-10-21T08:00:00'};
const conflicting=compareRecordedDoseWindows([...sample,dup],'owner','p1','2026-10-22');
assert.ok(conflicting && conflicting.current.decided===13,'Conflicting duplicate excluded without counting twice');
const future={...sample[0],data:'2026-10-23',horario:'07:00',tomado_em:'2026-10-23T07:00:00'};
assert.deepEqual(compareRecordedDoseWindows([...sample,future],'owner','p1','2026-10-22'),result);
const items=[
 {medicamentoId:'a',horario:'10:00',tomada:false,ignorada:false},
 {medicamentoId:'b',horario:'10:00',tomada:false,ignorada:false},
 {medicamentoId:'c',horario:'10:00',tomada:true,ignorada:false},
 {medicamentoId:'d',horario:'10:00',tomada:false,ignorada:false,isAvulsa:true},
 {medicamentoId:'e',horario:'10:00',tomada:false,ignorada:false,isExpectedUnconfirmed:true},
 {medicamentoId:'f',horario:'10:00',tomada:false,ignorada:false,doseKind:'planned'},
 {medicamentoId:'a',horario:'10:00',tomada:false,ignorada:false},
];
assert.equal(groupScheduleSlots(items).length,3,'Three individual cases stay outside the scheduled group');
assert.deepEqual(eligibleGroupDoseKeys(items),['a-10:00','b-10:00'],'Only distinct actionable slots may enter a batch');
assert.deepEqual(eligibleGroupDoseKeys([{medicamentoId:'a',horario:'tomorrow',tomada:false,ignorada:false}]),[]);
const today=source('app/hoje/page.tsx');
const grouped=source('components/saude/DoseScheduleGroups.tsx');
const longitudinal=source('lib/health-intelligence/longitudinal-insights.ts');
const scene=source('components/saude/HealthAvatar3D.tsx');
const gate=source('scripts/test-v63-release-gate.mjs');
for(const [path,text] of [['app/hoje/page.tsx',today],['components/saude/DoseScheduleGroups.tsx',grouped],['components/saude/HealthAvatar3D.tsx',scene],['lib/health-intelligence/longitudinal-insights.ts',longitudinal]]){
 const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,`${path}: TS syntax errors`);
}
assert.match(today,/const handleRevisarHorario = \(items: DoseItemExt\[\]\) =>/);
assert.match(today,/onTakeGroup=\{isHoje \? handleRevisarHorario : undefined\}/);
assert.match(today,/setBatchTargetKeys\(keys\)/);
assert.match(today,/batchOwnerRef\.current !== ownerAtStart/);
assert.match(today,/interrompidoPorTrocaDePessoa/);
assert.match(today,/batchOwnerRef\.current === ownerAtStart \? confirmadas : \[\]/);
assert.match(today,/dosesComEstoqueNoLote\.length===0/);
// V223 R2: the group card passes deduplicated dose ITEMS; the Hoje handler
// converts those items into distinct KEYS before opening the temporal review.
assert.match(grouped,/eligibleGroupDoseItems\(pending\)/, 'The grouped card must filter scheduled pending slots');
assert.match(grouped,/onTakeGroup\(actionable\)/, 'The grouped card must submit filtered items, not unresolved entries');
assert.match(today,/eligibleGroupDoseKeys\(items\)/, 'The Hoje handler converts eligible items into unique medication/time keys');
assert.match(longitudinal,/compareRecordedDoseWindows/);
assert.match(longitudinal,/Ausência de registro não comprova uma dose esquecida/);
assert.match(scene,/V223: sinais circulares discretos no painel Brain/);
assert.match(scene,/cancelAnimationFrame\(frame\);frame=0/);
assert.match(scene,/renderer\.forceContextLoss\(\)/);
assert.doesNotMatch(scene,/requestAnimationFrame\(animate\)/);
assert.match(gate,/test-v223-today-longitudinal-avatar\.cjs/);
console.log('VAULT V223 OK: grouping, batch eligibility, owner-scoped dose evidence, time windows, Avatar and release gate');
