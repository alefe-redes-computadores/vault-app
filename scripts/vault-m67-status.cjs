#!/usr/bin/env node
'use strict';
/** Read-only final release status. No secrets, tokens or clinical payloads. */
const {execFileSync}=require('node:child_process');
const run=(bin,args)=>{try{return execFileSync(bin,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000}).trim();}catch{return null;}};
const head=run('git',['rev-parse','HEAD']);
if(!head){console.error('Execute dentro do clone Git do VAULT.');process.exitCode=2;}
else{
 const remote=run('git',['ls-remote','origin','refs/heads/main'])?.split(/\s+/)[0]||null;
 const subject=run('git',['log','-1','--format=%s'])||'';
 const branch=run('git',['branch','--show-current'])||'';
 const dirty=run('git',['status','--porcelain'])||'';
 const isM67=/\bM67\b/.test(subject);
 console.log('=== VAULT · CERTIFICAÇÃO M67 ===');
 console.log('Branch:',branch,'\nHEAD:',head,'\nAssunto:',subject);
 console.log('Local × GitHub:',remote?remote===head?'iguais':'DIVERGENTES':'remoto indisponível');
 console.log('Árvore de trabalho:',dirty?'contém alterações':'limpa');
 console.log('M67 no commit local:',isM67?'sim':'não');
 console.log('Release:',isM67&&remote===head&&branch==='main'?'PUBLICADA (GitHub)':'NÃO CONFIRMADA');
 console.log('APK: precisa de aprovação separada no GitHub Actions (workflow Compilar APK Vault).');
 if(!isM67||remote!==head||branch!=='main')process.exitCode=1;
}
