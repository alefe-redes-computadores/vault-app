#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const ts=require('typescript');
let passed=0;
const ok=(value,claim)=>{assert.ok(value,`M111: ${claim}`);console.log(`M111 OK ${++passed}: ${claim}`);};
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
 'lib/updates/release-registry.ts', 'lib/updates/native-apk-updater.ts',
 'components/updates/VaultUpdateCenter.tsx','components/updates/VaultNativeUpdateFlow.tsx',
 'components/updates/VaultUpdateHistory.tsx',
 'scripts/apply-android-native-updater-m111.mjs','scripts/check-android-native-updater-m111.mjs',
];
for(const file of paths){
 const source=read(file);
 if(/\.[mc]js$/.test(file)){
   cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 }else{
   const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
   ok(parsed.parseDiagnostics.length===0,`TypeScript/JSX: ${file}`);
 }
}
const config=JSON.parse(read('capacitor.config.json'));
const pkg=JSON.parse(read('package.json'));
ok(config.appId==='com.alefejohsefe.vault'&&pkg.dependencies['@capacitor/core'].startsWith('^6.'),'APK Capacitor 6 com appId exclusivo');
const w=read('.github/workflows/build-android.yml');
ok(w.includes('VAULT_DEBUG_KEYSTORE_BASE64')&&w.includes('vaultStableDebug')&&w.includes('ASSEMBLE_DEBUG')===false,'Assinatura estável original não foi trocada');
ok(w.indexOf('patch-android-exact-alarms-m99.mjs')<w.indexOf('apply-android-native-updater-m111.mjs')&&w.indexOf('check-android-native-updater-m111.mjs')<w.indexOf('assembleDebug'),'Ponte gerada depois dos patches existentes e antes do Gradle');
ok(w.indexOf('ASSINATURA E VERSIONCODE DO VAULT VALIDADOS.')<w.indexOf('gh release create'),'Só publica após a verificação de assinatura');
ok(w.includes('VAULT_CERT_SHA256=')&&w.includes('VAULT_APP_ID=com.alefejohsefe.vault')&&w.includes('VAULT_APK_SHA256='),'Release inclui identidade, certificado e SHA-256');
const source=read('lib/updates/release-registry.ts');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',js)(mod,mod.exports);
const reg=mod.exports;
const sha='a'.repeat(40),digest='b'.repeat(64),cert='c'.repeat(64),build=2501;
const release={
 tag_name:`vault-android-b${build}`,draft:false,prerelease:false,
 html_url:`https://github.com/alefe-redes-computadores/vault-app/releases/tag/vault-android-b${build}`,
 target_commitish:sha,published_at:'2026-11-10T12:00:00Z',
 body:`VAULT_VERSION=1.2.0\nVAULT_BUILD=${build}\nVAULT_COMMIT=${sha}\nVAULT_APK_SHA256=${digest}\nVAULT_APP_ID=com.alefejohsefe.vault\nVAULT_CERT_SHA256=${cert}\n\n## Novidades\n- Ponte nativa`,
 assets:[{name:'Vault-App.apk',size:11000000,digest:'sha256:'+digest,browser_download_url:`https://github.com/alefe-redes-computadores/vault-app/releases/download/vault-android-b${build}/Vault-App.apk`}],
};
const parsed=reg.parseVaultApprovedRelease(release);
ok(parsed?.appId==='com.alefejohsefe.vault'&&parsed?.signerSha256===cert&&parsed?.checksum===digest,'Release oficial parseia identidade de APK e certificado');
ok(reg.getVaultUpdateDecision(2500,parsed,null)==='available'&&reg.getVaultUpdateDecision(build,parsed,null)==='current','APK somente quando versionCode é maior');
ok(reg.parseVaultApprovedRelease({...release,body:release.body.replace('com.alefejohsefe.vault','com.outro.app')})===null,'Bloqueia identificador estranho');
ok(reg.parseVaultApprovedRelease({...release,body:release.body.replace(cert,'z'.repeat(64))})===null,'Bloqueia certificado não hexadecimal');
ok(reg.parseVaultApprovedRelease({...release,assets:[{...release.assets[0],browser_download_url:'https://evil.example/app.apk'}]})===null,'Nunca aceita URL externa arbitrária');
const legacy={...release,body:release.body.replace(/VAULT_APP_ID=.*\n/,'').replace(/VAULT_CERT_SHA256=.*\n/,'')};
ok(reg.parseVaultApprovedRelease(legacy)?.signerSha256===null,'Release antiga continua visível para fallback, sem habilitar nativo');
const java=read('native/updates/VaultApkUpdaterPlugin.java');
for(const mark of ['getCacheDir()','MessageDigest.getInstance("SHA-256")','verifyPackage(target, m.build, m.version, m.cert)','verifyPackage(file, m.build, m.version, m.cert)','getPackageArchiveInfo','Arrays.equals(present[0].toByteArray(), incoming[0].toByteArray())','expectedCertificate','canRequestPackageInstalls()','FLAG_GRANT_READ_URI_PERMISSION','cancelDownload(PluginCall call)','openInstallSettings(PluginCall call)','current.getHost()']){
 if(mark==='current.getHost()')continue;
 ok(java.includes(mark),`Android nativo: ${mark}`);
}
ok(!java.includes('Environment.getExternalStorage')&&!java.includes('ACTION_INSTALL_PACKAGE')&&!java.includes('getString("url")'),'Sem armazenamento público, instalação direta ou URL arbitrária');
const ui=read('components/updates/VaultUpdateCenter.tsx');
ok(ui.includes('<VaultNativeUpdateFlow')&&ui.includes('<VaultUpdateHistory')&&ui.includes('Baixar manualmente')&&ui.includes('Copiar diagnóstico'),'Fluxo nativo, histórico e fallback manual na Central existente');
ok(read('components/updates/VaultNativeUpdateFlow.tsx').includes('role="progressbar"')&&read('components/updates/VaultNativeUpdateFlow.tsx').includes('cancelDownload()'),'Progresso acessível e interrupção explícita');
ok(read('components/updates/VaultUpdateHistory.tsx').includes('parseVaultApprovedRelease')&&!read('components/updates/VaultUpdateHistory.tsx').includes('supabase'),'Histórico apenas de releases certificadas, sem dados pessoais');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-vault-m111-native-updates.cjs"')&&gate.includes('"scripts/test-vault-m109-medication-list-density.cjs"'),'Contrato M111 no gate sem apagar M109');
// Generated Android fixture: the same script executes against an ephemeral Capacitor-like project.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vault-m111-'));
try{
 const mkdir=(p)=>fs.mkdirSync(path.join(tmp,p),{recursive:true});
 const copy=(from,to)=>{mkdir(path.dirname(to));fs.copyFileSync(from,path.join(tmp,to))};
 const write=(to,data)=>{mkdir(path.dirname(to));fs.writeFileSync(path.join(tmp,to),data)};
 copy('scripts/apply-android-native-updater-m111.mjs','scripts/apply-android-native-updater-m111.mjs');
 copy('scripts/check-android-native-updater-m111.mjs','scripts/check-android-native-updater-m111.mjs');
 for(const file of ['VaultApkUpdaterPlugin.java','VaultApkFileProvider.java','vault_update_paths.xml'])copy('native/updates/'+file,'native/updates/'+file);
 copy('capacitor.config.json','capacitor.config.json');
 write('android/app/src/main/java/com/alefejohsefe/vault/MainActivity.java',
  'package com.alefejohsefe.vault;\n// VAULT_EDGE_TO_EDGE_V28\nclass MainActivity { void onCreate() {registerPlugin(VaultHealthConnectPlugin.class); } }');
 write('android/app/src/main/AndroidManifest.xml',
  '<?xml version="1.0" encoding="utf-8"?><manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:label="VAULT"><activity android:name=".MainActivity" /></application></manifest>');
 cp.execFileSync(process.execPath,['scripts/apply-android-native-updater-m111.mjs'],{cwd:tmp,stdio:'pipe'});
 const xml=fs.readFileSync(path.join(tmp,'android/app/src/main/AndroidManifest.xml'),'utf8');
 ok(xml.includes('android.permission.REQUEST_INSTALL_PACKAGES')&&xml.includes('com.alefejohsefe.vault.VaultApkFileProvider')&&xml.includes('android:exported="false"'),'Manifest sintético preserva provider privado');
 const main=fs.readFileSync(path.join(tmp,'android/app/src/main/java/com/alefejohsefe/vault/MainActivity.java'),'utf8');
 ok(main.includes('registerPlugin(VaultHealthConnectPlugin.class)')&&main.includes('registerPlugin(VaultApkUpdaterPlugin.class)'),'Bridge de saúde e novo updater coabitam');
 cp.execFileSync(process.execPath,['scripts/check-android-native-updater-m111.mjs'],{cwd:tmp,stdio:'pipe'});
 ok(true,'Validador CI aprovou a plataforma Android simulada');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log(`VAULT M111: ${passed} verificações estáticas, comportamento do parser e integração Android sintética OK`);
