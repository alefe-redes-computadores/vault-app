#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hook=read('hooks/useGeneralDocumentFormDossier.ts');
const createPage=read('app/documentos/novo/page.tsx');
const editPage=read('app/documentos/editar/page.tsx');

assert.equal((hook.match(/useLiveQuery\(/g)||[]).length,1,'general document form has one reactive dossier');
assert(hook.includes('await Promise.all(['),'persons, vaults and target document load concurrently');
assert(hook.includes('db.persons.where("user_id").equals(user.id)'),'persons are account-owned');
assert(hook.includes('db.vaults.where("user_id").equals(user.id)'),'vaults are account-owned');
assert(hook.includes('vault.person_id === activePersonId'),'vaults are active-person-owned');
assert(hook.includes('documentsRepository.getById(documentId, activePersonId)'),'target document uses repository person authority');
for(const page of [createPage,editPage]) {
  assert(page.includes('useGeneralDocumentFormDossier'),'page consumes shared authorized dossier');
  assert(!page.includes('usePersons()'),'legacy persons subscription removed');
  assert(!page.includes('useLiveQuery('),'page has no direct Dexie subscription');
  const output=ts.transpileModule(page,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((output.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'page parses');
}
assert(!editPage.includes('useDocument('),'edit target subscription moved into dossier');
assert(editPage.includes('if (isDossierLoading)'),'loading remains distinct from not-found');
assert(createPage.includes('createDocument')&&editPage.includes('updateDocument'),'canonical document mutations remain');
console.log('VAULT V317 — one authorized dossier for general document create/edit forms OK');
