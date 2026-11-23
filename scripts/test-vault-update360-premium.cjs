#!/usr/bin/env node
'use strict';
/** Update 360 Premium: additive permanent regression; no network, secrets or clinical records. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
let n = 0;
const check = (value, label) => { assert.ok(value,label); console.log(`UP360 P OK ${++n}: ${label}`); };
const read = (p) => fs.readFileSync(p,'utf8');
const paths = [
  'components/updates/VaultUpdateCenter.tsx',
  'components/updates/VaultNativeUpdateFlow.tsx',
  'components/updates/VaultUpdateHistory.tsx',
  'lib/updates/client.ts',
  'lib/updates/release-registry.ts',
  'lib/updates/native-apk-updater.ts',
  'lib/updates/notifications.ts',
];
for (const p of paths) {
  const s = ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(s.parseDiagnostics.length === 0,`sintaxe ${p}`);
}
function loadTS(p) {
  const js=ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const mod=new Module(path.resolve(p),module);mod.filename=path.resolve(p);mod.paths=module.paths;mod._compile(js,mod.filename);
  return mod.exports;
}
const reg=loadTS('lib/updates/release-registry.ts');
const release={ build:2195, version:'1.2.0', checksum:'a'.repeat(64), commit:'b'.repeat(40),
  appId:'com.alefejohsefe.vault', signerSha256:'c'.repeat(64), bytes:20_000_000 };
const run=(number,status='completed',conclusion='success')=>({id:number+1000,number,status,conclusion,
  sha:'d'.repeat(40),url:`https://github.com/alefe-redes-computadores/vault-app/actions/runs/${number+1000}`});
check(reg.getVaultUpdateDecision(2195,release,run(2211))==='current','Action #2211 não instala uma release inexistente');
check(reg.getVaultUpdateDecision(2180,release,run(2211))==='available','Guardian: 2180 instalado e release 2195 deve oferecer update');
check(reg.getVaultReleaseRunGapMessage(2180,release,run(2211),true)?.includes('há uma atualização disponível')===true,'Guardian: 2180 nunca diz que está na última release');
check(reg.getVaultReleaseRunGapMessage(2195,release,run(2211),true)?.includes('Você está na última versão distribuída')===true,'2195 instalado permite afirmação de release atual');
check(reg.getVaultReleaseRunGapMessage(null,release,run(2211),true)?.includes('não foi possível identificar')===true,'Build instalado desconhecido não declara atualizado');
check(reg.getVaultReleaseRunGapMessage(2200,release,run(2211),true)?.includes('build superior')===true,'Build instalado superior não é tratado como 2195');
check(reg.getVaultReleaseRunGapMessage(2180,release,run(2211),false)?.includes('PWA é independente')===true,'PWA não é comparada ao build Android');
check(reg.getVaultReleaseRunGapMessage(2180,release,run(2195),true)===null,'Sem gap de Action, nenhum aviso de compilação');
check(reg.getVaultReleaseRunGapMessage(2180,release,run(2211,'completed','failure'),true)===null,'Action falha não produz aviso de sucesso');
check(reg.getVaultLatestRunWarning(release,run(2211))===null,'CI verde não vira warning de falha');
check(reg.getVaultUpdateDecision(2195,{...release,build:2212},run(2212))==='available','release validada posterior é oferecida');
check(reg.getVaultUpdateDecision(2195,release,run(2212,'completed','failure'))==='current','Action posterior com falha não derruba release antiga');
check(reg.getVaultLatestRunWarning(release,run(2212,'completed','failure'))==='failed','falha posterior é informativa');
check(reg.getVaultUpdateDecision(2195,null,run(2212,'in_progress',null))==='preparing','Action em andamento não é release');
check(reg.getVaultUpdateDecision(null,release,run(2211))==='unknown_installed','build desconhecido bloqueia upgrade');
const body=[
  'VAULT_VERSION=1.2.0','VAULT_BUILD=2212','VAULT_COMMIT='+('b'.repeat(40)),
  'VAULT_APK_SHA256='+('a'.repeat(64)),'VAULT_APP_ID=com.alefejohsefe.vault',
  'VAULT_CERT_SHA256='+('c'.repeat(64)),'','## Novidades','- Novidade: Android verificado','',
].join('\n');
const raw={draft:false,prerelease:false,tag_name:'vault-android-b2212',target_commitish:'b'.repeat(40),
  html_url:'https://github.com/alefe-redes-computadores/vault-app/releases/tag/vault-android-b2212',
  published_at:'2026-11-23T17:00:00Z',body,assets:[{name:'Vault-App.apk',size:20_000_000,
  browser_download_url:'https://github.com/alefe-redes-computadores/vault-app/releases/download/vault-android-b2212/Vault-App.apk',
  digest:'sha256:'+('a'.repeat(64))}]};
check(reg.parseVaultApprovedRelease(raw)?.build===2212,'release completa autentica metadados formais');
check(reg.parseVaultApprovedRelease({...raw,draft:true})===null,'draft não distribuída');
check(reg.parseVaultApprovedRelease({...raw,prerelease:true})===null,'prerelease não distribuída');
check(reg.parseVaultApprovedRelease({...raw,assets:[{...raw.assets[0],digest:'sha256:'+('e'.repeat(64))}]})===null,'digest adulterado bloqueado');
check(reg.parseVaultApprovedRelease({...raw,body:body.replace('com.alefejohsefe.vault','com.outro.app')})===null,'package diferente bloqueado');
check(reg.parseVaultApprovedRelease({...raw,body:body.replace('VAULT_CERT_SHA256='+('c'.repeat(64)),'VAULT_CERT_SHA256=invalid')})===null,'certificado inválido bloqueado');
check(reg.parseVaultApprovedRelease({...raw,assets:[]})===null,'release sem APK bloqueada');
check(reg.parseVaultApprovedRelease({...raw,html_url:'https://evil.example'})===null,'origem externa bloqueada');
const center=read('components/updates/VaultUpdateCenter.tsx');
check(center.includes('Última compilação') && center.includes('Última release distribuída') && center.includes('getVaultReleaseRunGapMessage'),'estados CI, release e aviso contextual distintos');
check(center.includes('VaultNativeUpdateFlow') && center.includes('VaultUpdateHistory'),'mantém bridge e histórico canônicos');
check(center.includes('Copiar SHA-256') && center.includes('Procurar atualizações'),'mantém diagnóstico e busca manual');
const flow=read('components/updates/VaultNativeUpdateFlow.tsx');
for(const text of ['downloadVerified','installVerified','cancelDownload','openInstallSettings','downloadProgress','busy.current']) check(flow.includes(text),'fluxo M111 mantém '+text);
check(flow.includes('Atualizar VAULT'),'CTA premium presente');
const notice=read('lib/updates/notifications.ts');
check(notice.includes('s.decision !== "available"') && notice.includes('LAST_BUILD'),'alerta apenas release, com deduplicação');
const history=read('components/updates/VaultUpdateHistory.tsx');
check(history.includes('installedBuild')&&history.includes('versionsSinceInstalled')&&history.includes('Histórico de versões'),'histórico cumulativo não gera releases');
const workflow=read('.github/workflows/build-android.yml');
const promote=read('.github/workflows/promote-android-run.yml');
const publisher=read('scripts/vault-publish-verified-action.sh');
check(promote.includes('environment: vault-android-release'),'ambiente de aprovação explícito');
check(promote.includes('VAULT_ALLOW_STRICT_ANDROID_RELEASE')&&promote.includes('workflow_run:')&&promote.includes('workflow_dispatch:'),'publicação só após run completa ou despacho aprovado');
check(publisher.includes('VAULT_SOURCE_RUN_ID')&&publisher.includes('gh release create'),'promove o APK do run original sem recompilação');
check(publisher.includes('git rev-parse origin/main') && promote.includes('VAULT_EXPECTED_SHA'),'não publica commit obsoleto');
check(publisher.includes('apksigner') && publisher.includes('dump badging'),'identidade e assinatura revalidadas');
check(publisher.includes('gh release view "$TAG"') && publisher.includes('--latest'),'release imutável, latest só após validação');
check(publisher.includes('VAULT_CERT_SHA256')&&publisher.includes('VAULT_APK_SHA256'),'metadados cripto preservados');
check(workflow.includes('npm run test:release')&&workflow.includes('node scripts/test-vault-update360-v34.cjs'),'V63/V70/TS preservados');
const list=read('scripts/test-v63-release-gate.mjs');
check(list.includes('scripts/test-vault-update360-premium.cjs'),'novo contrato incluído no V63');
console.log(`UPDATE360 PREMIUM: ${n}/${n} verificações dirigidas OK (sem rede; homologação Android física separada).`);
