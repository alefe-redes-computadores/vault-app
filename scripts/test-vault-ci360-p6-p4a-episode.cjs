/* CI360 P6 P4-A — testes do motor REAL, vínculos por ID, proteção por pessoa e
 * documentação premium. Não grava dados, não altera estoque, nem inventa sintomas.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
function load(path,mocks){
  const result=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},reportDiagnostics:true});
  assert.equal(result.diagnostics?.length||0,0,'Transpilação de '+path);
  const mod={exports:{}};
  vm.runInNewContext(result.outputText,{exports:mod.exports,module:mod,
    require:id=>{if(Object.prototype.hasOwnProperty.call(mocks,id))return mocks[id];throw Error('Import inesperado: '+id);},
    Date,Math,Number,String,Boolean,Object,Array,Map,Set,JSON,Error,RegExp,console}, {filename:path,timeout:6000});
  return mod.exports;
}
const valid=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number),q=new Date(Date.UTC(y,m-1,d));
  return q.getUTCFullYear()===y&&q.getUTCMonth()===m-1&&q.getUTCDate()===d;
};
const engine=load('lib/m3/clinical-episode-p4.ts',{'@/lib/clinical-report-360':{validClinicalDay:valid}});
const own={user_id:'own',person_id:'p1'},foreign={user_id:'other',person_id:'p2'};
const consultation={id:'c1',...own,especialidade:'Otorrinolaringologia',medico:'Profissional',data:'2026-11-17',status:'realizada',medicamento_ids:['m1','foreign-med'],percepcao_paciente:'Ouvido dolorido',orientacao_profissional:'Orientação relatada, sem modificar prescrição'};
const context=()=>({userId:'own',personId:'p1',consultas:[consultation,{...consultation,id:'c2',data:'2026-11-16'}],medicamentos:[{id:'m1',...own,nome:'Produto otológico cadastrado',dosagem:'informada',tipo_uso:'temporario'}, {id:'foreign-med',...foreign,nome:'NÃO MOSTRAR'}],registrosSaude:[
  {id:'r1',...own,categoria:'sintoma',tipo:'outro',nome:'Ouvido quente (percepção)',data:'2026-11-18',horario:'07:00',intensidade:6,observacoes:'Sensação subjetiva, sem temperatura medida'},
  {id:'r2',...foreign,categoria:'sintoma',nome:'REGISTRO PRIVADO',data:'2026-11-18',horario:'08:00',intensidade:10}],
  doseLogs:[],renovacoes:[],tratamentos:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]});
const event=(id,kind,more={})=>({id,...own,kind,parent_id:null,related_id:null,payload:{date:'2026-11-18'},created_at:'2026-11-18T12:00:00Z',updated_at:'2026-11-18T12:00:00Z',synced:true,...more});
const events=[
  event('o1','exam_order',{related_id:'c1',payload:{date:'2026-11-17',title:'Exames prescritos'}}),
  event('i1','exam_item',{parent_id:'o1',payload:{date:'2026-11-17',name:'Hemograma'}}),
  event('s1','exam_status',{parent_id:'i1',payload:{date:'2026-11-18',state:'pending'}}),
  event('note','monitor_note',{parent_id:'c1',related_id:'r1',payload:{date:'2026-11-18',origin:'patient_confirmed'}}),
  event('note-duplicate','monitor_note',{parent_id:'c1',related_id:'r1',payload:{date:'2026-11-18'}}),
  event('unrelated','exam_order',{related_id:'c2',payload:{date:'2026-11-18',title:'PEDIDO DE OUTRA CONSULTA'}}),
  event('foreign-symptom','monitor_note',{parent_id:'c1',related_id:'r2'}),
  event('foreign-person','exam_order',{user_id:'other',person_id:'p2',related_id:'c1',payload:{date:'2026-11-18',title:'PEDIDO ESTRANGEIRO'}}),
  event('other-date','exam_order',{related_id:'c1',payload:{date:'2026-11-19',title:'PEDIDO FUTURO'}}),
];
const args=(more={})=>({context:context(),careflow:events,userId:'own',personId:'p1',consultationId:'c1',personName:'Pessoa própria',today:'2026-11-18',mode:'detailed',...more});
assert.throws(()=>engine.buildClinicalEpisodeP4(args({userId:'other'})),/divergente/);
assert.throws(()=>engine.buildClinicalEpisodeP4(args({personId:'p2'})),/divergente/);
assert.throws(()=>engine.buildClinicalEpisodeP4(args({consultationId:'foreign'})),/não encontrada/);
assert.throws(()=>engine.buildClinicalEpisodeP4(args({today:'2026-11-16'})),/futuro/);
assert.throws(()=>engine.buildClinicalEpisodeP4(args({today:'2026-02-31'})),/inválido/);
const input=args(),before=JSON.stringify(input);
const episode=engine.buildClinicalEpisodeP4(input);
assert.equal(episode.stats.symptoms,1,'registro duplicado por links não duplica fato');
assert.equal(episode.stats.examOrders,1,'somente exame da consulta explícita');
assert.equal(episode.stats.examItems,1,'item filho por parent_id');
assert.equal(episode.stats.linkedMedications,1,'somente med da pessoa vinculada');
assert.equal(episode.stats.results,0,'estado pendente não é resultado disponível');
assert(episode.rows.some(x=>x.title.includes('Ouvido quente')&&x.detail.includes('sem temperatura medida')));
assert(episode.rows.some(x=>x.title==='Hemograma'));
assert(episode.rows.some(x=>x.title.includes('Produto otológico')));
assert(episode.rows.every(x=>!JSON.stringify(x).includes('NÃO MOSTRAR')&&!JSON.stringify(x).includes('PRIVADO')&&!JSON.stringify(x).includes('ESTRANGEIRO')&&!JSON.stringify(x).includes('OUTRA CONSULTA')&&!JSON.stringify(x).includes('FUTURO')));
assert(episode.rows.every(x=>/^(consultations|careflow|symptoms|medications)$/.test(x.section)));
assert.equal(new Set(episode.rows.map(x=>x.key)).size,episode.rows.length);
assert.equal(episode.nextAction?.href,'/saude/careflow/sintomas');
assert(episode.report.limitations.some(x=>x.includes('não são diagnóstico')));
assert.equal(JSON.stringify(input),before,'read-only sem mutar as fontes');
const noSymptom=events.filter(e=>e.kind!=='monitor_note');
const exam=engine.buildClinicalEpisodeP4(args({careflow:noSymptom}));
assert.equal(exam.stats.symptoms,0);assert.equal(exam.nextAction.href,'/saude/careflow/exames');
const none=engine.buildClinicalEpisodeP4(args({careflow:[],context:{...context(),consultas:[{...consultation,medicamento_ids:[]}],medicamentos:[]}}));
assert.equal(none.nextAction,null);assert(none.gaps.length>=2);
const lots=context();lots.medicamentos=Array.from({length:45},(_,i)=>({...own,id:'m'+i,nome:'Exemplo '+i,tipo_uso:'temporario'}));
lots.consultas=[{...consultation,medicamento_ids:lots.medicamentos.map(m=>m.id)}];
const short=engine.buildClinicalEpisodeP4(args({context:lots,careflow:[],mode:'summary'}));
assert.equal(short.rows.length,30);assert.equal(short.report.availableCount,46);assert.equal(short.report.omittedBySummary,16);
const detailed=engine.buildClinicalEpisodeP4(args({context:lots,careflow:[],mode:'detailed'}));assert.equal(detailed.rows.length,46);
const page=read('app/saude/careflow/episodios/page.tsx');
const home=read('app/page.tsx');const pulse=read('components/home/ClinicalEpisodePulseP4.tsx');
const dossier=read('lib/m3/medical-dossier-p3.ts');const hub=read('app/saude/careflow/page.tsx');
const gate=read('scripts/test-v63-release-gate.mjs');
assert(page.includes('buildClinicalEpisodeP4')&&page.includes('makeMedicalPdfP3')&&page.includes('assertMedicalScopeP3'));
assert(page.includes('pdfLibraryM2.add')&&page.includes('db.careflow_reports_m2.delete(savedId)'));
assert(page.includes('HealthRelationPicker')&&page.includes('aria-pressed={mode===id}')&&page.includes('min-[360px]'));
assert(!/\bwindow\.confirm\(/.test(page)&&!/<select\b/.test(page));
assert(home.includes('<ClinicalEpisodePulseP4 />')&&home.includes('<CareFlowSummaryM2 />'));
assert(pulse.includes('selectEpisodeActionP4')&&pulse.includes('Por quê?')&&pulse.includes('hidden===scope'));
assert(hub.includes("href:'/saude/careflow/episodios'"));
assert(dossier.includes('consultationLinksBySymptom')&&dossier.includes('symptomMap')&&dossier.includes('/saude/careflow/sintomas'), 'A nova autoridade relacional D1 foi preservada');
assert(gate.split('"scripts/test-vault-ci360-p6-p4a-episode.cjs"').length===2);
console.log('CI360 P6 P4-A: episodio por ID, privacidade, sintomas, pedidos, resumo, Home e PDF local OK');
