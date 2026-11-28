'use strict';
/** CI360 P6/P5 MACRO2 — contratos reais sobre módulos TS, sem rede ou banco. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const child=require('node:child_process');
const ROOT=process.cwd();
const ts=(()=>{try{return require(path.join(ROOT,'node_modules','typescript'))}catch{return require(path.join(child.execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}})();
function loadTS(p){
 const source=fs.readFileSync(path.join(ROOT,p),'utf8');
 const transpiled=ts.transpileModule(source,{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
 assert.equal(transpiled.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,p+' sintaxe TypeScript');
 const sandbox={exports:{},module:{exports:{}},require,console,Date,Set,Map};sandbox.exports=sandbox.module.exports;
 vm.runInNewContext(transpiled.outputText,sandbox,{filename:p,timeout:3000});
 return sandbox.module.exports;
}
const rec=loadTS('lib/health-intelligence/pharmalens-reconciliation-p6.ts');
const dup=loadTS('lib/health-intelligence/pharmalens-therapy-overlap-p6.ts');
const inter=loadTS('lib/health-intelligence/pharmalens-interaction-evidence-p6.ts');
const temporal=loadTS('lib/health-intelligence/pharmalens-temporal-symptoms-p6.ts');
const ref=(id,ingredient,verified=true)=>({schema:1,lookup_key:id,match_kind:verified?'exact':'pharmaceutical_equivalence',reference:{id,canonicalName:id,activeIngredients:[ingredient],regulatoryIdentity:{referenceType:'product',productId:id},sources:[{authority:verified?'anvisa':'catalogo_local',label:'Fonte de teste'}]}});
const m={id:'m1',user_id:'u1',person_id:'p1',nome:'Med A',tipo_receita:'azul',catalog_snapshot:ref('one','Substância A'),data_receita:'2026-11-10'};
const doc={id:'doc1',user_id:'u1',person_id:'p1',type:'receita',title:'Receita A',created_at:'2026-11-10',attachments:[],metadata:{},is_favorite:false,category_id:'saude'};
const wrong={...doc,id:'doc2',title:'Receita Med A'};
const otherPerson={...doc,id:'doc3',person_id:'p2'};
const event={id:'rx1',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-11-10'};
const joined=rec.reconcileMedicationP6({medication:{...m,document_id:'doc1'},documents:[doc,wrong,otherPerson],renewals:[event],userId:'u1',personId:'p1',regulatory:{verified:false,label:'Não confirmada'}});
assert.equal(joined.directDocumentCount,1,'Somente ID explícito de receita');
assert.equal(joined.sourceDocumentCount,1,'Emissão não equivale a aquisição');
assert.equal(joined.regulatoryStatus,'declared_only');
assert.equal(rec.medicationListEvidenceLabelP6(joined,{verified:false}),'Rec. vinc.');
assert.ok(joined.records.some(x=>x.href==='/documentos/detalhes?id=doc1'));
assert.ok(rec.medicationReconciliationBriefP6(joined).includes('Documentos de receita vinculados: 1'));
const audit=rec.auditMedicationEvidenceP6({medications:[{...m,document_id:'doc1'}, {...m,id:'m_missing',nome:'Outro'}],documents:[doc],renewals:[event],userId:'u1',personId:'p1',profiles:{}});
assert.equal(audit.documented,1);assert.equal(audit.needsReview,2);
const byRelation=rec.reconcileMedicationP6({medication:m,documents:[{...doc,entidade_tipo:'medicamento',entidade_id:'m1'}],renewals:[],userId:'u1',personId:'p1'});
assert.equal(byRelation.directDocumentCount,1,'Relação por entidade/id real');
const byName=rec.reconcileMedicationP6({medication:m,documents:[wrong],renewals:[],userId:'u1',personId:'p1'});
assert.equal(byName.directDocumentCount,0,'Mesmo título não faz vínculo');
const wrongScope=rec.reconcileMedicationP6({medication:m,documents:[doc],renewals:[event],userId:'u1',personId:'p2'});
assert.equal(wrongScope.directDocumentCount,0,'Pessoa divergente não recebe dados');
const classEvidenceFixture={label:'Notificação A',modelCode:'notificacao_a',sourceLabel:'ANVISA',scope:'substance',railColor:'#facc15'};
const partialKnowledge=rec.reconcileMedicationP6({medication:m,documents:[],renewals:[],userId:'u1',personId:'p1',regulatory:{verified:false,label:'Em conferência',classEvidence:classEvidenceFixture,referenceIdentity:'compatible',reviewReasons:['presentation-review']}});
assert.ok(partialKnowledge.records.some(x=>x.kind==='review'&&x.note.includes('Notificação A')&&x.note.includes('ANVISA')),'PharmaLens retains independently evidenced class');
assert.ok(partialKnowledge.needsReview&&partialKnowledge.regulatoryStatus!=='official_exact','Class evidence cannot confer exact product or personal validity');
const divergentKnowledge=rec.reconcileMedicationP6({medication:m,documents:[],renewals:[],userId:'u1',personId:'p1',regulatory:{verified:true,label:'Notificação A',classEvidence:classEvidenceFixture,referenceIdentity:'possible_divergence',reviewReasons:['identity-divergence']}});
assert.ok(!divergentKnowledge.records.some(x=>x.kind==='official'||x.id.startsWith('catalog-review:')),'Divergence must not attach another substance class');
const official=rec.reconcileMedicationP6({medication:m,documents:[doc],renewals:[],userId:'u1',personId:'p1',regulatory:{verified:true,label:'Notificação B'}});
assert.equal(official.regulatoryStatus,'official_exact');
assert.equal(rec.medicationListEvidenceLabelP6(official,{verified:true}),null,'Trilho oficial preservado');
const malformed={...m,catalog_snapshot:ref('one','Substância A',false)};
const officialPartial=rec.reconcileMedicationP6({medication:malformed,documents:[],renewals:[],userId:'u1',personId:'p1',regulatory:{verified:true,label:'Notificação B'}});
assert.equal(officialPartial.regulatoryStatus,'official_partial','Equivalência não é exatidão de produto');
const m2={...m,id:'m2',nome:'Genérico A',tipo_uso:'temporario',catalog_snapshot:ref('two','SUBSTÂNCIA Á')};
const m3={...m,id:'m3',nome:'Outro B',catalog_snapshot:ref('three','Outra substância')};
const overlap=dup.findDocumentedTherapyOverlapsP6([m,m2,m3,{...m2,id:'stranger',person_id:'p2'}],'u1','p1');
assert.equal(overlap.length,1,'Sobreposição por substância oficial, pessoa e ID');
assert.equal(overlap[0].ingredient,'substancia a');
assert.equal(dup.findDocumentedTherapyOverlapsP6([m,{...m2,catalog_snapshot:ref('two','Substância A',false)}],'u1','p1').length,0,'Identidade incerta não confirma duplicidade');
assert.equal(dup.findDocumentedTherapyOverlapsP6([m,{...m2,status:'descontinuado'}],'u1','p1').length,0,'Suspenso não é concomitante');
const noDb=inter.assessDocumentedInteractionsP6(['substancia a','substancia b'],[],'2026-11-18');
assert.equal(noDb.status,'not_evaluated','Sem base externa = NÃO AVALIADO');
const rule={ingredientA:'substancia a',ingredientB:'substancia b',reviewedAt:'2026-11-10',sourceDocumentSha256:'a'.repeat(64),sourceUrl:'https://example.org/original',sourceName:'Documento de teste',reviewedBy:'Revisor de teste',clinicalStatement:'Apenas contrato de validação de evidência.',severity:'review',status:'verified'};
assert.equal(inter.assessDocumentedInteractionsP6(['substancia a','substancia b'],[rule],'2026-11-18').status,'supported_findings');
assert.equal(inter.assessDocumentedInteractionsP6(['substancia a','substancia b'],[{...rule,status:'draft'}],'2026-11-18').status,'not_evaluated');
assert.equal(inter.assessDocumentedInteractionsP6(['substancia a','substancia b'],[{...rule,sourceUrl:'http://unsafe'}],'2026-11-18').status,'not_evaluated');
const report={cycles:[{acquisitionId:'a1',startedAt:'2026-11-10'}]};
const record={id:'sym1',user_id:'u1',person_id:'p1',categoria:'sintoma',data:'2026-11-12',nome:'Tontura'};
assert.equal(temporal.findPostStartSymptomsP6({report,records:[record],userId:'u1',personId:'p1',today:'2026-11-18'}).length,1);
assert.equal(temporal.findPostStartSymptomsP6({report,records:[record,{...record,id:'old',data:'2026-11-08'}],userId:'u1',personId:'p1',today:'2026-11-18'}).length,0,'Sintoma anterior não é novo');
assert.equal(temporal.findPostStartSymptomsP6({report,records:[{...record,person_id:'p2'}],userId:'u1',personId:'p1',today:'2026-11-18'}).length,0,'Sem vazamento entre pessoas');
const ws=fs.readFileSync(path.join(ROOT,'components/saude/PharmaLensWorkspaceV7.tsx'),'utf8');
const list=fs.readFileSync(path.join(ROOT,'app/saude/medicamentos/page.tsx'),'utf8');
const gate=fs.readFileSync(path.join(ROOT,'scripts/test-v63-release-gate.mjs'),'utf8');
assert.ok(ws.includes('<PharmaLensEvidenceCardP6 '),'Componente renderizado no PharmaLens');
assert.ok(ws.includes('db.documents.where(\'[user_id+person_id]\')'),'Consulta Dexie com escopo pessoa');
assert.ok((list.includes('regulatoryListLabelMED04(regulatoryProfile, reconciliationP6, catalogIdentity?.regulatoryNeedsReview === true)') && list.includes('{prescriptionIdentityP6}') && list.includes('aria-label={`Ver classificação da receita: ${prescriptionIdentityP6}`}') && !list.includes('prescriptionIdentityP6 ?? medicationRegulatoryShortLabel')), 'Listagem consome o adaptador canônico no trilho visível e acessível');
function extractP6R4(source,name,kind){const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,kind);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(fn,'função real '+name);return ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;}
const visualR4=fs.readFileSync(path.join(ROOT,'lib/medication-regulatory-visual.ts'),'utf8');
const sandboxR4={exports:{},medicationListEvidenceLabelP6:rec.medicationListEvidenceLabelP6};
vm.runInNewContext(extractP6R4(visualR4,'medicationRegulatoryShortLabel',ts.ScriptKind.TS)+'\nthis.medicationRegulatoryShortLabel=medicationRegulatoryShortLabel;',sandboxR4,{timeout:1000});
vm.runInNewContext(extractP6R4(visualR4,'medicationRegulatoryListIdentity',ts.ScriptKind.TS)+'\nthis.medicationRegulatoryListIdentity=medicationRegulatoryListIdentity;',sandboxR4,{timeout:1000});
const copySourceR4=fs.readFileSync(path.join(ROOT,'lib/medications/regulatory-copy-ux360.ts'),'utf8');
const copyModuleR4={exports:{}};
const copySandboxR4={exports:copyModuleR4.exports,module:copyModuleR4,require:id=>{assert.equal(id,'../medication-regulatory-visual');return {medicationRegulatoryShortLabel:sandboxR4.medicationRegulatoryShortLabel,medicationRegulatoryListIdentity:sandboxR4.medicationRegulatoryListIdentity};}};
vm.runInNewContext(ts.transpileModule(copySourceR4,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,copySandboxR4,{timeout:1000});
sandboxR4.regulatoryCopyUX360=copyModuleR4.exports.regulatoryCopyUX360;
vm.runInNewContext(extractP6R4(list,'regulatoryListLabelMED04',ts.ScriptKind.TSX)+'\nthis.label=regulatoryListLabelMED04;',sandboxR4,{timeout:1000});
const documentEvidenceR4={hasDocumentEvidence:true,declaredType:'azul'};
for(const [full,short] of [['Controle especial','Especial'],['Notificação A','Amarela'],['Notificação B','Azul B'],['Notificação B2','Azul B2'],['Receita comum','Comum']])assert.equal(sandboxR4.label({verified:true,label:full},documentEvidenceR4,false),short,'oficial prevalece sobre documento pessoal');
assert.equal(sandboxR4.label({verified:false,label:'Receita informada'},documentEvidenceR4,false),'Azul · cad.','cadastro declarado, não documento nem fonte oficial');
const linkedR4=sandboxR4.regulatoryCopyUX360({verified:false,label:'Receita informada'},false,documentEvidenceR4);assert.equal(linkedR4.official,false);assert.equal(linkedR4.declared,'Notificação azul');assert.match(linkedR4.document,/vinculado/);assert.match(linkedR4.validity,/não comprova/);
assert.equal(sandboxR4.label(null,{hasDocumentEvidence:false,declaredType:'azul'},false),'Azul · cad.');
assert.equal(sandboxR4.regulatoryCopyUX360(null,false,{hasDocumentEvidence:false,declaredType:'azul'}).declared,'Notificação azul');
assert.equal(sandboxR4.label(null,{hasDocumentEvidence:false,declaredType:null},false),'REG. REVISÃO');
assert.equal(sandboxR4.label({verified:true,label:'Notificação A'},documentEvidenceR4,true),'Azul · cad.','declaração não afirma classe oficial em revisão');
assert.equal(sandboxR4.regulatoryCopyUX360({verified:true,label:'Notificação A'},false,documentEvidenceR4,'possible_divergence').official,false);
assert.equal(sandboxR4.regulatoryCopyUX360({verified:true,label:'Classificação em revisão'},false,documentEvidenceR4).rail,'REG. REVISÃO');
// GUARDIAN residual: independently vary documentary evidence, registered type and authority.
for(const [declaredType,expected] of [['comum','Comum · cad.'],['branca','Especial · cad.'],['azul','Azul · cad.'],['amarela','Amarela · cad.'],[null,'REG. REVISÃO'],['invalid','REG. REVISÃO']]){
 for(const hasDocumentEvidence of [false,true]){
  const summary={declaredType,hasDocumentEvidence};
  const a=sandboxR4.regulatoryCopyUX360(null,false,summary);
  assert.equal(a.official,false);assert.equal(a.rail,'REG. PENDENTE');
  assert.equal(sandboxR4.label(null,summary,false),expected);
  assert.equal(a.listRail,expected);
  assert.equal(sandboxR4.label(null,summary,true),expected);
  assert.equal(sandboxR4.regulatoryCopyUX360(null,false,summary,'possible_divergence').listRail,expected);
  assert.match(a.validity,/não comprova/);
 }
}
const guardianConflict=sandboxR4.regulatoryCopyUX360({verified:true,label:'Controle especial'},false,{declaredType:'azul',hasRegulatoryConflict:true});
assert.equal(guardianConflict.listRail,'Especial');assert.equal(guardianConflict.cardDeclaration,'Cadastro em conferência');assert(guardianConflict.declarationConflict);
// GUARDIAN R2: actual declared colors never confer official authority, even in review.
for(const [declaredType,color] of [['comum','#94a3b8'],['branca','#cbd5e1'],['azul','#60a5fa'],['amarela','#facc15'],[null,'#64748b'],['invalid','#64748b'],['constructor','#64748b']]){
 for(const hasDocumentEvidence of [false,true])for(const [review,identity] of [[false,'confirmed'],[true,'confirmed'],[false,'possible_divergence']]){
  const summary={declaredType,hasDocumentEvidence};
  const pending=sandboxR4.regulatoryCopyUX360({verified:false,label:'Receita informada'},review,summary,identity);
  assert.equal(pending.listRailColor,color);assert.equal(pending.official,false);
  const names={'comum':'Comum · cad.','branca':'Especial · cad.','azul':'Azul · cad.','amarela':'Amarela · cad.'};
  const known=Object.hasOwn(names,declaredType);
  const expected=known?names[declaredType]:identity==='confirmed'?'Cat. · s/ classe':'REG. REVISÃO';
  assert.equal(pending.listRail,expected);
  const disputed=sandboxR4.regulatoryCopyUX360({verified:true,label:'Notificação B'},true,summary,identity);
  assert.equal(disputed.listRailColor,color);assert.equal(disputed.official,false);assert.equal(disputed.rail,'REG. REVISÃO');assert.equal(disputed.listRail,expected);
  const official=sandboxR4.regulatoryCopyUX360({verified:true,label:'Notificação B'},false,summary,'confirmed');
  assert.equal(official.listRailColor,null);assert.equal(official.listRail,'Azul B');assert(official.official);
 }
}
const classEvidence={label:'Notificação A',modelCode:'notificacao_a',sourceLabel:'ANVISA — fixture',scope:'substance',railColor:'#eab308'};
const compatible={verified:true,label:'Notificação A',sourceLabel:'ANVISA — fixture',classEvidence,referenceIdentity:'compatible',reviewReasons:['substance-scope','presentation-review']};
const declaredCompatible=sandboxR4.regulatoryCopyUX360(compatible,false,{declaredType:'amarela',hasDocumentEvidence:true});
assert.equal(declaredCompatible.listRail,'Amarela · cad.');assert.equal(declaredCompatible.official,false);assert.equal(declaredCompatible.catalogClass.modelCode,'notificacao_a');
const classCompatible=sandboxR4.regulatoryCopyUX360(compatible,false,{hasDocumentEvidence:false});
assert.equal(classCompatible.listRail,'Amarela · cat.');assert.equal(classCompatible.official,false);assert.equal(classCompatible.rail,'REG. REVISÃO');
const divergent=sandboxR4.regulatoryCopyUX360({...compatible,referenceIdentity:'possible_divergence'},false,{});
assert.equal(divergent.listRail,'REG. REVISÃO');assert.equal(divergent.catalogClass,undefined);
assert.equal(guardianConflict.listRailColor,null,'confirmed authority retains canonical official pigment; conflict remains visible');
assert.equal(sandboxR4.regulatoryCopyUX360({verified:true,label:'Receita comum'},false,{declaredType:'azul',hasRegulatoryConflict:true},'confirmed').listRailColor,'#94a3b8','ordinary prescription remains gray even when a declared conflict exists');
assert(list.includes('regulatoryCopy.listRailColor ?? regulatorySurface.rail'),'runtime ListCard consumes the color projection');
assert(list.includes('<Factory size={12} aria-hidden="true" data-vault-guardian-factory="true"/>'),'historical Lucide icon restored in label');

assert.equal((gate.match(/scripts\/test-vault-ci360-p6-p5-macro2\.cjs/g)||[]).length,1,'Gate V63 contém contrato uma vez');
console.log('P6 P5 MACRO2: 30 contratos de reconciliação, pessoa, proveniência, sobreposição, interação e sintoma temporal OK');
