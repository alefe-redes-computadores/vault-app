#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const relations=read('lib/medication-detail-relations.ts');
const details=read('app/saude/medicamentos/detalhes/page.tsx');
const list=read('app/saude/medicamentos/page.tsx');
const documents=read('app/saude/documentos/page.tsx');
assert(relations.includes('await Promise.all(['),'medication relationships load in one concurrent projection');
assert(relations.includes('item.user_id === input.userId && item.person_id === input.personId'),'clinical collections require account and person');
assert(relations.includes('owned(documentRaw, input.userId, input.personId)'),'document relation is person-scoped');
assert(relations.includes('where("user_id").equals(input.userId)'),'pharmacy history is restricted to the active account');
assert(details.includes('const relationSnapshot = useLiveQuery(')&&details.includes('loadMedicationDetailRelations({'),'detail uses one reactive relational snapshot');
const liveQueries=(details.match(/useLiveQuery\(/g)||[]).length;
assert(liveQueries<=4,`medication detail has ${liveQueries} reactive subscriptions; expected at most 4`);
assert(details.includes('EMPTY_PHARMACY_NAME_MAP'),'empty fallback preserves reference identity across renders');
assert(/const statsProgresso[\s\S]*?\[\s*listaBase,?\s*\][\s\S]*?\);/.test(list),'daily list metrics depend on the canonical processed list');
assert(documents.includes('document.user_id ===')&&documents.includes('item.user_id === user?.id'),'document workspace scopes files and related clinical entities by account and person');
assert((documents.match(/user\?\.id/g)||[]).length>=10,'document relational maps consistently carry active account authority');
for(const file of ['app/saude/medicamentos/detalhes/page.tsx','app/saude/medicamentos/page.tsx','app/saude/documentos/page.tsx']){
  const output=ts.transpileModule(read(file),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((output.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error).length,0,`${file} parses`);
}
console.log('VAULT V311 — medication list/detail performance and document relationship authority OK');
