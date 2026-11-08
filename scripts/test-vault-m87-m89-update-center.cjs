#!/usr/bin/env node
'use strict';
/** Pure M87–M89 contract, no GitHub network calls and no medical data writes. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ts = require('typescript');
let checks = 0;
const ok = (condition,label) => { assert.ok(condition, `M87–M89: ${label}`); console.log(`✓ ${++checks}: ${label}`); };
const read = file => fs.readFileSync(file, 'utf8');
function loadTS(file) {
  const js=ts.transpileModule(read(file), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(js,file);return mod.exports;
}
const files = [
 'lib/updates/release-registry.ts','lib/updates/client.ts','lib/updates/notifications.ts',
 'components/updates/VaultUpdateCenter.tsx','components/updates/VaultUpdateReconciler.tsx',
 'app/mais/page.tsx','components/Providers.tsx',
];
for(const file of files){const s=read(file);const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);ok(ast.parseDiagnostics.length===0,'sintaxe '+file);}
const v=loadTS('lib/updates/release-registry.ts');
const release = {
 tag_name:'vault-android-b81',draft:false,prerelease:false,
 html_url:'https://github.com/alefe-redes-computadores/vault-app/releases/tag/vault-android-b81',
 target_commitish:'a'.repeat(40),published_at:'2026-11-07T22:00:00Z',
 body:'VAULT_VERSION=1.2.0\nVAULT_BUILD=81\nVAULT_COMMIT='+ 'a'.repeat(40) +'\nVAULT_APK_SHA256='+ 'b'.repeat(64)+'\n\n## Novidades\n- Interface de atualização certificada',
 assets:[{name:'Vault-App.apk',size:8_000_000,digest:'sha256:'+ 'b'.repeat(64),browser_download_url:'https://github.com/alefe-redes-computadores/vault-app/releases/download/vault-android-b81/Vault-App.apk'}],
};
const original = JSON.stringify(release);
const parsed=v.parseVaultApprovedRelease(release);
ok(parsed && parsed.build===81 && parsed.version==='1.2.0' && parsed.highlights.length===1,'release válida possui asset e metadados rastreáveis');
ok(v.parseVaultApprovedRelease({...release,draft:true})===null,'rascunho nunca é atualização disponível');
ok(v.parseVaultApprovedRelease({...release,prerelease:true})===null,'pré-release nunca é considerada pronta');
ok(v.parseVaultApprovedRelease({...release,assets:[]})===null,'release sem APK bloqueada');
ok(v.parseVaultApprovedRelease({...release,assets:[{...release.assets[0],browser_download_url:'https://other.example/evil.apk'}]})===null,'URL de outro domínio bloqueada');
ok(v.parseVaultApprovedRelease({...release,body:release.body.replace('VAULT_BUILD=81','VAULT_BUILD=82')})===null,'build divergente bloqueado');
ok(v.parseVaultApprovedRelease({...release,assets:[{...release.assets[0],digest:'sha256:'+ 'c'.repeat(64)}]})===null,'hash divergente bloqueado');
ok(v.parseVaultApprovedRelease({...release,target_commitish:'main'})===null,'commit da release exige SHA estável');
ok(JSON.stringify(release)===original,'validação não modifica evidência original');
const rawRun={workflow_runs:[{id:400,run_number:82,status:'completed',conclusion:'failure',head_sha:'b'.repeat(40),html_url:'https://github.com/alefe-redes-computadores/vault-app/actions/runs/400'}]};
const run=v.parseVaultWorkflowRun(rawRun);
ok(run && run.number===82 && run.conclusion==='failure','Action com falha distinguida da última release');
ok(v.getVaultUpdateDecision(80,parsed,run)==='available','APK certificado mais novo pode ser oferecido');
ok(v.getVaultUpdateDecision(81,parsed,run)==='current','build instalado igual não é atualização');
ok(v.getVaultUpdateDecision(null,parsed,run)==='unknown_installed','build desconhecido não força APK');
ok(v.getVaultLatestRunWarning(parsed,run)==='failed','falha mais recente aparece sem invalidar release anterior');
ok(v.getVaultUpdateDecision(80,null,run)==='failed','sem release válida: falha não oferece APK');
ok(v.getVaultUpdateDecision(80,null,{...run,status:'in_progress',conclusion:null})==='preparing','build em andamento não é download');
const workflow=read('.github/workflows/build-android.yml');
ok(workflow.includes('permissions:\n  contents: write') && workflow.includes('gh release create'), 'workflow publica release usando token restrito ao GitHub');
ok(workflow.indexOf('ASSINATURA E VERSIONCODE DO VAULT VALIDADOS.') < workflow.indexOf('upload-artifact@v4') && workflow.indexOf('upload-artifact@v4') < workflow.indexOf('gh release create'), 'release só ocorre após certificado, build e artefato');
ok(workflow.includes('VAULT_APK_SHA256=') && workflow.includes('VAULT_VERSION='),'release informa SHA256 e versão');
ok(workflow.includes('VAULT_APP_VERSION') && workflow.includes('versionName'), 'versão Android nativa sincronizada ao package');
ok(workflow.includes('retention-days: 7') && workflow.includes('Vault-App-debug'), 'artefato legado de sete dias preservado');
const more=read('app/mais/page.tsx'),providers=read('components/Providers.tsx');
ok(more.includes('<VaultUpdateCenter />') && more.includes('APP_VERSION'), 'central integrada em Mais');
ok(providers.includes('<VaultUpdateReconciler />') && providers.includes('vault_update_available'), 'checar foreground e abrir Mais pela notificação');
const client=read('lib/updates/client.ts'),notice=read('lib/updates/notifications.ts'),ui=read('components/updates/VaultUpdateCenter.tsx');
ok(client.includes('App.getInfo()') && client.includes('isVaultAndroid()') && client.includes('SIX_HOURS'), 'versão instalada real e cache de seis horas');
ok(client.includes('release:null') && client.includes('VAULT-UPD-NETWORK'), 'erro de consulta falha fechado');
ok(notice.includes('OPT_IN') && notice.includes('LAST_BUILD') && notice.includes('LocalNotifications.checkPermissions'), 'opt-in e deduplicação da notificação');
ok(ui.includes('aria-pressed={notifyEnabled}') && ui.includes('Procurar atualizações') && ui.includes('Copiar diagnóstico'), 'controle acessível e diagnóstico copiável');
ok(ui.includes('O PWA recebe atualizações pelo navegador'), 'interface PWA tem semântica distinta');
ok(![...files.map(read),workflow].some(s=>s.includes('VAULT_GITHUB_TOKEN') || s.includes('ghp_')), 'nenhum token de GitHub enviado ao aplicativo');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
ok(pkg.version===lock.version && pkg.version===lock.packages[''].version && read('lib/app-version.ts').includes(`"${pkg.version}"`),'versão canônica consistente, sem quebrar contratos legados');
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m87-m89-update-center.cjs"'),'gate global inclui testes M87–M89');
console.log(`VAULT M87–M89: ${checks} contratos aprovados`);
