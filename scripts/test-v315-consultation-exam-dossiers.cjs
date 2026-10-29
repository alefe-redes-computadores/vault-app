#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const consultation=read('lib/consultation-detail-dossier.ts');
const consultationPage=read('app/saude/consultas/detalhes/page.tsx');
const consultationActions=read('hooks/useConsultaActions.ts');
const exam=read('lib/exam-detail-dossier.ts');
const examPage=read('app/saude/exames/detalhes/page.tsx');

assert(consultation.includes('!ownedPerson(consulta, input)'),'consultation URL id requires account/person authority');
assert(consultation.includes('await Promise.all(['),'consultation relations load concurrently');
assert(consultation.includes('ownedAccount(doctorRaw, input.userId)')&&consultation.includes('ownedAccount(hospitalRaw, input.userId)'),'consultation network is account-owned');
assert.equal((consultationPage.match(/useLiveQuery\(/g)||[]).length,1,'consultation detail has one Dexie subscription');
for(const hook of ['useConsultas()', 'useTratamentos()', 'useCids()', 'useMedicamentos()', 'useExames()', 'useMedicos()', 'useHospitais()', 'useLocais()']) assert(!consultationPage.includes(hook),`consultation global hook removed: ${hook}`);
assert(!consultationActions.includes('useLiveQuery'),'consultation mutation hook has no hidden list subscription');
assert(exam.includes('!owned(exame, input)'),'exam URL id requires account/person authority');
assert(exam.includes('historico: examsRaw.filter')&&exam.includes('normalizedName(item.nome)'),'exam history shares the authorized dossier');
assert.equal((examPage.match(/useLiveQuery\(/g)||[]).length,1,'exam detail has one direct Dexie dossier subscription');
assert(examPage.includes('addMedico')&&examPage.includes('addLocal'),'quick doctor/location creation remains available');
assert(!examPage.includes('setExame('),'exam reactive source owns refresh');
for(const file of ['app/saude/consultas/detalhes/page.tsx','app/saude/exames/detalhes/page.tsx']){
 const output=ts.transpileModule(read(file),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal((output.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,`${file} parses`);
}
console.log('VAULT V315 — authorized consultation/exam dossiers, canonical history and preserved quick relations OK');
