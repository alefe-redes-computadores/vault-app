'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('lib/medication-intelligence/knowledge-resolver-m153p4.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);const resolve=mod.exports.resolveMedicationKnowledgeM153P4;
const source={id:'source',authority:'anvisa',label:'Anvisa',version:'v1',url:'https://www.gov.br/anvisa/pt-br',verifiedAt:'2026-11-20'};
const rule={vaultPrescriptionType:'azul',prescriptionModel:'B',sources:[source]};
const reference={id:'product',canonicalName:'Fixture',activeIngredients:['A'],presentations:[{label:'10 mg'}],regulatoryIdentity:{referenceType:'product',productId:'00000000-0000-4000-8000-000000000001'},sources:[source],regulatoryRules:[rule]};
const snap={match_kind:'exact',reference};const run=(ref=reference,declared='comum',kind='exact')=>resolve({tipo_receita:declared,catalog_snapshot:{...snap,match_kind:kind,reference:ref}},'2026-11-26');
let n=0;function check(label,fn){fn();console.log('PHARMA_AUTHORITY_PASS',++n,label)}
check('exact product does not certify ingredient completeness or presentation',()=>{const r=run();assert.equal(r.coverage,'partial');assert.equal(r.facts.find(f=>f.kind==='active_ingredient').authority,'official_inferred');assert(!r.facts.some(f=>f.authority==='official_exact'));});
check('declared prescription remains unchanged',()=>{const r=run();assert.equal(r.conflicts[0].declaredValue,'comum');assert.equal(r.conflicts[0].officialValue,'azul');});
check('conflicting simultaneous models never first-match',()=>{const r=run({...reference,regulatoryRules:[rule,{...rule,vaultPrescriptionType:'amarela',prescriptionModel:'A'}]});assert.equal(r.conflicts.length,0);assert.equal(r.facts.find(f=>f.kind==='prescription_type').authority,'declared');});
check('conditional and malformed exceptions block divergence',()=>{for(const override of [{exceptions:[{}]},{hasMalformedExceptions:true}])assert.equal(run({...reference,regulatoryRules:[{...rule,...override}]}).conflicts.length,0)});
check('malformed validity and expired rules cannot drive divergence',()=>{for(const override of [{effectiveFrom:'2026-02-30'},{effectiveUntil:'2020-01-01'},{effectiveFrom:'2030-01-01'}])assert.equal(run({...reference,regulatoryRules:[{...rule,...override}]}).conflicts.length,0)});
check('nonexact product match cannot drive divergence',()=>assert.equal(run(reference,'comum','fuzzy').conflicts.length,0));
check('substance identity cannot drive product rule',()=>assert.equal(run({...reference,regulatoryIdentity:{referenceType:'substance'}}).conflicts.length,0));
check('nonofficial source not promoted',()=>{const fake={...source,url:'https://example.com/anvisa'};const r=run({...reference,sources:[fake],regulatoryRules:[{...rule,sources:[fake]}]});assert.equal(r.conflicts.length,0);assert.equal(r.facts.find(f=>f.kind==='active_ingredient').authority,'unknown');});
console.log('PHARMA_AUTHORITY_TOTAL='+n);
