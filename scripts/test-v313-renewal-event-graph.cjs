#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const graph=read('lib/renewal-detail-relations.ts');
const details=read('app/saude/renovacao/detalhes/page.tsx');
const actions=read('hooks/useRenovacaoActions.ts');
const prescription=read('app/saude/renovacao/nova-receita/page.tsx');

assert(graph.includes('await Promise.all(['),'event graph loads relations concurrently');
assert(graph.includes('!ownedByPerson(renewal, input.userId, input.personId)'),'URL id alone cannot authorize a renewal');
assert(graph.includes('ownedByPerson(documentRaw, input.userId, input.personId)'),'document requires account and person authority');
assert(graph.includes('ownedByAccount(doctorRaw, input.userId)')&&graph.includes('ownedByAccount(pharmacyRaw, input.userId)'),'care network requires account authority');
assert(graph.includes('item.renovacao_origem_id === input.renewalId')&&graph.includes('item.renovacao_realizada_id === input.renewalId'),'origin and realized withdrawal links remain distinct');
assert(details.includes('const relationSnapshot = useLiveQuery(')&&details.includes('loadRenewalDetailRelations({'),'detail consumes one reactive event graph');
assert.equal((details.match(/useLiveQuery\(/g)||[]).length,1,'renewal detail keeps one Dexie subscription');
for(const hook of ['useRetiradas()', 'useRenovacoes()', 'useMedicamentos()', 'useMedicos()', 'useFarmacias()', 'useHospitais()', 'useLocais()']) assert(!details.includes(hook),`global subscription removed: ${hook}`);
assert(actions.includes('Mutation-only hook')&&!actions.includes('useLiveQuery'),'mutation actions do not hide a list subscription');
assert(details.includes('relationSnapshot?.documento?.id'),'UI only opens an authorized document relation');
assert(prescription.includes('mode=plan')||prescription.includes('planOnly'),'prescription workflow preserves planning mode');
assert(prescription.includes('selectAttachment')&&prescription.includes('createDocument')&&prescription.includes('somenteReceita'),'prescription workflow preserves attachment, document and non-acquisition authority');
for(const file of ['app/saude/renovacao/detalhes/page.tsx','lib/renewal-detail-relations.ts','hooks/useRenovacaoActions.ts']){
  const output=ts.transpileModule(read(file),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((output.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error).length,0,`${file} parses`);
}
console.log('VAULT V313 — prescription/acquisition event graph, authorized document and mutation-only actions OK');
