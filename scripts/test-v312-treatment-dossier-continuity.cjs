#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const projection=read('lib/treatment-detail-relations.ts');
const details=read('app/saude/tratamentos/detalhes/page.tsx');

assert(projection.includes('await Promise.all(['),'treatment dossier loads its collections concurrently');
assert(projection.includes('!belongsToPerson(treatmentRaw, input.userId, input.personId)'),'URL id alone cannot authorize a treatment');
assert(projection.includes('value.user_id === userId && value.person_id === personId'),'clinical relations require account and person');
assert(projection.includes('medicationIds.has(item.medicamento_id)'),'acquisitions only enter through authorized treatment medications');
assert(projection.includes('referencedDoctorIds.has(item.id)')&&projection.includes('referencedHospitalIds.has(item.id)')&&projection.includes('referencedLocationIds.has(item.id)'),'care network only exposes referenced account-owned entities');
assert(details.includes('const relationSnapshot = useLiveQuery(')&&details.includes('loadTreatmentDetailRelations({'),'detail consumes one reactive dossier snapshot');
assert.equal((details.match(/useLiveQuery\(/g)||[]).length,1,'treatment detail keeps one Dexie subscription');
for(const legacyHook of ['useTratamentos()', 'useRenovacoes()', 'useCids()', 'useMedicos()', 'useHospitais()', 'useLocais()', 'useConsultas()', 'useExames()', 'useCirurgias()', 'useRegistrosSaude()', 'useDocuments()']){
  assert(!details.includes(legacyHook),`global subscription removed: ${legacyHook}`);
}
const output=ts.transpileModule(details,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal((output.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error).length,0,'treatment detail parses');
console.log('VAULT V312 — one authorized reactive treatment dossier across clinical history and care network OK');
