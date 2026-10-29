#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hook=read('hooks/useMedicationFormDossier.ts');
const createPage=read('app/saude/medicamentos/novo/page.tsx');
const editPage=read('app/saude/medicamentos/editar/page.tsx');

assert.equal((hook.match(/useLiveQuery\(/g)||[]).length,1,'medication form has one reactive dossier');
assert(hook.includes('await Promise.all(['),'clinical catalogs load concurrently');
for(const repository of ['medicosRepository','farmaciasRepository','hospitaisRepository','locaisRepository','cidsRepository','medicamentosRepository']) {
  assert(hook.includes(repository),`dossier owns ${repository}`);
}
assert(hook.includes('medicamento.id !== excludedMedicationId'),'replacement candidates exclude edited medication');
assert(hook.includes('medicamento.status !== "descontinuado"'),'replacement candidates exclude discontinued medication');
assert(hook.includes('medicamentosRepository.getById(id, activePersonId)'),'target medication is person-authorized');
for(const page of [createPage,editPage]) {
  assert(page.includes('useMedicationFormDossier'),'page consumes shared medication dossier');
  for(const legacy of ['useMedicos()', 'useFarmacias()', 'useHospitais()', 'useLocais()', 'useCids()', 'useMedicamentos()']) {
    assert(!page.includes(legacy),`legacy subscription removed: ${legacy}`);
  }
  const output=ts.transpileModule(page,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((output.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'page parses');
}
assert(createPage.includes('addMedico')&&createPage.includes('addFarmacia'),'create keeps quick professional/pharmacy actions');
assert(editPage.includes('addHospital')&&editPage.includes('addLocal'),'edit keeps quick care-network actions');
console.log('VAULT V316 — unified medication form dossier, person authority and quick actions OK');
