#!/usr/bin/env node
'use strict';
/** Update 360 hermetic contract. Requires real TypeScript in project; no network. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const Module=require('node:module');
const path=require('node:path');
const ts=require('typescript');
let count=0;
const ok=(condition,name)=>{assert.ok(condition,name);count++;console.log(`V34 OK ${count}: ${name}`)};
const read=name=>fs.readFileSync(name,'utf8');
function loadTS(name){
 const javascript=ts.transpileModule(read(name),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const m=new Module(path.resolve(name),module);m.filename=path.resolve(name);m.paths=module.paths;m._compile(javascript,m.filename);return m.exports;
}
for(const p of ['lib/updates/client.ts','lib/updates/release-registry.ts','components/updates/VaultUpdateCenter.tsx','components/updates/VaultNativeUpdateFlow.tsx']){
 const syntax=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(syntax.parseDiagnostics.length===0,'TS/TSX válido: '+p);
}
const reg=loadTS('lib/updates/release-registry.ts');
const release={build:2195,commit:'a'.repeat(40)};
const makeRun=(num,status,conclusion,created_at='2026-11-22T14:00:00Z')=>({id:num+10,run_number:num,status,conclusion,created_at,head_sha:'b'.repeat(40),html_url:`https://github.com/alefe-redes-computadores/vault-app/actions/runs/${num+10}`});
let run=reg.parseVaultWorkflowRun({workflow_runs:[makeRun(2201,'completed','success')]});
ok(run?.number===2201&&run.createdAt==='2026-11-22T14:00:00Z','sucesso com horário próprio');
ok(reg.getVaultUpdateDecision(2189,release,run)==='available','download não aponta para run mais recente');
ok(reg.getVaultLatestRunWarning(release,run)===null,'sucesso do run não vira falha artificial');
run=reg.parseVaultWorkflowRun({workflow_runs:[makeRun(2202,'completed','success'),makeRun(2201,'in_progress',null)]});
ok(run?.number===2201&&run.status==='in_progress','execução ativa detectada no conjunto');
run=reg.parseVaultWorkflowRun({workflow_runs:[makeRun(2201,'completed','failure')]});
ok(reg.getVaultLatestRunWarning(release,run)==='failed','falha nova não invalidou release certificada');
ok(reg.getVaultUpdateDecision(2195,release,run)==='current','build instalado igual não é atualização');
ok(reg.getVaultUpdateDecision(null,release,run)==='unknown_installed','sem build instalado não permite atualização cega');
ok(reg.parseVaultWorkflowRun({workflow_runs:[{...makeRun(2203,'completed','success'),html_url:'https://evil.invalid'}]})===null,'Actions URL externa não aceita');
ok(reg.parseVaultWorkflowRun({workflow_runs:[{...makeRun(2203,'completed','success'),created_at:'garbage'}]}).createdAt===null,'timestamp inválido não é mostrado como data');
const ui=read('components/updates/VaultUpdateCenter.tsx');
for(const word of ['Instalado neste aparelho','O que mudou nesta atualização','Compilação em andamento','Release certificada','Expira em','Copiar SHA-256','Ver release','Baixar manualmente','Procurar atualizações','VaultNativeUpdateFlow','VaultUpdateHistory','checkedLabel','releaseRunGap','aria-pressed={notifyEnabled}']) ok(ui.includes(word),'central preserva '+word);
ok(ui.indexOf('O que mudou nesta atualização')<ui.indexOf('Cópia temporária para testes'),'novidades antes de informações efêmeras');
ok(ui.indexOf('VaultNativeUpdateFlow release=')<ui.indexOf('Cópia temporária para testes'),'download nativo antecede artefato teste');
const native=read('components/updates/VaultNativeUpdateFlow.tsx');
ok(native.includes('downloadVerified')&&native.includes('installVerified')&&native.includes('cancelDownload'),'ponte segura nativa não removida');
const client=read('lib/updates/client.ts');
ok(client.includes('SIX_HOURS')&&client.includes('parseVaultTemporaryArtifact')&&client.includes('release:null'),'fonte instalada/cache/erro fechado');
const workflow=read('.github/workflows/build-android.yml');
const promotion=read('.github/workflows/promote-android-run.yml');
ok(promotion.includes('VAULT_ALLOW_STRICT_ANDROID_RELEASE') && promotion.includes('environment: vault-android-release') && workflow.includes('npm run test:release'),'gate estrito e autorização de publicação preservados');
const publisher=read('scripts/vault-publish-verified-action.sh');
ok(!workflow.includes('gh release create') && publisher.includes('generate-vault-release-notes-v34.cjs') && publisher.includes('gh release create'),'changelog só na promoção protegida da release');
ok(workflow.indexOf('node scripts/test-vault-update360-v34.cjs')>workflow.indexOf('npm run test:release') && workflow.indexOf('node scripts/test-vault-update360-v34.cjs')<workflow.indexOf('ci-build-export-resilient.cjs'),'CI valida contratos V34 antes do build');
const {summarize}=require('./generate-vault-release-notes-v34.cjs');
const notes=summarize(['feat(vault): A8 Vacinas 360','fix(vault): busca em Medicamentos','fix(vault): busca em Medicamentos','test(vault): gate V63']);
ok(notes.length===3&&notes[0].includes('A8')&&notes[1].startsWith('Correção: '),'novidades do commit normalizadas e deduplicadas');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
ok(pkg.version===lock.version && pkg.version===lock.packages[''].version,'manifestos de versão idênticos');
ok(read('lib/app-version.ts').includes(`"${pkg.version}"`),'APP_VERSION igual ao package');
ok(read('README.md').includes('### Update 360 — origem das versões'),'README documenta fontes e semântica');
console.log(`VAULT UPDATE360 V34: ${count}/${count} contratos direcionados APROVADOS; sem rede, sem APK, sem mutação clínica.`);
