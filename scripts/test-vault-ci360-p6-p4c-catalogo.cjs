#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let pass=0;
const ok=(name,fn)=>{fn();console.log(`✓ P4C ${++pass} ${name}`)};
const core='lib/medication-catalog/source-governance-p4c.ts',ui='components/saude/RegulatorySourceTrailP4C.tsx';
for(const path of [core,ui,'components/saude/PharmaLensWorkspaceV7.tsx'])ok('TS(X) sintaxe '+path,()=>{
 const syntax=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(syntax.parseDiagnostics.length,0,syntax.parseDiagnostics.map(d=>d.messageText).join(';'));
});
function transpile(p,mocks={}){
 const js=ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:p}).outputText;
 const mod=new Module(p,module);mod.require=id=>{if(Object.hasOwn(mocks,id))return mocks[id];throw Error('Import de runtime inesperado: '+id)};
 mod._compile(js,p);return mod.exports;
}
const macro=transpile('lib/medication-catalog/use-evidence-macro1.ts');
const m=transpile(core,{'@/lib/medication-catalog/use-evidence-macro1':macro});
const UUID='f468c6b0-40a2-4fa4-8d37-86fa88002345';
const base={schema:1,lookup_key:'teste',catalog_signature:'versao-17',resolved_at:'2026-08-12T14:30:00Z',quality:1,match_kind:'exact',reference:{
 id:'ref',canonicalName:'MEDICAMENTO DEMO',regulatoryIdentity:{referenceType:'product',productId:UUID},
 sources:[{id:'fonte1',label:'Dados Anvisa importados',authority:'anvisa',url:'https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro',version:'anvisa-2026',verifiedAt:'2026-07-02T00:00:00Z'}],
 regulatoryRules:[{prescriptionModel:'Modelo 1',effectiveFrom:'2025-01-01',effectiveUntil:'2026-12-31',sources:[]}],
 commercialIdentity:{id:'id',canonicalName:'MEDICAMENTO DEMO',historicalProducts:[{id:'old',name:'Nome antigo',registrationNumber:'x',manufacturer:'fabricante antigo',active:false,relationship:'historical',confidence:'high',presentations:[]}]},
}};
const today='2026-11-18';const clone=x=>JSON.parse(JSON.stringify(x));
ok('referência exata é somente leitura e tem versão rastreável',()=>{const input=clone(base),frozen=JSON.stringify(input),x=m.auditCatalogSourcesP4C(input,today);assert.equal(JSON.stringify(input),frozen);assert.equal(x.identity,'exact_product');assert.equal(x.sources.length,1);assert.equal(x.sources[0].state,'documented');assert.equal(x.historicalProducts,1);assert(x.warnings.some(w=>w.includes('histórico')))});
ok('coincidência de substância não fabrica identidade de produto',()=>{const a=clone(base);a.match_kind='pharmaceutical_equivalence';assert.equal(m.auditCatalogSourcesP4C(a,today).identity,'nonexact_reference');a.reference.regulatoryIdentity={referenceType:'substance'};a.match_kind='exact';assert.equal(m.auditCatalogSourcesP4C(a,today).identity,'nonexact_reference')});
ok('ausência de referência não equivale a regulação negativa',()=>{const a=m.auditCatalogSourcesP4C(null,today);assert.equal(a.identity,'no_reference');assert(a.warnings.some(x=>x.includes('Nenhuma referência')));assert.equal(a.sources.length,0)});
ok('inexistência de URL não cria link',()=>{const a=clone(base);a.reference.sources[0].url='https://evil.example/redirect';assert.equal(m.auditCatalogSourcesP4C(a,today).sources[0].url,null)});
ok('URL enganosamente similar à Anvisa não é usada',()=>{const a=clone(base);a.reference.sources[0].url='https://anvisa.gov.br.evil.example';assert.equal(m.auditCatalogSourcesP4C(a,today).sources[0].url,null)});
ok('fonte versão ausente exige revisão',()=>{const a=clone(base);delete a.reference.sources[0].version;const x=m.auditCatalogSourcesP4C(a,today);assert.equal(x.sources[0].state,'missing_version');assert.equal(x.reviewRequired,true)});
ok('datas impossíveis são rejeitadas e nunca classificadas como vigentes',()=>{const a=clone(base);a.reference.sources[0].verifiedAt='2026-02-31';assert.equal(m.auditCatalogSourcesP4C(a,today).sources[0].state,'invalid_date')});
ok('data futura bloqueia status documental atual',()=>{const a=clone(base);a.reference.sources[0].verifiedAt='2027-01-01';assert.equal(m.auditCatalogSourcesP4C(a,today).sources[0].state,'future_date')});
ok('limite de revisão é informativo, não prazo regulatório',()=>{const a=clone(base);a.reference.sources[0].verifiedAt='2022-01-01';assert.equal(m.auditCatalogSourcesP4C(a,today).sources[0].state,'needs_review')});
ok('modelo anterior é histórico, nunca aplicado a hoje',()=>{const a=clone(base);a.reference.regulatoryRules[0].effectiveUntil='2025-12-31';assert.equal(m.auditCatalogSourcesP4C(a,today).rules[0].state,'historical')});
ok('modelo futuro não é aplicado no presente',()=>{const a=clone(base);a.reference.regulatoryRules[0].effectiveFrom='2027-01-01';a.reference.regulatoryRules[0].effectiveUntil='2028-01-01';assert.equal(m.auditCatalogSourcesP4C(a,today).rules[0].state,'future')});
ok('intervalo inválido precisa de revisão',()=>{const a=clone(base);a.reference.regulatoryRules[0].effectiveFrom='2026-12-31';a.reference.regulatoryRules[0].effectiveUntil='2026-01-01';assert.equal(m.auditCatalogSourcesP4C(a,today).rules[0].state,'unresolved')});
ok('exceções condicionais não resolvidas pedem conferência',()=>{const a=clone(base);a.reference.regulatoryRules[0].hasMalformedExceptions=true;assert(m.auditCatalogSourcesP4C(a,today).warnings.some(w=>w.includes('exceções')))});
ok('conflito de modelos simultâneos não seleciona vencedor',()=>{const a=clone(base);a.reference.regulatoryRules.push({...a.reference.regulatoryRules[0],prescriptionModel:'Modelo 2'});assert(m.auditCatalogSourcesP4C(a,today).warnings.some(w=>w.includes('simultaneamente')))});
ok('dia inválido não atribui regra atual',()=>{const a=m.auditCatalogSourcesP4C(clone(base),'2026-02-31');assert(a.rules.every(r=>r.state==='unresolved'));assert(a.warnings.some(w=>w.includes('Data selecionada inválida')))});
ok('versão importada não atesta situação sanitária atual',()=>{const a=m.auditCatalogSourcesP4C(clone(base),today);assert(a.sources[0].note.includes('não confirma situação sanitária atual'))});
ok('a UI preserva navegação separada e não grava dados',()=>{const s=read(ui),work=read('components/saude/PharmaLensWorkspaceV7.tsx');assert(s.includes('Histórico e fontes do catálogo'));assert(s.includes('RegulatorySourceTrailP4C'));assert(work.includes('RegulatorySourceTrailP4C'));for(const forbidden of ['supabase.from(','.upsert(','db.medicamentos.put(','.add(','.delete(', 'localStorage.setItem(', 'fetch('])assert(!s.includes(forbidden),forbidden)});
ok('dados malformados são tratados como conferência, sem derrubar a tela',()=>{const a=clone(base);a.reference.sources=[null];a.reference.regulatoryRules=[null];const x=m.auditCatalogSourcesP4C(a,today);assert.equal(x.identity,'nonexact_reference');assert.equal(x.sources[0].state,'needs_review');assert.equal(x.rules[0].state,'unresolved');});
ok('V63 registra P4B, Macro1 e P4C exatamente uma vez',()=>{const s=read('scripts/test-v63-release-gate.mjs');for(const n of ['test-vault-ci360-p6-p4b-pharmalens.cjs','test-vault-ci360-p6-p4-macro1.cjs','test-vault-ci360-p6-p4c-catalogo.cjs'])assert.equal(s.split('"scripts/'+n+'"').length-1,1,n)});
console.log(`CI360 P6 P4-C: ${pass} garantias de versão, autoridade, cronologia, segurança e integração OK`);
