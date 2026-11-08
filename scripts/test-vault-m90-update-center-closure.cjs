#!/usr/bin/env node
'use strict';
/** VAULT M90 hermetic validation. No network, notifications, clinical or file writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const read = name => fs.readFileSync(name,'utf8');
let checks=0;
const ok=(v,label)=>{assert.ok(v,`M90: ${label}`);console.log(`✓ ${++checks}: ${label}`)};
const sourceFiles = [
 'lib/updates/artifacts.ts','lib/updates/client.ts','lib/updates/notifications.ts',
 'components/updates/VaultUpdateCenter.tsx','components/updates/VaultUpdateReconciler.tsx',
];
function load(file, deps={}) {
 const filename=path.resolve(file);
 const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const mod = new Module(filename,module);
 mod.filename=filename;mod.paths=module.paths;
 mod.require = key => Object.prototype.hasOwnProperty.call(deps,key)?deps[key]:require(key);
 mod._compile(code,filename);
 return mod.exports;
}
(async()=>{
 for (const file of sourceFiles) {
  const syntax=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(syntax.parseDiagnostics.length===0,`TS/TSX íntegro: ${file}`);
 }
 const artifacts=load('lib/updates/artifacts.ts');
 const now=Date.parse('2026-11-08T12:00:00Z');
 const runId=314159;
 const asset={id:1234567,name:'Vault-App-debug',size_in_bytes:12000000,expired:false,
  expires_at:'2026-11-15T12:00:00Z',workflow_run:{id:runId},
  archive_download_url:'https://api.github.com/repos/alefe-redes-computadores/vault-app/actions/artifacts/1234567/zip'};
 const fixture={artifacts:[asset]};
 const before=JSON.stringify(fixture);
 const parsed=artifacts.parseVaultTemporaryArtifact(fixture,runId);
 ok(parsed && parsed.id===1234567 && parsed.runId===runId,'artefato temporário validado no run correto');
 ok(artifacts.getVaultTemporaryArtifactStatus(parsed,now)==='available','prazo real de sete dias não gera alerta adiantado');
 ok(artifacts.getVaultTemporaryArtifactStatus(parsed,now+6*86400000)==='expiring','até 72 horas com data confirmada gera estado de atenção');
 ok(artifacts.getVaultTemporaryArtifactStatus(parsed,now+8*86400000)==='expired','prazo vencido apenas quando há expiração comprovada');
 ok(artifacts.getVaultTemporaryArtifactStatus(null,now)==='unknown','ausência de prova é prazo desconhecido');
 ok(artifacts.getVaultTemporaryArtifactStatus({...parsed,expired:true},now)==='expired','flag de expiração do GitHub tem prioridade');
 ok(artifacts.parseVaultTemporaryArtifact(fixture,runId+1)===null,'artefato de outro run não pode ser reaproveitado');
 ok(artifacts.parseVaultTemporaryArtifact({artifacts:[{...asset,name:'outro'}]},runId)===null,'nome errado bloqueado');
 ok(artifacts.parseVaultTemporaryArtifact({artifacts:[{...asset,archive_download_url:'https://example.com/zip'}]},runId)===null,'host de arquivo externo bloqueado');
 ok(artifacts.parseVaultTemporaryArtifact({artifacts:[{...asset,expires_at:undefined}]},runId)===null,'sem expires_at não inventa validade');
 ok(artifacts.parseVaultTemporaryArtifact({artifacts:[{...asset,expired:undefined}]},runId)===null,'sem estado booleano não inventa disponibilidade');
 ok(artifacts.parseVaultTemporaryArtifact({artifacts:[{...asset,workflow_run:{id:7}}]},runId)===null,'link com run diferente rejeitado');
 ok(JSON.stringify(fixture)===before,'leitura do artefato é pura e não muta origem');
 ok(artifacts.vaultArtifactReminderRelevant(80,81,runId,parsed),'lembrete apenas para APK antigo e release comprovada');
 ok(!artifacts.vaultArtifactReminderRelevant(81,81,runId,parsed),'build atual não recebe lembrete');
 ok(!artifacts.vaultArtifactReminderRelevant(null,81,runId,parsed),'build desconhecido não recebe lembrete');
 ok(!artifacts.vaultArtifactReminderRelevant(80,81,runId+1,parsed),'lembrete não cruza runs');

 const ui=read('components/updates/VaultUpdateCenter.tsx');
 ok(ui.includes('motion.section')&&ui.includes('AnimatePresence')&&ui.includes('useReducedMotion'), 'UI premium Framer Motion e respeito a movimento reduzido');
 ok(ui.includes('Procurar atualizações')&&ui.includes('Copiar diagnóstico')&&ui.includes('Copiar SHA-256')&&ui.includes('Ver release'), 'comandos úteis e diagnóstico conservados');
 ok(ui.includes('aria-pressed={notifyEnabled}')&&ui.includes('role="status"')&&ui.includes('motion-reduce:animate-none'), 'preferências e acessibilidade da Central');
 ok(ui.includes('O PWA recebe atualizações pelo navegador')&&ui.includes('sem expiração automática de 7 dias'), 'PWA e release durável não são confundidos');
 ok(ui.includes('getVaultTemporaryArtifactStatus')&&ui.includes('Nenhum prazo foi presumido.'), 'estado de prazo consulta fonte pura, sem supor prazo visual');
 ok(ui.includes('A instalação do APK requer sua confirmação')&&ui.includes('não está disponível'), 'sem promessas de instalação silenciosa ou push remoto');
 const notice=read('lib/updates/notifications.ts');
 ok(notice.includes('requestPermissions()')&&notice.includes('vaultUpdateNotificationsEnabled'), 'opt-in Android preservado');
 ok(notice.includes('LocalNotifications.cancel')&&notice.includes('LAST_EXPIRY_REMINDER'), 'lembrete anterior é cancelável');
 ok(notice.includes('vaultArtifactReminderRelevant')&&notice.includes('expires - 24 * 60 * 60 * 1000'), 'lembrete somente quando prazo e versão justificam');
 ok(notice.includes('vault_update_available')&&notice.includes('GitHub Releases continua disponível'), 'notificação de prazo não afirma que release expirou');
 const observer=read('components/updates/VaultUpdateReconciler.tsx');
 ok(observer.includes('visibilitychange')&&observer.includes('online')&&observer.includes('reconcileVaultArtifactExpiryReminder'), 'reconciliador reaproveita observação foreground');
 const client=read('lib/updates/client.ts');
 ok(client.includes('App.getInfo()')&&client.includes('SIX_HOURS')&&client.includes('parseVaultTemporaryArtifact'), 'versão nativa, dedupe e consulta de prazo reais');
 ok(client.includes('run.status === "completed" && run.conclusion === "success"')&&client.includes('catch(() => null)'), 'falha opcional da API de artefatos não cancela release certificada');
 ok(client.includes('release:null')&&client.includes('artifact:null'),'erro crítico limpa links antigos');
 const workflow=read('.github/workflows/build-android.yml');
 ok(workflow.includes('retention-days: 7')&&workflow.includes('gh release create')&&workflow.includes('vaultStableDebug'),'release e assinatura originais preservadas');
 ok(read('components/Providers.tsx').includes('vault_update_available'),'notificação continua abrindo Mais');
 ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m90-update-center-closure.cjs"')&&read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m87-m89-update-center.cjs"'),'ambos os contratos no gate global');

 // Simulate the real client with hardcoded GitHub fixtures; never send an HTTP request.
 const approvedRelease={tag_name:'vault-android-b81',draft:false,prerelease:false,
  html_url:'https://github.com/alefe-redes-computadores/vault-app/releases/tag/vault-android-b81',
  target_commitish:'a'.repeat(40),published_at:'2026-11-08T12:00:00Z',
  body:'VAULT_VERSION=1.2.0\nVAULT_BUILD=81\nVAULT_COMMIT='+'a'.repeat(40)+'\nVAULT_APK_SHA256='+'b'.repeat(64)+'\n\n## Novidades\n- Certificação',
  assets:[{name:'Vault-App.apk',size:8_000_000,digest:'sha256:'+'b'.repeat(64),
    browser_download_url:'https://github.com/alefe-redes-computadores/vault-app/releases/download/vault-android-b81/Vault-App.apk'}]};
 const run={workflow_runs:[{id:runId,run_number:81,status:'completed',conclusion:'success',head_sha:'a'.repeat(40),html_url:`https://github.com/alefe-redes-computadores/vault-app/actions/runs/${runId}`}]};
 const registry=load('lib/updates/release-registry.ts');
 let networkMode='valid',requests=[];
 const oldFetch=global.fetch,oldWindow=global.window,oldNavigator=global.navigator;
 try {
  global.window={setTimeout,clearTimeout};
  Object.defineProperty(global,'navigator',{value:{onLine:true},configurable:true,writable:true});
  global.fetch=async url=>{
    requests.push(url);
    if (networkMode==='offline') throw new Error('No network');
    if (url.includes('/releases/latest')) return {ok:true,status:200,json:async()=>approvedRelease};
    if (url.includes('/workflows/build-android.yml/runs')) return {ok:true,status:200,json:async()=>run};
    if (url.includes('/runs/314159/artifacts')) {
      if (networkMode==='artifact-error') return {ok:false,status:403};
      return {ok:true,status:200,json:async()=>fixture};
    }
    throw new Error('Unexpected URL: '+url);
  };
  const client=load('lib/updates/client.ts', {
    '@capacitor/app':{App:{getInfo:async()=>({version:'1.2.0',build:'80'})}},
    '@/lib/native-runtime':{isVaultAndroid:()=>true},
    '@/lib/app-version':{APP_VERSION:'1.2.0'},
    './release-registry':registry,
    './artifacts':artifacts,
  });
  const ready=await client.checkVaultUpdates(true);
  ok(ready.phase==='ready'&&ready.decision==='available'&&ready.artifact?.id===asset.id, 'consulta client integrada: release + run + prazo GitHub');
  ok(requests.length===3 && ready.installedBuild===80,'três consultas na ordem prevista, build real independente');
  networkMode='artifact-error';
  const graceful=await client.checkVaultUpdates(true);
  ok(graceful.phase==='ready'&&graceful.decision==='available'&&graceful.artifact===null&&Boolean(graceful.release), 'endpoint do artefato falhou: download certificado preservado');
  networkMode='offline';
  const failed=await client.checkVaultUpdates(true);
  ok(failed.phase==='error'&&failed.release===null&&failed.artifact===null, 'falha crítica remove links e prazos possivelmente obsoletos');
 } finally {
  global.fetch=oldFetch;
  if (oldWindow===undefined) delete global.window; else global.window=oldWindow;
  if (oldNavigator===undefined) delete global.navigator; else Object.defineProperty(global,'navigator',{value:oldNavigator,configurable:true,writable:true});
 }
 // Notification lifecycle: opt-in, single-flight, expiry and cancellation (all fake Android APIs).
 const priorStorage=Object.getOwnPropertyDescriptor(global,'localStorage');
 const priorWindow=global.window;
 global.window={};
 const storage=new Map();
 const issued=[],cancelled=[];
 const localStub={
   requestPermissions:async()=>({display:'granted'}),
   checkPermissions:async()=>({display:'granted'}),
   schedule:async settings=>{issued.push(settings);return {notifications:[]}},
   cancel:async settings=>{cancelled.push(settings)},
 };
 try {
   Object.defineProperty(global,'localStorage',{configurable:true,value:{
     getItem:key=>storage.has(key)?storage.get(key):null,
     setItem:(key,value)=>{storage.set(key,String(value))},
     removeItem:key=>storage.delete(key),
   }});
   const noticeRuntime=load('lib/updates/notifications.ts',{
     '@capacitor/local-notifications':{LocalNotifications:localStub},
     '@/lib/native-runtime':{isVaultAndroid:()=>true},
     './artifacts':artifacts,
   });
   const expiry={...parsed,expiresAt:new Date(Date.now()+5*86400000).toISOString()};
   const ready={phase:'ready',runtime:'android',decision:'available',installedBuild:80,
     release:{build:81},run:{id:runId,number:81},artifact:expiry};
   ok(await noticeRuntime.setVaultUpdateNotificationsEnabled(true),'Android opt-in autoriza lembretes');
   await Promise.all([noticeRuntime.reconcileVaultArtifactExpiryReminder(ready),noticeRuntime.reconcileVaultArtifactExpiryReminder(ready)]);
   ok(issued.length===1,'observações simultâneas não duplicam aviso de expiração');
   ok(issued[0].notifications[0].extra.type==='vault_update_available','toque no prazo reusa rota Mais sem dados clínicos');
   ok(issued[0].notifications[0].schedule.at.getTime()>Date.now(),'agendamento é futuro, não é enviado sem evidência');
   await noticeRuntime.reconcileVaultArtifactExpiryReminder(ready);
   ok(issued.length===1,'mesma versão não agenda duas vezes');
   await noticeRuntime.reconcileVaultArtifactExpiryReminder({...ready,installedBuild:81});
   ok(cancelled.length===1,'build atualizado cancela lembrete antigo');
   await noticeRuntime.reconcileVaultArtifactExpiryReminder({...ready,artifact:null});
   ok(issued.length===1,'prazo desconhecido não agenda notificação');
   await noticeRuntime.reconcileVaultArtifactExpiryReminder(ready);
   ok(issued.length===2,'novo estado relevante pode agendar após cancelamento');
   await noticeRuntime.setVaultUpdateNotificationsEnabled(false);
   ok(cancelled.length===2,'desativar notificações cancela lembrete Android');
 } finally {
   if (priorWindow===undefined) delete global.window; else global.window=priorWindow;
   if (priorStorage) Object.defineProperty(global,'localStorage',priorStorage);
   else delete global.localStorage;
 }

 console.log(`VAULT M90: ${checks} contratos funcionais/estruturais certificados localmente. Sem rede nem gravação clínica.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
