#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
let count=0;
function check(value,label){assert.ok(value,'A4 MACRO2: '+label);count++;}
const sources={
  bridge:'lib/treatment-a4/clinical-bridge.ts',
  widget:'components/saude/TreatmentContinuityA4.tsx',
  medical:'lib/m3/medical-dossier-p3.ts',
  medicalPage:'app/saude/careflow/modo-medico/page.tsx',
  brain:'components/saude/BrainV7UniversalConsole.tsx',
  brainFacts:'lib/m3/brain-facts-p2.ts',
  timeline:'app/saude/careflow/linha-do-tempo/page.tsx',
  today:'app/hoje/page.tsx',
  home:'app/page.tsx',
  careflow:'app/saude/careflow/page.tsx',
  details:'components/saude/TreatmentRegimenA4.tsx',
};
for(const [name,path] of Object.entries(sources)){
 const source=fs.readFileSync(path,'utf8');
 const tree=ts.createSourceFile(path,source,ts.ScriptTarget.ESNext,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(tree.parseDiagnostics.length===0,`AST: ${name} ${tree.parseDiagnostics.map(e=>e.messageText).join(' ')}`);
 const transpile=ts.transpileModule(source,{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 check(!transpile.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error),'transpile '+name);
}
const bridgeSource=fs.readFileSync(sources.bridge,'utf8');
const commonjs=ts.transpileModule(bridgeSource,{fileName:sources.bridge,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const fixtureModule={exports:{}};
const stub=(path)=>{
 if(path.includes('clinical-a1/types'))return {validCivilDate:s=>/^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T12:00:00Z')) && new Date(Date.parse(s+'T12:00:00Z')).toISOString().slice(0,10)===s};
 if(path.includes('treatment-a4/regimen'))return {
  a4PhaseKindLabel:k=>({inicio:'Início registrado',ajuste:'Mudança registrada',pausa:'Pausa informada',retomada:'Retomada informada',conclusao:'Encerramento informado'})[k],
  a4PhaseSourceLabel:k=>({relato_pessoal:'Relato pessoal',orientacao_profissional:'Orientação profissional informada',documento_revisado:'Documento revisado declarado'})[k]
 };
 throw Error('Import inesperado no read model '+path);
};
vm.runInNewContext('(function(require,module,exports){'+commonjs+'})',{},{})(stub,fixtureModule,fixtureModule.exports);
const {projectA4ClinicalFacts,formatA4ClinicalDossier}=fixtureModule.exports;
check(typeof projectA4ClinicalFacts==='function','read model exportado');
check(typeof formatA4ClinicalDossier==='function','resumo exportado');
const id=n=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const user=id(1),person=id(2),otherPerson=id(3),foreignUser=id(4),treatment=id(5),medication=id(6),otherTreatment=id(7);
const treatments=[{id:treatment,user_id:user,person_id:person,nome:'Fisioterapia bilateral'},{id:otherTreatment,user_id:user,person_id:otherPerson,nome:'Privado outra pessoa'}];
const medications=[{id:medication,user_id:user,person_id:person,nome:'Exemplo prescrito'},{id:id(8),user_id:foreignUser,person_id:otherPerson,nome:'SEGREDO NÃO EXIBIR'}];
const doctors=[{id:id(9),user_id:user,nome:'Profissional A'},{id:id(10),user_id:foreignUser,nome:'SEGREDO PROFISSIONAL'}];
const phase=(n,over={})=>({id:id(100+n),user_id:user,person_id:person,created_at:`2026-11-${String(11+n).padStart(2,'0')}T12:00:00Z`,updated_at:'2026-11-20T12:00:00Z',deleted_at:null,synced:true,tratamento_id:treatment,tipo:'ajuste',data_efetiva:`2026-11-${String(11+n).padStart(2,'0')}`,origem:'relato_pessoal',titulo:'Mudança declarada',observacoes:'Registro informado',profissional_id:id(9),regime_a4:{versao:1,natureza:'continuo',medicamento_id:medication,dose_texto:'5 mg declarados',frequencia_texto:'Uma vez por dia',horarios:['09:00'],via:'oral',lateralidade:'bilateral',local_anatomico:'Orelha',fim_previsto:'2026-12-01',documento_id:null,consulta_id:null},...over});
const input={userId:user,personId:person,treatments,medications,professionals:doctors,phases:[phase(1),phase(2)]};
let facts=projectA4ClinicalFacts(input);
check(facts.length===2,'dois fatos declarados');
check(facts[0].date==='2026-11-13','fatos ordenados por data real');
check(facts[0].medicationName==='Exemplo prescrito','medicamento por ID autorizado');
check(facts[0].professionalName==='Profissional A','profissional por ID autorizado');
check(facts[0].href.includes(encodeURIComponent(treatment)),'link real para tratamento original');
check(facts[0].details.some(x=>x.includes('não confirmado')),'fim previsto não é conclusão');
check(facts[0].details.some(x=>x.includes('Lado: bilateral')),'lateralidade preservada');
check(formatA4ClinicalDossier(facts).includes('não comprovam dose tomada'),'limites claros no dossiê');
check(formatA4ClinicalDossier([])==='', 'sem bloco vazio se não houver fatos');
for(let n=0;n<600;n++){
 const tampered=[phase(1),phase(2),phase(6,{id:id(500+n),person_id:n%2?otherPerson:person,user_id:n%3?foreignUser:user,tratamento_id:(n%6===0)?otherTreatment:treatment})];
 const visible=projectA4ClinicalFacts({...input,phases:tampered});
 check(visible.length===2,'não inclui evento forasteiro '+n);
 check(!visible.some(f=>f.id===id(500+n)),'sem vazamento cruzado '+n);
}
const mixed=[phase(1),phase(2),phase(1),phase(3,{deleted_at:'2026-11-21T12:00:00Z'}),phase(4,{data_efetiva:'2026-02-29'}),phase(5,{regime_a4:{...phase(5).regime_a4,medicamento_id:id(8)},profissional_id:id(10)})];
facts=projectA4ClinicalFacts({...input,phases:mixed});
check(facts.length===3,'dedup e exclusão tombstone/data inválida');
check(facts[0].medicationName===null,'não resolve medicamento de outra conta');
check(facts[0].professionalName===null,'não resolve profissional de outra conta');
const content=formatA4ClinicalDossier(facts);
check(!content.includes('SEGREDO'), 'não exporta nomes de registros alheios');
check(projectA4ClinicalFacts({...input,phases:mixed,from:'2026-11-13',through:'2026-11-14'}).length===1,'janela civil incluída');
check(projectA4ClinicalFacts({...input,phases:mixed,from:'2026-11-30',through:'2026-11-01'}).length===0,'janela invertida negada');
check(projectA4ClinicalFacts({...input,phases:mixed,max:1}).length===1,'limite renderização');
for(const [name,path] of Object.entries(sources)){
 const text=fs.readFileSync(path,'utf8');
 // The medical dossier is a PURE projection. It receives treatmentFacts by argument and
 // MUST NOT import the A4 runtime or a UI component merely to satisfy a string match.
 if(name==='medical'){
  check(text.includes('treatmentFacts?:readonly A4ClinicalFact[]') &&
        text.includes("if(selected('treatments'))for(const f of input.treatmentFacts||[])") &&
        text.includes("source:'a4_treatment_phase'") &&
        text.includes('f.userId!==uid||f.personId!==pid'),
        'bridge real A4 no dossie: argumento tipado + fatos datados + origem + isolamento');
 }else if(['home','today','careflow','medicalPage','brain','timeline'].includes(name)){
  check(text.includes('TreatmentContinuityA4') || text.includes('projectA4ClinicalFacts') ||
        text.includes('a4Phases') || text.includes('treatmentPhases') ||
        text.includes('fases de tratamentos'),'bridge aplicado em '+name);
 }
}
const pureModules=[sources.medical,sources.brainFacts];
for(const pure of pureModules){
 const compiled=ts.transpileModule(fs.readFileSync(pure,'utf8'),{fileName:pure,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 check(!compiled.includes('require("@/lib/treatment-a4/clinical-bridge")'),'núcleo legado mantém testes VM herméticos, sem novo import executável: '+pure);
}
const doc=fs.readFileSync(sources.medical,'utf8');
const medPage=fs.readFileSync(sources.medicalPage,'utf8');
const homePage=fs.readFileSync(sources.home,'utf8');
const todayPage=fs.readFileSync(sources.today,'utf8');
const timeline=fs.readFileSync(sources.timeline,'utf8');
const m5gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
check(doc.includes('rehabFactsM5')&&doc.includes("if(selected('rehabilitation'))"),'M5 reabilitação no dossiê preservada');
check(medPage.includes("sections.includes('rehabilitation')")&&medPage.includes('rehab:rehab?.scope===scopeKey?rehab:undefined'),'M5 reabilitação no Modo Médico preservada');
check((medPage.match(/import \{ useLiveQuery \} from 'dexie-react-hooks';/g)||[]).length===1,'Modo Médico não duplica hook de query');
check((medPage.match(/import \{ db \} from '@\/lib\/db';/g)||[]).length===1,'Modo Médico não duplica import db');
check(homePage.includes('<RehabM5AgendaStrip />')&&todayPage.includes('<RehabM5AgendaStrip />'),'M5 agenda Home e Hoje preservada');
check(timeline.includes('<RehabM5FactualDigest'),'M5 fatos na cronologia preservados');
check(m5gate.split('"scripts/test-vault-m5-reab-macro2.cjs"').length===2,'V63 M5 MACRO2 preservado exatamente uma vez');
check(doc.includes("source:'a4_treatment_phase'"),'PDF deriva fatos A4, não apenas status atual');
check(doc.includes('fact.consultationId===consultation.id'),'vínculo explícito ao episódio da consulta');
const t=fs.readFileSync(sources.today,'utf8');
check(t.includes('isHoje && !retroReviewMode ?'),'Hoje não exibe contexto A4 em revisão passada/futura');
const brain=fs.readFileSync(sources.brain,'utf8');
check(brain.includes('formatA4ClinicalDossier(a4Facts,12)'),'dossiê textual Brain mantém fases');
const details=fs.readFileSync(sources.details,'utf8');
check(details.includes('Configurar um lembrete voluntariamente'),'lembretes explicitamente opt-in');
// A4 bridge is a PURE read-model. A Set.add used for local deduplication is not
// a persistent write. Audit actual syntax instead of banning every `.add(` string.
function auditBridgeSideEffects(source){
 const tree=ts.createSourceFile('lib/treatment-a4/clinical-bridge.ts',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
 const violations=[];
 const allowedImports=new Set(['@/lib/clinical-a1/types','@/lib/treatment-a4/regimen','@/lib/types']);
 const forbiddenIdentifiers=new Set(['db','supabase','LocalNotifications','Notification','localStorage','sessionStorage','indexedDB','navigator','window','fetch','setTimeout','setInterval']);
 const writeMethods=new Set(['add','put','update','delete','bulkAdd','bulkPut','bulkDelete','clear','insert','upsert','remove','set','schedule','scheduleAt','cancel','enqueue','subscribe','dispatch','post','patch','mutate','send']);
 const visit=node=>{
  if(ts.isImportDeclaration(node)){
   const imported=node.moduleSpecifier;
   if(!ts.isStringLiteral(imported)||!allowedImports.has(imported.text))violations.push('runtime import or new dependency: '+imported.getText(tree));
  }
  if(ts.isIdentifier(node)&&forbiddenIdentifiers.has(node.text))violations.push('external writer/scheduler: '+node.text);
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)){
   const method=node.expression.name.text;
   if(writeMethods.has(method)){
    const receiver=node.expression.expression;
    // This exactly matches the scoped Set used to deduplicate factual events.
    const localDedupe=method==='add'&&ts.isIdentifier(receiver)&&receiver.text==='seen'&&node.arguments.length===1&&
      ts.isPropertyAccessExpression(node.arguments[0])&&ts.isIdentifier(node.arguments[0].expression)&&
      node.arguments[0].expression.text==='p'&&node.arguments[0].name.text==='id'&&
      source.includes('const seen=new Set<string>();');
    if(!localDedupe)violations.push('forbidden write/scheduler call: '+node.expression.getText(tree));
   }
  }
  ts.forEachChild(node,visit);
 };
 visit(tree);
 return violations;
}
check(auditBridgeSideEffects(bridgeSource).length===0,'ponte sem escrita ou agenda');
// Regression: these unsafe changes MUST be rejected if introduced later.
const inject=snippet=>bridgeSource.replace('    seen.add(p.id);','    '+snippet+'\n    seen.add(p.id);');
check(auditBridgeSideEffects(inject('db.a1_treatment_phases.put(p);')).length>0,'detecta escrita real put');
check(auditBridgeSideEffects(inject('db.a1_treatment_phases.add(p);')).length>0,'detecta escrita real add');
check(auditBridgeSideEffects(inject('LocalNotifications.schedule({});')).length>0,'detecta agendamento nativo');
check(auditBridgeSideEffects(inject('fetch(\"/api/sync\");')).length>0,'detecta escrita via rede');
console.log(`VAULT A4 MACRO2: ${count} verificações dirigidas aprovadas (herméticas; sem banco / Android).`);
