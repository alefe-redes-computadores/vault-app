/* VAULT CI360 M3 P3 — escopo clínico, vínculos factuais e regressões premium.
 * Executa código real TypeScript por transpilação em memória; não grava dados.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
function load(path,aliases={}){
  const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const m={exports:{}};
  const sandbox={exports:m.exports,module:m,require:id=>{
    if(Object.prototype.hasOwnProperty.call(aliases,id))return aliases[id];
    throw Error(`M3 P3: dependência inesperada no núcleo puro ${id}`);
  },Date,Math,Number,String,Boolean,Array,Object,Set,Map,JSON,Error,RegExp,Symbol,console,encodeURIComponent};
  vm.runInNewContext(js,sandbox,{filename:path,timeout:7000});return m.exports;
}
const vitalValidation=load('lib/vital/validation.ts');
const vitalFacts=load('lib/vital/facts.ts',{'./validation':vitalValidation});
const report=load('lib/clinical-report-360.ts',{'@/lib/vital/facts':vitalFacts});
const rehabProjection=load('lib/rehab-m5/projection.ts');
const vaccination=load('lib/vaccination-a8/types.ts');
const a9=load('lib/clinical-a9/types.ts');
const pureB=load('lib/clinical-front-b-pure.ts'); // actual module; unknown runtime dependencies still reject
const med=load('lib/m3/medical-dossier-p3.ts',{'@/lib/clinical-report-360':report,'@/lib/rehab-m5/projection':rehabProjection,'@/lib/vaccination-a8/types':vaccination,'@/lib/clinical-a9/types':a9,'@/lib/clinical-front-b-pure':pureB,'@/lib/vital/facts':vitalFacts});
const scope=load('lib/m3/medical-scope-p3.ts');
const timestamp='2026-11-17T11:00:00-03:00';
const ctx=()=>({userId:'own-a',personId:'person-a',medicamentos:[],doseLogs:[],renovacoes:[],tratamentos:[],
  registrosSaude:[],consultas:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]});
const args=context=>({context,careflow:[],ownerId:'own-a',personId:'person-a',personName:'Pessoa de teste',start:'2026-11-01',end:'2026-11-17',mode:'detailed',sections:['consultations','careflow','medications','doses','withdrawals']});
let c=ctx();
assert.throws(()=>med.buildMedicalDossierP3({...args(c),personId:'person-other'}),/Escopo divergente/);
assert.throws(()=>med.buildMedicalDossierP3({...args(c),ownerId:'other-owner'}),/Escopo divergente/);
assert.throws(()=>med.buildMedicalDossierP3({...args(c),sections:[]}),/Selecione pelo menos/);
assert.throws(()=>med.buildMedicalDossierP3({...args(c),start:'2026-02-30'}),/inválido/);
assert.throws(()=>med.buildMedicalDossierP3({...args(c),start:'2026-11-18'}),/inválido/);
const empty=med.buildMedicalDossierP3(args(c));assert.equal(empty.rows.length,0);
const vitalMeal={id:'meal-vital',user_id:'own-a',person_id:'person-a',day:'2026-11-05',time:'12:00',kind:'lunch',custom_label:null,deleted_at:null,synced:true,items:[{name:'Fixture',quantity:null,unit:null}]};
const vitalDossier=med.buildMedicalDossierP3({...args(c),sections:['vital'],vitalEvidence:{workouts:[],meals:[vitalMeal,{...vitalMeal,id:'foreign-meal',user_id:'foreign'}],trainingCheckins:[],nutritionCheckins:[]}});
assert.equal(vitalDossier.rows.length,1);assert.equal(vitalDossier.rows[0].sourceId,'meal-vital');assert.equal(vitalDossier.rows[0].section,'vital');
assert.throws(()=>med.buildMedicalDossierP3({...args(c),sections:['vital']}),/Vital/);
assert.ok(empty.limitations.some(x=>x.includes('ausência')));
const own={user_id:'own-a',person_id:'person-a'},other={user_id:'other-owner',person_id:'other-person'};
c.medicamentos=[{...own,id:'med-1',nome:'Exemplo próprio',dosagem:'10 mg',tipo_uso:'continuo',status:'ativo'},
  {...other,id:'med-other',nome:'PROIBIDO-OUTRO',dosagem:'2 mg'}];
c.consultas=[{...own,id:'consult-1',data:'2026-11-10',especialidade:'Clínica',medico:'Profissional',status:'realizada',
  medicamento_ids:['med-1','med-other'],tratamento_ids:['t-1']},
  {...other,id:'consult-other',data:'2026-11-10',especialidade:'PROIBIDO-CONSULTA',medico:'Outro',status:'realizada'}];
c.tratamentos=[{...own,id:'t-1',nome:'Plano declarado',status:'ativo',medicamento_ids:['med-1']},
  {...other,id:'t-other',nome:'PROIBIDO-TRATAMENTO',status:'ativo'}];
c.doseLogs=[{...own,id:'d-ok',medicamento_id:'med-1',data:'2026-11-09',horario:'10:00',tomado_em:timestamp,dose_kind:'scheduled'},
  {...own,id:'d-planned',medicamento_id:'med-1',data:'2026-11-11',horario:'22:00',dose_kind:'planned'},
  {...other,id:'d-other',medicamento_id:'med-other',data:'2026-11-11',horario:'22:00',tomado_em:timestamp}];
c.retiradas=[{...own,id:'w-ok',data:'2026-11-12',medicamento_id:'med-1',status:'concluida',quantidade_retirada:10,realizada_em:timestamp},
  {...other,id:'w-other',data:'2026-11-12',medicamento_id:'med-other',status:'concluida',quantidade_retirada:999}];
const careflow=[{...own,id:'order-1',kind:'exam_order',parent_id:null,related_id:'consult-1',payload:{title:'Solicitação real',date:'2026-11-12'},created_at:timestamp},
  {...other,id:'foreign-parent',kind:'exam_order',parent_id:null,related_id:null,payload:{title:'PROIBIDO-EXAME',date:'2026-11-12'},created_at:timestamp},
  {...own,id:'item-1',kind:'exam_item',parent_id:'foreign-parent',related_id:null,payload:{name:'Exame explicitamente pedido'},created_at:timestamp}];
const before=JSON.stringify({c,careflow});
const result=med.buildMedicalDossierP3({...args(c),careflow});
assert.ok(result.rows.some(r=>r.title==='Exemplo próprio'));
assert.ok(result.rows.some(r=>r.title==='Solicitação real'&&r.relations.some(x=>x.includes('Clínica'))));
assert.ok(!result.rows.some(r=>r.title.includes('PROIBIDO')));
assert.ok(!result.rows.some(r=>r.sourceId==='d-planned'),'planned is not taken');
assert.ok(result.rows.some(r=>r.sourceId==='d-ok'&&r.detail.includes('Tomada confirmada')));
assert.ok(result.rows.some(r=>r.sourceId==='w-ok'&&r.detail.includes('10')&&r.detail.includes('unidade não inferida')));
assert.ok(!result.rows.some(r=>r.relations.some(x=>x.includes('foreign-parent'))),'no foreign linked parent');
assert.ok(result.rows.find(r=>r.sourceId==='item-1').detail.includes('Data do cadastro; data clínica não informada')||result.rows.find(r=>r.sourceId==='item-1').detail.includes('Data clínica declarada'));
const duplicate=ctx();duplicate.exames=[{...own,nome:'Exame semelhante',data:'2026-11-12'},{...own,nome:'Exame semelhante',data:'2026-11-12'}];
const dupeReport=med.buildMedicalDossierP3({...args(duplicate),sections:['exams']});
assert.equal(dupeReport.rows.length,2,'sem ID não significa apagar segunda ocorrência real');
assert.equal(new Set(dupeReport.rows.map(r=>r.key)).size,2,'chaves estáveis e distintas na renderização');

assert.ok(result.rows.find(r=>r.sourceId==='consult-1').relations.some(x=>x.includes('Exemplo próprio')));
assert.ok(!result.rows.find(r=>r.sourceId==='consult-1').relations.some(x=>x.includes('PROIBIDO')));
assert.equal(JSON.stringify({c,careflow}),before,'projection is pure');
const many=ctx();many.tratamentos=Array.from({length:38},(_,i)=>({...own,id:`tr-${i}`,nome:`Plano ${i}`,status:'ativo'}));
const short=med.buildMedicalDossierP3({...args(many),sections:['treatments'],mode:'summary'});
assert.equal(short.rows.length,30);assert.equal(short.availableCount,38);assert.equal(short.omittedBySummary,8);
const full=med.buildMedicalDossierP3({...args(many),sections:['treatments'],mode:'detailed'});
assert.equal(full.rows.length,38);assert.equal(full.omittedBySummary,0);
// M5: real projection must produce factual, owner-scoped rows inside the existing medical dossier.
const factualRehab={id:'rehab-1',user_id:'own-a',person_id:'person-a',title:'Reabilitação declarada',status:'active',start_date:'2026-11-10',created_at:'2026-11-10T12:00:00Z',deleted_at:null};
const rehabInput={programs:[factualRehab],sessions:[],milestones:[],origins:[]};
const scopedRehab=med.buildMedicalDossierP3({...args(ctx()),sections:['rehabilitation'],rehab:rehabInput});
assert.ok(scopedRehab.rows.some(r=>r.sourceId==='rehab-1'&&r.title.includes('Reabilitação')),'M5 factual program is included only when selected');
const foreignRehab=med.buildMedicalDossierP3({...args(ctx()),sections:['rehabilitation'],rehab:{...rehabInput,programs:[{...factualRehab,user_id:'another-account'}]}});
assert.ok(!foreignRehab.rows.some(r=>r.sourceId==='rehab-1'),'M5 foreign owner is never projected');

// A8 Modo Médico: reuse pure owner-scoped projections, not legacy M144 diary text.
const series={id:'course-own',...own,vaccine_name:'Vacina declarada',scheme_note:null,deleted_at:null};
const vaccinationRows=[
 {id:'a8-plan',...own,course_id:'course-own',kind:'plan',effective_kind:'plan',planned_on:'2026-11-15',administered_on:null,created_at:timestamp,deleted_at:null},
 {id:'a8-dose',...own,course_id:'course-own',kind:'dose',effective_kind:'dose',planned_on:null,administered_on:'2026-11-13',created_at:timestamp,deleted_at:null,source:'self_report'},
 {id:'a8-foreign',...other,course_id:'course-own',kind:'dose',effective_kind:'dose',planned_on:null,administered_on:'2026-11-14',created_at:timestamp,deleted_at:null,source:'self_report'}
];
const a8Report=med.buildMedicalDossierP3({...args(ctx()),sections:['vaccinations'],vaccination:{courses:[series,{...series,id:'course-other',...other}],events:vaccinationRows}});
assert.equal(a8Report.rows.length,2,'A8: não inclui dose de outra pessoa');
assert.equal(a8Report.rows.filter(r=>r.title.includes('Aplicação informada')).length,1,'A8 planejamento não vira aplicação');
assert.ok(a8Report.rows.every(r=>r.source==='vaccination_event_a8'&&r.href?.includes('curso=course-own')),'A8 links por ID canônico');
assert.doesNotThrow(()=>scope.assertMedicalScopeP3({userId:'u',personId:'p',signature:'a'}, {userId:'u',personId:'p',signature:'a'}));
for(const otherScope of [{userId:'u2',personId:'p',signature:'a'},{userId:'u',personId:'p2',signature:'a'},{userId:'u',personId:'p',signature:'b'}])
  assert.throws(()=>scope.assertMedicalScopeP3({userId:'u',personId:'p',signature:'a'},otherScope),/mudou/);
const ui=read('app/saude/careflow/modo-medico/page.tsx');
const pdf=read('lib/m3/medical-pdf-p3.ts');
const fenix=read('components/saude/HealthAvatar3D.tsx');
const pharm=read('components/saude/PharmaLensDocumentStudioCI360.tsx');
const careflowPage=read('app/saude/careflow/page.tsx');
const dossierPage=read('app/saude/careflow/dossie/page.tsx');
const mainGate=read('scripts/test-v63-release-gate.mjs');
assert.ok(ui.includes('<CustomDatePicker')&&!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["'][^>]*>/gs.test(ui));
assert.ok(!/<select\b[^>]*>/.test(ui),'no visible native select');
assert.ok(ui.includes('HealthRelationPicker')&&ui.includes('focusSection')&&ui.includes('<details key={row.key}')&&ui.includes('filtered.slice(0,limit)'), 'componentes premium, lista recolhível, filtros e renderização incremental');
assert.ok(ui.includes('assertMedicalScopeP3')&&ui.includes('pdfLibraryM2.add')&&ui.includes('careflow_reports_m2.delete(savedId)'));
assert.ok(pdf.includes("format:'a4'")&&pdf.includes('getNumberOfPages()')&&pdf.includes('report.omittedBySummary'));
assert.ok(!pdf.includes('Share.share')&&!pdf.includes('fetch(')&&!pdf.includes('supabase'));
assert.ok(fenix.includes('hiddenGpuP3')&&fenix.includes('cancelAnimationFrame(frame)')&&fenix.includes('document.removeEventListener("visibilitychange",hiddenGpuP3)'));
assert.ok(fenix.includes('renderer.dispose()')&&fenix.includes('renderer.forceContextLoss()'));
assert.ok(pharm.includes('currentContextP3')&&pharm.includes('photoRevisionP3')&&pharm.includes('requestRevisionP3!==photoRevisionP3.current'));
assert.ok(pharm.includes('bitmap?.close();if(requestRevisionP3===photoRevisionP3.current)setBusy(false)'));
assert.ok(careflowPage.includes("href:'/saude/careflow/modo-medico'")&&dossierPage.includes('href="/saude/careflow/modo-medico"'));
assert.ok(mainGate.includes('scripts/test-vault-ci360-m3-p3.cjs'));
// R02 negative: current inventory cannot alter a historical quantity, including PDF input row.
{
 const ownB={user_id:'own-a',person_id:'person-a'};
 const cB=ctx();
 cB.medicamentos=[{...ownB,id:'med-b',nome:'Medicamento sintético',dosagem:'10 mg',estoque_unidade_medida:'gotas',tipo_uso:'continuo',status:'ativo'}];
 cB.doseLogs=[{...ownB,id:'dose-b',medicamento_id:'med-b',data:'2026-11-09',horario:'10:00',tomado_em:timestamp,dose_kind:'scheduled',quantidade:5},
  {...ownB,id:'ignored-b',medicamento_id:'med-b',data:'2026-11-10',horario:'10:00',ignorado_em:timestamp,dose_kind:'scheduled',quantidade:5,motivo:'Quantidade: 5'},
  {...ownB,medicamento_id:'med-b',data:'2026-11-11',horario:'10:00',tomado_em:timestamp,dose_kind:'scheduled',quantidade:3}];
 const opts={...args(cB),sections:['doses']};
 const rowB=report=>report.rows.find(x=>x.sourceId==='dose-b');
 const first=med.buildMedicalDossierP3(opts), beforeB=rowB(first);
 assert.ok(beforeB&&beforeB.detail.includes('Quantidade: 5 (unidade não informada)')&&!beforeB.detail.includes('Quantidade: Quantidade'),'Dose histórica com unidade desconhecida explicitada no dossiê');
 const changedB={...cB,medicamentos:cB.medicamentos.map(m=>({...m,estoque_unidade_medida:'comprimidos'}))};
 assert.equal(rowB(med.buildMedicalDossierP3({...opts,context:changedB})).detail,beforeB.detail,'mudança de estoque não altera o fato histórico');
 assert.ok(first.rows.some(x=>x.sourceId==='ignored-b'&&x.detail.includes('Ignorada explicitamente')&&!x.detail.includes('Quantidade registrada: 5')&&x.detail.includes('Motivo informado: Quantidade: 5')),'ignoradas não viram tomadas');
 assert.ok(first.rows.some(x=>x.sourceId==='med-b:2026-11-11:10:00'&&x.detail.includes('3 (unidade não informada)')),'dose legada sem id mantém quantidade factual sem unidade inferida');
 const summaryB=med.buildMedicalDossierP3({...opts,mode:'summary'});
 assert.equal(rowB(summaryB).detail,beforeB.detail,'mesma linha factual para resumo, detalhado e entrada do PDF');
}
console.log('M3 P3: segurança por pessoa, relação por ID, doses/retiradas, resumo 30, UX premium, OCR e GPU OK');
