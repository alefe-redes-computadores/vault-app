#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const v=require('./vault-prepare-version.cjs');
const notes=require('./generate-vault-release-notes-v34.cjs');
let n=0;const ok=(predicate,label)=>{assert.ok(predicate,label);console.log(`VERSION360 OK ${++n}: ${label}`)};
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),
 lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')),
 app=fs.readFileSync('lib/app-version.ts','utf8');
ok(v.consistency(pkg,lock,app)===pkg.version,'3 autoridades semânticas consistentes');
for(const [from,to,kind] of [['1.2.0','1.2.1','patch'],['1.2.0','1.3.0','minor'],['1.2.0','2.0.0','major']])ok(v.kind(from,to)===kind,'incremento '+kind);
for(const to of ['1.2.0','1.1.9','1.4.1','1.2.3','garbage'])ok((()=>{try{v.kind('1.2.0',to);return false}catch{return true}})(),'rejeita salto indevido '+to);
const json=JSON.stringify({novidades:['Integração dos fatos clínicos entre superfícies do app.'],melhorias:['Navegação consistente em telas clínicas.'],correcoes:['Corrigida falha verificável de apresentação.'],seguranca:[]});
ok(v.notes(json).includes('### Novidades')&&v.notes(json).includes('### Correções'),'notas humanas estruturadas');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vault-version-test-'));
try{
  fs.mkdirSync(path.join(temp,'lib'));
  const write=(p,c)=>fs.writeFileSync(path.join(temp,p),c);
  write('package.json',JSON.stringify({name:'vault',version:'1.2.0'},null,2)+'\n');
  write('package-lock.json',JSON.stringify({name:'vault',version:'1.2.0',packages:{'':{version:'1.2.0'}}},null,2)+'\n');
  write('lib/app-version.ts','export const APP_VERSION = "1.2.0";\n');
  write('CHANGELOG.md','# Histórico de versões do VAULT\n');
  write('README.md','<!-- VAULT_CURRENT_VERSION:1.2.0 -->\n');
  write('notes.json',json);
  const prepared=v.plan(temp,'1.3.0',path.join(temp,'notes.json'),'minor','2026-11-23');
  ok(prepared.files['package-lock.json'].includes('"version": "1.3.0"')&&prepared.files['README.md'].includes('VAULT_CURRENT_VERSION:1.3.0'),'preparo alinha package-lock e README');
  ok(prepared.files['CHANGELOG.md'].includes('[1.3.0]')&&prepared.files['lib/app-version.ts'].includes('"1.3.0"'),'preparo alinha histórico e APP_VERSION');
  for(const [file,body] of Object.entries(prepared.files))write(file,body);
  ok(notes.curatedVersionNotes(temp)?.includes('Integração dos fatos clínicos')===true,'release prioriza notas humanas preparadas');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
ok((()=>{try{v.notes('{}');return false}catch{return true}})(),'recusa release sem descrição real');
const subjects=Array.from({length:65},(_,i)=>`feat(vault): Melhoria funcional ${i+1}`);
ok(notes.summarize(subjects).length===65,'mais de 40 commits/12 notas preservados');
const formatted=notes.formatReleaseNotes(subjects.concat(['fix(vault): Correção relevante']));
ok(formatted.includes('### Novidades')&&formatted.includes('### Correções')&&formatted.includes('Melhoria funcional 65'),'resumo cumulativo agrupado');
const w=fs.readFileSync('.github/workflows/promote-android-run.yml','utf8');
ok(w.includes('workflow_dispatch:')&&w.includes('workflow_run:')&&w.includes('environment: vault-android-release'),'distribuição exige ambiente protegido');
ok(w.includes('VAULT_SOURCE_RUN_ID:')&&w.includes('VAULT_EXPECTED_SHA:'),'promove SHA/run originais');
const shell=fs.readFileSync('scripts/vault-publish-verified-action.sh','utf8');
ok(shell.includes('VAULT_SOURCE_RUN_ID')&&shell.includes('VAULT_EXPECTED_SHA')&&shell.includes('get_cert')&&shell.includes('sha256sum'),'proveniência e certificado aferidos');
ok(!shell.includes('npm run build')&&!shell.includes('gradlew')&&!shell.includes('assembleDebug'),'promoção não recompila');
ok(fs.readFileSync('CHANGELOG.md','utf8').includes('Não distribuído'),'documentação não confunde código e release');
console.log(`VAULT VERSION360: ${n}/${n} testes aprovados, sem mudar arquivos.`);
