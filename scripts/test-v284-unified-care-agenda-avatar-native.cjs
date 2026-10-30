const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const f=path.resolve(root,rel);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);cache.set(f,m);m.filename=f;m.paths=Module._nodeModulePaths(path.dirname(f));m.require=id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(f),id))+'.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);return m.exports;}
const {buildCareCommitmentAgenda}=load('lib/health-intelligence/care-commitment-agenda.ts');
const forecast={generatedFor:'2026-10-27',windows:[],withdrawals:[],actions:[
 {id:'withdrawal:m',kind:'upcoming_withdrawal',lane:'next',medicationId:'m',medicationName:'Pristiq',date:'2026-11-01',title:'Preparar retirada',reason:'registrada',href:'/retirada',evidence:['data']},
 {id:'planned:m',kind:'planned_acquisition',lane:'next',medicationId:'m',medicationName:'Pristiq',date:'2026-10-30',title:'Compra planejada',reason:'planejamento',href:'/compra',evidence:['data']},
 {id:'stock:m',kind:'stock_projection',lane:'next',medicationId:'m',medicationName:'Pristiq',date:null,title:'Revisar estoque',reason:'projeção',href:'/med',evidence:['projeção']},
 {id:'stock:x',kind:'stock_projection',lane:'follow_up',medicationId:'x',medicationName:'Outro',date:null,title:'Outro',reason:'projeção',href:'/x',evidence:[]},
]};
const agenda=buildCareCommitmentAgenda(forecast);assert.equal(agenda.length,2,'one visible lead per medication');assert.equal(agenda[0].id,'withdrawal:m','recorded withdrawal leads planning and projection');assert.deepEqual(agenda[0].relatedKinds,['planned_acquisition','stock_projection']);assert.equal(agenda[0].href,'/retirada','lead opens original commitment');
const diagnostics=load('lib/dose-reminder-diagnostics.ts');
const pending=[
 {id:2,extra:{personId:'p',type:'dose_stock_review',data:'2026-10-28',horario:'10:00',targetRoute:'/saude/medicamentos/detalhes?id=m'},schedule:{at:'2026-10-28T13:00:00.000Z'}},
 {id:1,extra:{personId:'p',type:'dose_reminder_group',data:'2026-10-27',horario:'23:00',targetRoute:'/hoje'},schedule:{at:new Date('2026-10-28T02:00:00.000Z')}},
 {id:3,extra:{personId:'other',type:'dose_reminder',targetRoute:'/foreign'}},
 {id:2,extra:{personId:'p',type:'dose_stock_review'}},
 {id:4,extra:{personId:'p',type:'dose_reminder',targetRoute:'https://evil.example'}},
];
const details=diagnostics.inspectNativeDoseAgenda(pending,'p');assert.equal(details.length,3,'scope, dedupe and known types');assert.equal(details[0].type,'Doses agrupadas');assert.equal(details[1].type,'Conferir estoque');assert.equal(details[2].target,'/hoje','external target is rejected');
const care=fs.readFileSync(path.join(root,'components/saude/CareForecastAgenda.tsx'),'utf8');
const avatar=fs.readFileSync(path.join(root,'components/saude/MedicationContinuityAvatarSummary.tsx'),'utf8');
const native=fs.readFileSync(path.join(root,'components/saude/NativeDoseAgendaInspection.tsx'),'utf8');
const home=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8'),today=fs.readFileSync(path.join(root,'app/hoje/page.tsx'),'utf8');
const todayActions=fs.readFileSync(path.join(root,'components/hoje/TodayActionCenter.tsx'),'utf8');
assert(care.includes('buildCareCommitmentAgenda(forecast)')&&care.includes('sem misturar os registros'));
assert(avatar.includes('Próximo compromisso registrado')&&avatar.includes('evidenceKind === "recorded"'));
assert(native.includes('Ver horário e destino')&&native.includes('item.target'));
assert(home.includes('healthIntelligence.careCommand?.decision')&&today.includes('command={healthIntelligence.careCommand}')&&todayActions.includes('CareCommandStrip'),'Home and Today retain the shared canonical decision');
console.log('VAULT V284 — AGENDA ÚNICA + AVATAR + INSPEÇÃO ANDROID: OK');
