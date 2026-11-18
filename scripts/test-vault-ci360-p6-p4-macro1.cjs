'use strict';
/* Contract for executable evidence selector; deterministic no network or production data. */
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
function loadTS(p){const output=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},reportDiagnostics:true});
 assert.equal(output.diagnostics?.length||0,0,'TS transpile: '+p);
 const mod={exports:{}};vm.runInNewContext(output.outputText,{exports:mod.exports,module:mod,require:x=>{throw Error('Unexpected dependency '+x)},Set,Map,Date,URL,Number,String,Array,Object,Math,Boolean,Error,RegExp,console},{filename:p,timeout:6000});return mod.exports;}
const engine=loadTS('lib/medication-catalog/use-evidence-macro1.ts');
const product='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',presentation='33333333-3333-4333-8333-333333333333';
const row=(over={})=>({id:'a',product_id:product,presentation_id:null,fact_kind:'food_relation',statement:'Seguir a orientação da bula para o uso com refeições.',qualification:null,
 source_url:'https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico',source_section:'Cuidados de administração',
 source_document_sha256:'a'.repeat(64),source_version:'bula revisada 2026',reviewed_at:'2026-11-17',source_published_at:null,effective_from:null,effective_until:null,review_status:'verified',...over});
const exact={match_kind:'exact',reference:{sources:[{authority:'anvisa'}],regulatoryIdentity:{referenceType:'product',productId:product}}};
const selected=rows=>engine.selectVerifiedUseFactsM1({productId:product,rows,today:'2026-11-18'});
assert.equal(engine.exactOfficialProductId(exact),product);
assert.equal(engine.exactOfficialProductId({...exact,match_kind:'pharmaceutical_equivalence'}),null);
assert.equal(engine.exactOfficialProductId({...exact,reference:{...exact.reference,sources:[{authority:'catalogo_local'}]}}),null);
assert.equal(engine.exactOfficialProductId({...exact,reference:{...exact.reference,regulatoryIdentity:{referenceType:'substance'}}}),null);
assert.equal(engine.exactOfficialProductId(null),null);
assert(engine.safeOfficialUrl('https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico'));
assert(!engine.safeOfficialUrl('https://gov.br.evil.test/anvisa'));
assert(!engine.safeOfficialUrl('https://www.gov.br.evil.test/anvisa'));
assert(!engine.safeOfficialUrl('http://www.gov.br/anvisa'));
assert(!engine.safeOfficialUrl('https://example.com/'));
assert(!engine.safeOfficialUrl('https://www.gov.br/somewhere'));
assert.equal(selected([row()]).state,'verified');
assert.equal(selected([row()]).facts.length,1);
assert.equal(selected([row({review_status:'draft'})]).state,'no_verified_facts');
assert.equal(selected([row({review_status:'rejected'})]).state,'no_verified_facts');
assert.equal(selected([row({product_id:other})]).state,'no_verified_facts');
assert.equal(selected([row({presentation_id:presentation})]).state,'no_verified_facts');
assert.equal(engine.selectVerifiedUseFactsM1({productId:product,presentationId:presentation,rows:[row({presentation_id:presentation})],today:'2026-11-18'}).state,'verified');
assert.equal(selected([row({reviewed_at:'2022-11-17'})]).state,'stale');
assert.equal(selected([row({reviewed_at:'2026-11-19'})]).state,'stale');
assert.equal(selected([row({effective_from:'2026-11-20'})]).state,'no_verified_facts');
assert.equal(selected([row({effective_until:'2026-11-10'})]).state,'no_verified_facts');
assert.equal(selected([row({source_document_sha256:'xyz'})]).state,'no_verified_facts');
assert.equal(selected([row({source_url:'https://evil.example/'})]).state,'no_verified_facts');
assert.equal(selected([row(),row({id:'b',statement:'Informação incompatível sobre refeições'})]).state,'conflict');
assert.equal(selected([row(),row({id:'b',fact_kind:'light_protection',statement:'Manter protegido da luz conforme a bula.'})]).facts.length,2);
assert.equal(engine.selectVerifiedUseFactsM1({productId:null,rows:[row()],today:'2026-11-18'}).state,'needs_exact_identity');
for(let i=0;i<350;i++){const rows=[row({id:String(i)}),row({product_id:other,statement:'Texto externo que não pode vazar'})];assert(selected(rows).facts.every(x=>x.product_id===product));}
const stage=require('./medication-catalog/stage-anvisa-use-evidence-macro1.cjs');
const source={url:'https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico',sha256:'f'.repeat(64),version:'2026-11',reviewed_at:'2026-11-18'};
const sample={source,facts:[{product_id:product,fact_kind:'food_relation',statement:'Conferir alimentação nas instruções oficiais.',source_section:'Modo de usar'}]};
assert.equal(stage.prepare(sample).rows[0].review_status,'draft');
assert.throws(()=>stage.prepare({...sample,source:{...source,url:'https://anvisa.gov.br.evil.tld/steal'}}),/fonte/);
assert.throws(()=>stage.prepare({...sample,facts:[sample.facts[0],sample.facts[0]]}),/duplicidade/);
assert.throws(()=>stage.prepare({...sample,facts:[{...sample.facts[0],presentation_id:presentation}]}),/apresentação/);
for(const p of ['components/saude/MedicationOfficialGuidanceMacro1.tsx','components/saude/MedicationKnowledgePanelM153P4.tsx']){
 const compiled=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});assert.equal(compiled.diagnostics?.length||0,0,'JSX '+p);
}
const panel=read('components/saude/MedicationKnowledgePanelM153P4.tsx'),ui=read('components/saude/MedicationOfficialGuidanceMacro1.tsx');
const gate=read('scripts/test-v63-release-gate.mjs');
assert(panel.includes('MedicationOfficialGuidanceMacro1'));
assert(ui.includes('exactOfficialProductId')&&ui.includes('readOfficialUseEvidenceM1')&&ui.includes('Conferir fonte oficial'));
assert(ui.includes('Nenhuma orientação foi presumida')&&ui.includes('Nenhum ajuste automático'));
assert(gate.includes('scripts/test-vault-ci360-p6-p4-macro1.cjs'));
const sql=read('docs/VAULT-CI360-P6-P4-MACRO1.md');assert(sql.includes('RLS')&&sql.includes('NÃO causal'));
console.log('P6 P4 MACRO1: fonte, vigência, produto exato, isolamento, rascunho, conflito, offline-fail-closed e UI OK');
