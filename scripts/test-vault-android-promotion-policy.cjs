#!/usr/bin/env node
'use strict';
/** Hermetic adversarial tests for promotion policy. Never calls GitHub or handles secrets. */
const assert=require('node:assert/strict');
const policy=require('./vault-android-release-policy.cjs');
const repo='alefe-redes-computadores/vault-app';
const sha='94cf39fb99c00875b0c21f97dff75224e09cd6f9';
const later='f'.repeat(40),id=45219364674,artifactId=14840033542;
const run={id,run_number:2211,head_sha:sha,head_branch:'main',head_repository:{full_name:repo},
  status:'completed',conclusion:'success',event:'push',path:'.github/workflows/build-android.yml'};
const original={id:artifactId,name:'Vault-App-debug',size_in_bytes:18000000,expired:false,
  expires_at:'2999-12-30T16:00:00Z',digest:'sha256:'+('a'.repeat(64)),
  archive_download_url:`https://api.github.com/repos/${repo}/actions/artifacts/${artifactId}/zip`,
  workflow_run:{id,head_sha:sha,head_branch:'main'}};
const artifacts={artifacts:[original]};
const evaluate=(r=run,a=artifacts,options={})=>policy.evaluate({run:r,artifacts:a,expectedRunId:id,expectedSha:sha,mainSha:sha,...options});
let tests=0;const ok=(cond,message)=>{assert.ok(cond,message);console.log('PROMOTE360 OK '+(++tests)+': '+message)};
const rejects=(f,msg)=>{assert.throws(f,/VAULT_RELEASE_STOP/,msg);ok(true,msg)};
ok(evaluate().tag==='vault-android-b2211','tag deriva do run original, não da promotora');
rejects(()=>evaluate({...run,conclusion:'failure'}),'Action falha recusada');
rejects(()=>evaluate({...run,status:'in_progress'}),'Action ainda rodando recusada');
rejects(()=>evaluate({...run,head_sha:later}),'SHA divergente recusado');
rejects(()=>evaluate({...run,head_branch:'feature'}),'branch não principal recusada');
rejects(()=>evaluate({...run,head_repository:{full_name:'malicioso/repo'}}),'repo incorreto recusado');
rejects(()=>evaluate({...run,path:`${repo}/.github/workflows/evil.yml@refs/heads/main`}), 'workflow de origem errado recusado');
rejects(()=>evaluate({...run,path:'.github/workflows/build-android.yml.bak'}), 'sufixo malicioso no workflow recusado');
rejects(()=>evaluate({...run,path:'prefix/.github/workflows/build-android.yml'}), 'prefixo arbitrário no workflow recusado');
rejects(()=>evaluate({...run,path:`${repo}/.github/workflows/build-android.yml@refs/heads/main`}), 'formato não retornado pela API real não aceito por engano');
ok(evaluate({...run,path:'.github/workflows/build-android.yml'}).build===2211, 'formato real da API do run #2211 aceito, com identidade completa');
rejects(()=>evaluate({...run,id:id+1}),'run ID divergente recusado');
rejects(()=>evaluate(run,{artifacts:[]}), 'sem artefato recusado');
rejects(()=>evaluate(run,{artifacts:[original,original]}),'duplicado recusado');
rejects(()=>evaluate(run,{artifacts:[{...original,expired:true}]}),'artefato vencido recusado');
rejects(()=>evaluate(run,{artifacts:[{...original,expires_at:'2000-01-01T00:00:00Z'}]}),'prazo passado recusado');
rejects(()=>evaluate(run,{artifacts:[{...original,digest:'invalid'}]}),'ZIP sem digest recusado');
rejects(()=>evaluate(run,{artifacts:[{...original,workflow_run:{...original.workflow_run,id:id+2}}]}),'proveniência de run divergente recusada');
rejects(()=>evaluate(run,{artifacts:[{...original,archive_download_url:'https://evil.example/apk.zip'}]}),'URL fora do GitHub recusada');
rejects(()=>evaluate(run,artifacts,{mainSha:later}),'main avançada sem aprovação recusada');
rejects(()=>evaluate(run,artifacts,{mainSha:later,allowStale:true,approvedStaleSha:'a'.repeat(40)}),'aprovação stale de SHA diferente recusada');
ok(evaluate(run,artifacts,{mainSha:later,allowStale:true,approvedStaleSha:sha}).tag==='vault-android-b2211','stale com SHA explicitamente aprovado aceito');
const releaseBody=`VAULT_VERSION=1.2.0\nVAULT_BUILD=2195\nVAULT_COMMIT=${later}\nVAULT_APK_SHA256=${'b'.repeat(64)}\nVAULT_APP_ID=com.alefejohsefe.vault\nVAULT_CERT_SHA256=${'c'.repeat(64)}\n`;
const latest={draft:false,prerelease:false,tag_name:'vault-android-b2195',body:releaseBody,
  target_commitish:later,assets:[{name:'Vault-App.apk',browser_download_url:`https://github.com/${repo}/releases/download/vault-android-b2195/Vault-App.apk`}]};
ok(policy.parseRelease(latest).build===2195,'release anterior íntegra como manifesto');
rejects(()=>policy.parseRelease({...latest,draft:true}),'draft recusado');
rejects(()=>policy.parseRelease({...latest,body:releaseBody.replace('VAULT_BUILD=2195','VAULT_BUILD=2211')}),'build diferente da tag recusado');
rejects(()=>policy.parseRelease({...latest,assets:[]}), 'release sem APK recusada');
rejects(()=>policy.parseRelease({...latest,body:releaseBody.replace('VAULT_APK_SHA256='+('b'.repeat(64)),'VAULT_APK_SHA256=INVALID')}), 'digest da release anterior inválido recusado');
console.log(`VAULT PROMOTE360 POLICY: ${tests}/${tests} provas sintéticas, sem qualquer publicação.`);
