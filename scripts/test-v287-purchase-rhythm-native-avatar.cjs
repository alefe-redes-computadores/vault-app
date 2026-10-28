const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const f=path.resolve(root,rel);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);cache.set(f,m);m.filename=f;m.paths=Module._nodeModulePaths(path.dirname(f));m.require=id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(f),id))+'.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);return m.exports;}
const rhythm=load('lib/health-intelligence/medication-purchase-rhythm.ts');
const events=[
 {medicamento_id:'m',data:'2026-07-01',data_aquisicao:'2026-07-01',tipo_aquisicao:'comprado'},
 {medicamento_id:'m',data:'2026-07-31',data_aquisicao:'2026-07-31',tipo_aquisicao:'comprado'},
 {medicamento_id:'m',data:'2026-08-31',data_aquisicao:'2026-08-31',tipo_aquisicao:'comprado'},
 {medicamento_id:'m',data:'2026-09-30',data_aquisicao:'2026-09-30',tipo_aquisicao:'comprado'},
 {medicamento_id:'m',data:'2026-10-30',data_aquisicao:'2026-10-30',tipo_aquisicao:'comprado'},
 {medicamento_id:'m',data:'2026-11-29',data_aquisicao:'2026-11-29',tipo_aquisicao:'comprado'},
];
const result=rhythm.analyzeMedicationPurchaseRhythm(events,'m','2026-10-28');
assert.equal(result.typicalIntervalDays,30);assert.equal(result.suggestedDate,'2026-10-30');assert.equal(result.nextPlannedDate,'2026-10-30');assert.equal(result.coveredByPlanning,true);assert.equal(result.confidence,'alta');
const diagnostics=load('lib/dose-reminder-diagnostics.ts');
const pending=[
 {id:1,extra:{personId:'p',type:'health_event',eventKind:'compra',data:'2026-10-30',horario:'12:00',targetRoute:'/saude/renovacao/detalhes?id=r'}},
 {id:2,extra:{personId:'p',type:'health_event',eventKind:'compra',data:'2026-10-29',horario:'12:00',targetRoute:'/saude/renovacao/detalhes?id=r'}},
 {id:3,extra:{personId:'p',type:'health_event',eventKind:'consulta'}},
 {id:4,extra:{personId:'other',type:'health_event',eventKind:'compra'}},
];
const summary=diagnostics.summarizeNativeCareAgenda(pending,'p');assert.equal(summary.total,2);assert.equal(summary.plannedPurchase,2);
const detail=diagnostics.inspectNativeDoseAgenda(pending,'p');assert.equal(detail.length,2);assert(detail.every(item=>item.type==='Compra planejada'&&item.target.includes('id=r')));
const avatar=fs.readFileSync(path.join(root,'components/saude/AvatarCareWorkspace.tsx'),'utf8'),medication=fs.readFileSync(path.join(root,'app/saude/medicamentos/detalhes/page.tsx'),'utf8'),native=fs.readFileSync(path.join(root,'components/saude/NativeDoseAgendaInspection.tsx'),'utf8');
assert(avatar.includes('MedicationPurchaseRhythmBrief'));assert(medication.includes('MedicationPurchaseRhythmCard'));assert(native.includes('visible.plannedPurchase'));
console.log('VAULT V287 — RITMO DE COMPRA + ANDROID + AVATAR: OK');
