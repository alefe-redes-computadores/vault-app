#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const dossier=read('lib/surgery-detail-dossier.ts');
const details=read('app/saude/cirurgias/detalhes/page.tsx');

assert(dossier.includes('!ownedPerson(surgery, input)'),'surgery URL id alone cannot authorize the event');
assert(dossier.includes('await Promise.all(['),'surgery relations load concurrently');
assert(dossier.includes('ownedAccount(doctorRaw, input.userId)')&&dossier.includes('ownedAccount(hospitalRaw, input.userId)')&&dossier.includes('ownedAccount(locationRaw, input.userId)'),'global care network requires account authority');
assert(dossier.includes('authorizedTreatmentIds')&&dossier.includes('intersectsTreatment'),'medication and exam crossings use authorized treatments only');
assert(dossier.includes('ownedPerson(item, input) && intersectsTreatment(item.tratamento_ids)'),'crossed clinical collections require account and person');
assert(details.includes('const dossier = useLiveQuery(')&&details.includes('loadSurgeryDetailDossier({'),'detail consumes one reactive dossier');
assert.equal((details.match(/useLiveQuery\(/g)||[]).length,1,'surgery detail keeps one Dexie subscription');
assert(!details.includes('db.medicos.toArray()')&&!details.includes('db.medicamentos.toArray()')&&!details.includes('db.exames.toArray()'),'detail no longer reads global clinical tables');
assert(!details.includes('setCirurgia('),'reactive source owns post-mutation refresh');
const output=ts.transpileModule(details,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal((output.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error).length,0,'surgery detail parses');
console.log('VAULT V314 — one authorized surgery dossier, safe treatment crossings and reactive mutation refresh OK');
