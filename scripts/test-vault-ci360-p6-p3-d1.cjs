/* P6 P3-D1 — read-model puro contra fontes reais; sem usuário real, banco ou rede. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const p='lib/m3/medical-dossier-p3.ts';
const content=fs.readFileSync(p,'utf8');
const compiled=ts.transpileModule(content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},reportDiagnostics:true});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const m={exports:{}};
const rehabSource=fs.readFileSync('lib/rehab-m5/projection.ts','utf8');
const rehabCompiled=ts.transpileModule(rehabSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const rehabMod={exports:{}};
vm.runInNewContext(rehabCompiled,{module:rehabMod,exports:rehabMod.exports,Date,Math,Number,String,Array,Object,Set,Map,JSON,Error,RegExp,Symbol,encodeURIComponent},
 {filename:'lib/rehab-m5/projection.ts',timeout:10000});

// A8: carregar o modulo de producao em memoria, sem substituir a regra de titularidade.
const vaccinationSource=fs.readFileSync('lib/vaccination-a8/types.ts','utf8');
const vaccinationCompiled=ts.transpileModule(vaccinationSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const vaccinationMod={exports:{}};
vm.runInNewContext(vaccinationCompiled,{module:vaccinationMod,exports:vaccinationMod.exports,
  Date,Math,Number,String,Boolean,Array,Object,Set,Map,JSON,Error,RegExp,Symbol},
 {filename:'lib/vaccination-a8/types.ts',timeout:10000});
assert.equal(typeof vaccinationMod.exports.currentVaccinationEventsA8,'function','A8 usa o filtro real de vacinacao por titular');

const fakeClinical={
 validClinicalDay:s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;return !Number.isNaN(Date.parse(s+'T12:00:00Z'));},
 buildClinicalReport360:({context,sections,ownerId,personId})=>{
  const rows=[];
  if(sections.includes('consultations'))for(const x of context.consultas.filter(x=>x.user_id===ownerId&&x.person_id===personId))rows.push({category:'consultations',date:x.data,time:null,title:'Consulta '+x.especialidade,detail:x.motivo||'',source:'consultation',sourceId:x.id});
  if(sections.includes('symptoms'))for(const x of context.registrosSaude.filter(x=>x.categoria==='sintoma'&&x.user_id===ownerId&&x.person_id===personId))rows.push({category:'symptoms',date:x.data,time:x.horario,title:x.nome,detail:`${x.intensidade}/10 · ${x.observacoes}`,source:'user_reported',sourceId:x.id});
  if(sections.includes('medications'))for(const x of context.medicamentos.filter(x=>x.user_id===ownerId&&x.person_id===personId))rows.push({category:'medications',date:'2026-11-18',time:null,title:x.nome,detail:'Cadastro atual',source:'medication_current_snapshot',sourceId:x.id});
  return {rows,limitations:['Faltas não significam ausência clínica.']};
 }
};
vm.runInNewContext(compiled.outputText,{
 exports:m.exports,module:m,Date,Math,Number,String,Array,Object,Set,Map,JSON,Error,RegExp,Symbol,console,
 require:id=>{if(id==='@/lib/clinical-report-360')return fakeClinical;if(id==='@/lib/rehab-m5/projection')return rehabMod.exports;if(id==='@/lib/vaccination-a8/types')return vaccinationMod.exports;throw Error('Dependência não permitida '+id);}
},{filename:p,timeout:10000});
const {buildMedicalDossierP3}=m.exports;
const owner={user_id:'u',person_id:'p'},foreign={user_id:'outro',person_id:'p'};
const ctx={userId:'u',personId:'p',medicamentos:[{...owner,id:'m',nome:'Medicamento referenciado'}, {...owner,id:'m2',nome:'Não vinculado'}],doseLogs:[],renovacoes:[],tratamentos:[],registrosSaude:[
 {...owner,id:'s',categoria:'sintoma',nome:'Sensação de calor no ouvido',intensidade:7,observacoes:'Temperatura não aferida',data:'2026-11-18',horario:'10:10'},
 {...owner,id:'s2',categoria:'sintoma',nome:'Outro registro não vinculado',intensidade:2,data:'2026-11-18',horario:'11:10'},
 {...foreign,id:'sf',categoria:'sintoma',nome:'PROIBIDO OUTRA CONTA',intensidade:9,data:'2026-11-18',horario:'09:00'}],
 consultas:[{...owner,id:'c',data:'2026-11-17',especialidade:'Otorrino',status:'realizada',medicamento_ids:['m']},{...owner,id:'c2',data:'2026-11-18',especialidade:'Outra consulta',status:'realizada'}],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]};
const cf=[
 {...owner,id:'e',kind:'monitor_note',parent_id:'c',related_id:'s',created_at:'2026-11-18T10:25:00-03:00',payload:{date:'2026-11-18',time:'10:10',link:'consultation_to_existing_symptom',origin:'patient_confirmed'}},
 {...owner,id:'order',kind:'exam_order',related_id:'c',created_at:'2026-11-17T14:00:00-03:00',payload:{title:'Pedido documentado',date:'2026-11-17'}},
 {...owner,id:'item',kind:'exam_item',parent_id:'order',created_at:'2026-11-17T14:01:00-03:00',payload:{name:'Exame pendente',date:'2026-11-17'}},
 {...owner,id:'unrelated',kind:'exam_order',related_id:'c2',created_at:'2026-11-18T12:00:00-03:00',payload:{title:'Não pertence ao episódio',date:'2026-11-18'}},
 {...foreign,id:'bad',kind:'monitor_note',parent_id:'c',related_id:'sf',created_at:'2026-11-18T10:00:00-03:00',payload:{date:'2026-11-18',link:'consultation_to_existing_symptom'}}
];
const options={context:ctx,careflow:cf,ownerId:'u',personId:'p',personName:'Pessoa fictícia',start:'2026-11-16',end:'2026-11-18',mode:'detailed',sections:['consultations','symptoms','careflow','medications']};

// A8: um plano nao e aplicacao; dados de outra pessoa nunca aparecem no PDF/Modo Medico.
const vaccinationOwn={user_id:'u',person_id:'p',course_id:'a8-course',deleted_at:null,created_at:'2026-11-17T12:00:00Z'};
const vaccineRows=[
 {...vaccinationOwn,id:'a8-factual',kind:'dose',effective_kind:'dose',administered_on:'2026-11-17',planned_on:null,source:'self_report'},
 {...vaccinationOwn,id:'a8-planned',kind:'plan',effective_kind:'plan',planned_on:'2026-11-18',administered_on:null,source:'self_report'},
 {...vaccinationOwn,id:'a8-foreign',user_id:'outro',kind:'dose',effective_kind:'dose',administered_on:'2026-11-17',planned_on:null,source:'self_report'}
];
const vaccinationInput={courses:[{...vaccinationOwn,id:'a8-course',vaccine_name:'Vacina declarada',scheme_note:null}],events:vaccineRows};
const vaccinationReport=buildMedicalDossierP3({...options,sections:['vaccinations'],vaccination:vaccinationInput});
assert.ok(vaccinationReport.rows.some(x=>x.sourceId==='a8-factual'),'dose declarada A8 aparece');
assert.ok(vaccinationReport.rows.some(x=>x.sourceId==='a8-planned'),'planejamento A8 permanece como plano');
assert.ok(!vaccinationReport.rows.some(x=>x.sourceId==='a8-foreign'),'vacinacao alheia nao vaza para PDF');
assert.equal(vaccinationMod.exports.factualDoseCountA8(vaccineRows,'u','p'),1,'plano e registro estrangeiro nao contam como aplicacao');

const all=buildMedicalDossierP3(options);
const symptom=all.rows.find(x=>x.sourceId==='s');
assert.ok(symptom,'sintoma original preservado');
// M5: future safe relations must be real and person-scoped, without hiding legacy facts.
const rehabRow={id:'r-p6',user_id:'u',person_id:'p',title:'Reabilitação documentada',status:'active',start_date:'2026-11-17',created_at:'2026-11-17T12:00:00Z',deleted_at:null};
const rehabReport=buildMedicalDossierP3({...options,sections:['rehabilitation'],rehab:{programs:[rehabRow],sessions:[],milestones:[],origins:[]}});
assert.ok(rehabReport.rows.some(x=>x.sourceId==='r-p6'),'real M5 projection available in detailed medical report');
const wrongAccount=buildMedicalDossierP3({...options,sections:['rehabilitation'],rehab:{programs:[{...rehabRow,user_id:'other'}],sessions:[],milestones:[],origins:[]}});
assert.ok(!wrongAccount.rows.some(x=>x.sourceId==='r-p6'),'foreign-account rehab filtered');

assert.ok(symptom.relations.some(x=>x.includes('Consulta relacionada: Otorrino')),'reverso sintoma→consulta');
assert.ok(symptom.href.includes('/saude/careflow/sintomas#careflow-sintoma-s'),'destino correto');
assert.ok(!all.rows.some(x=>x.sourceId==='e'),'sem duplicação sintoma + nota CareFlow');
assert.ok(!all.rows.some(x=>x.sourceId==='bad'),'nota estrangeira não vira fato');
assert.ok(!all.rows.some(x=>x.title.includes('PROIBIDO')),'conta estrangeira não é exposta');
const onlyCare=buildMedicalDossierP3({...options,sections:['consultations','careflow']});
const note=onlyCare.rows.find(x=>x.sourceId==='e');
assert.ok(note&&note.title==='Sensação de calor no ouvido');
assert.ok(note.detail.includes('Intensidade declarada: 7/10'));
assert.ok(note.detail.includes('Temperatura não aferida'));
assert.ok(note.href.includes('/saude/careflow/sintomas#careflow-sintoma-s'),'nota NÃO abre pressão');
const episode=buildMedicalDossierP3({...options,consultationId:'c'});
assert.equal(episode.episode.consultationId,'c');
assert.ok(episode.rows.some(x=>x.sourceId==='s'));
assert.ok(episode.rows.some(x=>x.sourceId==='order'));
assert.ok(episode.rows.some(x=>x.sourceId==='item'));
assert.ok(episode.rows.some(x=>x.sourceId==='m'));
for(const id of ['s2','m2','unrelated','c2','bad']) assert.ok(!episode.rows.some(x=>x.sourceId===id),'episódio não inclui '+id);
assert.throws(()=>buildMedicalDossierP3({...options,consultationId:'c-foreign'}),/Consulta não pertence/);
assert.throws(()=>buildMedicalDossierP3({...options,personId:'p-foreign'}),/Escopo divergente/);
const snapshot=JSON.stringify({ctx,cf});buildMedicalDossierP3({...options,consultationId:'c',mode:'summary'});assert.equal(JSON.stringify({ctx,cf}),snapshot,'read-only');
const medical=fs.readFileSync('app/saude/careflow/modo-medico/page.tsx','utf8');
assert.ok(medical.includes('consultationId:episode||undefined')&&medical.includes('signature=[start,end,mode'));
const symptomUI=fs.readFileSync('app/saude/careflow/sintomas/page.tsx','utf8');
assert.ok(symptomUI.includes('careflow-sintoma-${r.id}')&&symptomUI.includes('x.person_id===activePersonId'));
const pdf=fs.readFileSync('lib/m3/medical-pdf-p3.ts','utf8');
assert.ok(pdf.includes('if(report.episode)line('));
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
assert.equal(gate.split('"scripts/test-vault-ci360-p6-p3-d1.cjs"').length,2);
console.log('CI360 P6 P3-D1: vínculos reais, pessoa/conta, episódio, PDF e regressões OK');
