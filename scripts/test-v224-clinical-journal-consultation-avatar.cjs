// VAULT V224 — native diary and consultation reporting, strict clinical windows,
// person ownership, offline sync disclosures and Avatar mood evidence.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const load = (file, injected={}) => {
  const source=fs.readFileSync(file,'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('module','exports','require',js)(module,module.exports,id=>{
    if(Object.hasOwn(injected,id))return injected[id];
    throw Error(`Unexpected runtime import ${id} in ${file}`);
  });
  return module.exports;
};
const read=f=>fs.readFileSync(f,'utf8');
// V225 R3: the V224 contract now executes the REAL added pure module,
// rather than rejecting a legitimate new import or skipping old assertions.
const rhythm=load('lib/health-intelligence/care-rhythm.ts');
const clinical=load('lib/clinical-report.ts',{
  '@/lib/health-intelligence/care-rhythm':rhythm,
});
const consultation=load('lib/health-intelligence/consultation-brief.ts');
const longitudinal=load('lib/health-intelligence/longitudinal-insights.ts',{
  '@/lib/health-intelligence/recorded-dose-trend':{compareRecordedDoseWindows:()=>null},
  '@/lib/health-intelligence/care-rhythm':rhythm,
});
const today='2026-10-22';
const ctx={personId:'person-A',hoje:today,
  medicamentos:[{id:'m',person_id:'person-A',user_id:'owner',nome:'Medicamento registrado',dosagem:'10 mg'}],
  doseLogs:[{id:'d1',person_id:'person-A',user_id:'owner',medicamento_id:'m',data:today,horario:'08:00',tomado_em:today+'T08:05:00',synced:false},
    {id:'foreign-dose',person_id:'person-B',user_id:'other',medicamento_id:'m',data:today,horario:'09:00',ignorado_em:today+'T09:10:00',synced:false}],
  renovacoes:[],tratamentos:[{id:'t1',person_id:'person-A',user_id:'owner',status:'ativo',nome:'Tratamento informado'},{id:'foreign-treatment',person_id:'person-B',user_id:'other',status:'ativo',nome:'Outro tratamento'}],
  registrosSaude:[{id:'r1',person_id:'person-A',user_id:'owner',categoria:'sintoma',tipo:'dor',nome:'Dor registrada',intensidade:3,data:today,horario:'10:00',synced:false},
    {id:'foreign-record',person_id:'person-B',user_id:'other',categoria:'sintoma',tipo:'dor',nome:'Dor registrada',intensidade:10,data:today,horario:'09:00',synced:false},
    {id:'bad-date',person_id:'person-A',user_id:'owner',categoria:'sintoma',tipo:'dor',nome:'Registro com erro',data:'2026-02-30',horario:'10:00'}],
  consultas:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]};
const report=clinical.buildClinicalReport(ctx,[],7,today);
assert.equal(report.totals.records,1,'Only current person and valid calendar dates count');
assert.equal(report.totals.scheduledTaken,1);
assert.equal(report.totals.ignored,0,'Other person cannot contribute ignored doses');
assert.equal(report.totals.symptoms,1);
assert.equal(report.activeTreatments.length,1);
assert.equal(report.symptoms[0].averageIntensity,3);
assert.equal(report.dataQuality.comparable,false,'Sparse windows cannot produce false percentage comparisons');
assert.equal(report.comparison.recordsDelta,null);
assert.equal(report.dataQuality.discardedRecords,1,'Calendar overflow is not treated as another date');
assert.deepEqual(report.dataQuality.pendingSync,{records:1,doses:1});
// V225 R3 cross-version integration: the REAL rhythm engine retains owner scope.
assert.equal(report.rhythm.symptoms.records,1,'V225 rhythm excludes the foreign symptom');
assert.equal(report.rhythm.doses.taken,1,'V225 rhythm excludes foreign or unrecorded doses');
assert.equal(report.rhythm.dataQuality.localUnsynced,2,'V225 local sync indicator scopes by person');
const brief=consultation.buildConsultationBrief(report);
const text=consultation.formatConsultationBrief(brief);
assert.match(text,/PERGUNTAS PARA O ATENDIMENTO/);
assert.match(text,/Dor registrada/);
assert.match(text,/Tratamento informado/);
assert.match(text,/pendentes de sincronização/);
assert.doesNotMatch(text,/Outro tratamento/);
assert.doesNotMatch(text,/diagnóstico confirmado/);
assert.equal(consultation.buildConsultationBrief({...report,medications:[],symptoms:[],activeTreatments:[],insights:[]}).focus.length,1,'No records produce a neutral report');

const sample=[];
for(let i=0;i<4;i++)sample.push({id:`sym-${i}`,person_id:'person-A',user_id:'owner',categoria:'sintoma',tipo:'ansiedade',nome:'Ansiedade',intensidade:4,data:`2026-10-${String(22-i).padStart(2,'0')}`,horario:'12:00'});
const trends=longitudinal.buildLongitudinalHealthInsights({...ctx,registrosSaude:sample,doseLogs:[]});
assert.ok(trends.length>0,'Repeat current observations may be described within the present window');
assert.equal(trends.some(insight=>/o padrão aumentou|o padrão diminuiu/.test(insight.titulo)),false,'No false change without previous baseline');
assert.ok(trends.some(insight=>/não tem registros suficientes/.test(insight.mensagem)));
const invalid=longitudinal.buildLongitudinalHealthInsights({...ctx,registrosSaude:sample.map(record=>({...record,data:'2026-02-30'})),doseLogs:[]});
assert.equal(invalid.filter(insight=>insight.id.startsWith('longitudinal-')).length,0,'Invalid dates must not produce longitudinal patterns');

for(const file of ['app/saude/registros/page.tsx','app/saude/registros/relatorio/page.tsx','app/saude/registros/novo/page.tsx','app/saude/minha-saude/page.tsx','components/saude/AvatarMoodEvidence.tsx','lib/health-intelligence/longitudinal-insights.ts','lib/clinical-report.ts']){
  const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,`Syntax error: ${file}`);
}
const create=read('app/saude/registros/novo/page.tsx');
const page=read('app/saude/registros/page.tsx');
const viewer=read('app/saude/registros/relatorio/page.tsx');
const mood=read('components/saude/AvatarMoodEvidence.tsx');
const avatar=read('app/saude/minha-saude/page.tsx');
const gate=read('scripts/test-v63-release-gate.mjs');
assert.match(create,/\["medicao", "sintoma", "humor", "dor", "ansiedade", "apatia"\]/);
assert.match(create,/item\.person_id === activePersonId/,'Deep links must resolve a treatment in the active person');
assert.match(page,/Registrar rapidamente/);
assert.match(viewer,/formatConsultationBrief\(consultation\)/);
assert.match(viewer,/navigator\.clipboard\?\.writeText/,'Copying is explicit, not automatic');
assert.match(viewer,/window\.print\(\)/);
assert.match(mood,/aria-valuenow=\{coverageDays\}/);
assert.match(mood,/Dias sem registro continuam desconhecidos/);
assert.match(avatar,/goFromHealth\('\/saude\/registros\/relatorio'\)/);
assert.match(gate,/test-v224-clinical-journal-consultation-avatar\.cjs/);
assert.match(gate,/test-v223-today-longitudinal-avatar\.cjs/);
console.log('VAULT V224 OK: journal quick capture, accurate periods, owner scope, report to consultation, offline sync visibility, longitudinal Brain, Avatar evidence.');
