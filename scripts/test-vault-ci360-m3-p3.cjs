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
const report=load('lib/clinical-report-360.ts');
const rehabProjection=load('lib/rehab-m5/projection.ts');
const med=load('lib/m3/medical-dossier-p3.ts',{'@/lib/clinical-report-360':report,'@/lib/rehab-m5/projection':rehabProjection});
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
console.log('M3 P3: segurança por pessoa, relação por ID, doses/retiradas, resumo 30, UX premium, OCR e GPU OK');
