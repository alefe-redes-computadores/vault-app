#!/usr/bin/env node
'use strict';
/**
 * VAULT Fast Lane: same canonical V63 contracts + both V70 files + tsc.
 * Runs ALL independent checks and reports every failure. Does not change code,
 * skip clinical tests, create APKs, publish releases, or read user health data.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
const matched=gate.match(/const contracts = \[([\s\S]*?)\n\];/);
if(!matched)throw Error('Fast Lane: nao foi possivel ler a lista canonica V63');
const contracts=[...matched[1].matchAll(/"(scripts\/[^"\n]+\.(?:cjs|mjs))"/g)].map(m=>m[1]);
if(contracts.length<350||new Set(contracts).size!==contracts.length)throw Error('Fast Lane: V63 incompleto ou duplicado');
for(const file of contracts)if(!fs.existsSync(file))throw Error('Fast Lane: contrato nao encontrado '+file);
if(!contracts.includes('scripts/test-vault-m150-p3.cjs'))throw Error('Fast Lane: contrato M150 P3 nao cadastrado no V63');
const jobs=[...contracts,'scripts/test-v70-super-integrity-ux-contract.mjs','scripts/test-v70-final-completeness-contract.mjs'];
const failures=[];
let successes=0;
for(let i=0;i<jobs.length;i++){
  const file=jobs[i];
  console.log(`\n[VAULT Fast Lane ${i+1}/${jobs.length+1}] ${file}`);
  const r=spawnSync(process.execPath,[file],{stdio:'inherit',env:process.env});
  if(r.error||r.status!==0){failures.push({file,code:r.status??'spawn-error'});console.error(`FALHA_REAL: ${file} (${r.status??r.error?.message})`);}
  else successes++;
}
console.log(`\n[VAULT Fast Lane ${jobs.length+1}/${jobs.length+1}] TypeScript --noEmit`);
const tsc=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{stdio:'inherit'});
if(tsc.error||tsc.status!==0)failures.push({file:'TypeScript --noEmit',code:tsc.status??'spawn-error'});
else successes++;
const lines=[
  `VAULT_FASTLANE_CANDIDATO=${process.env.GITHUB_SHA||'LOCAL'}`,
  `V63_CONTRATOS=${contracts.length}`,
  `V70_CONTRATOS=2`,
  `TSC=1`,
  `APROVADOS=${successes}`,
  `FALHAS=${failures.length}`,
  ...failures.map((e,i)=>`${i+1}. ${e.file} [${e.code}]`),
  failures.length?'RESULTADO=BLOQUEADA_SEM_PUBLICACAO':'RESULTADO=GATE_INTEGRAL_APROVADO',
];
const report=process.env.VAULT_FASTLANE_REPORT||path.resolve('fastlane-diagnostico.txt');
fs.mkdirSync(path.dirname(report),{recursive:true});
fs.writeFileSync(report,lines.join('\n')+'\n');
console.log('\n'+lines.join('\n'));
if(failures.length)process.exitCode=1;
