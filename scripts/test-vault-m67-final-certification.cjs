#!/usr/bin/env node
'use strict';
/** M67: audit/behavior contracts. No remote calls, no clinical writes. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const Module=require('node:module');
const ts=require('typescript');
let checks=0;
function ok(condition,label){assert.ok(condition,`M67: ${label}`);checks++;}
const read=rel=>fs.readFileSync(rel,'utf8');
function load(rel,stubs={}){
  const filename=path.resolve(rel),code=read(rel);
  const output=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},reportDiagnostics:true});
  assert.equal(output.diagnostics?.length??0,0,`M67: TS transpile ${rel}`);
  const instance=new Module(filename,module);
  instance.require=id=>Object.prototype.hasOwnProperty.call(stubs,id)?stubs[id]:require(id);
  instance._compile(output.outputText,filename);
  return instance.exports;
}
(async()=>{
  const keyPaths=[
    'app/page.tsx','app/hoje/page.tsx','app/saude/medicamentos/page.tsx',
    'app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx',
    'app/saude/fornecimento/page.tsx','app/saude/documentos/page.tsx',
    'app/saude/minha-saude/page.tsx','app/inteligencia/page.tsx','app/ajuda/page.tsx',
    'app/diagnostico/page.tsx','app/recuperacao/page.tsx',
    'components/saude/HealthAvatar.tsx','components/DoseNotificationReconciler.tsx',
    'lib/sync/queue-health.ts','lib/sync/coordinator.ts','lib/sync/recent-dose-merge.ts',
    'lib/sync/recent-dose-status.ts','lib/dose-notification-pipeline.ts',
    'lib/health-intelligence/care-journey-360.ts','lib/notification-dose-navigation.ts',
    'components/SyncStatusIndicator.tsx'
  ];
  for(const rel of keyPaths){
    ok(fs.existsSync(rel),`arquivo essencial ${rel}`);
    const ast=ts.createSourceFile(rel,read(rel),ts.ScriptTarget.Latest,true,rel.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    ok(ast.parseDiagnostics.length===0,`parse TS/TSX ${rel}`);
  }
  const pkg=JSON.parse(read('package.json'));
  ok(String(pkg.scripts?.['test:release']||'').includes('test-v63-release-gate.mjs'),'release canônico registrado');
  ok(String(pkg.scripts?.['test:release']||'').includes('tsc --noEmit'),'release inclui TypeScript integral');
  const gate=read('scripts/test-v63-release-gate.mjs');
  const expected=[
    'test-vault-m67-final-certification.cjs','test-vault-m66-sync-reliability.cjs',
    'test-vault-m65-care-360.cjs','test-vault-m64-premium-performance.cjs',
    'test-vault-m63-notifications-search.cjs','test-vault-m62-retro-batch.cjs',
    'test-vault-m61-help.cjs','test-vault-m52-sync-resilience.cjs',
    'test-vault-m25-premium-longlist-hotpath.cjs',
    'test-vault-m24-r3-global-visual-hotpath.cjs','test-home-today-v9-contract.mjs',
    'test-v91-sync-pipeline-performance-contract.mjs',
    'test-v310-sync-offline-continuity.cjs','test-v228-stability.cjs',
    'test-v234-avatar-sync.cjs'
  ];
  for(const name of expected) ok(gate.includes(`"scripts/${name}"`),`gate mantém ${name}`);
  ok(gate.includes('spawnSync(process.execPath')&&gate.includes('if (result.status !== 0) process.exit'),'gate interrompe no primeiro erro');
  ok(gate.includes('test-v70-final-completeness-contract.mjs'),'gate preserva V70 final');
  const workflow=read('.github/workflows/build-android.yml');
  for(const label of ['branches: [main, master]','workflow_dispatch:','npm ci','npm run test:release','node scripts/ci-build-export-resilient.cjs','test -f out/index.html','npx cap sync android','validate-android-bridge-v29.mjs','vault-debug.keystore','APKSIGNER','VAULT_VERSION_CODE','upload-artifact@v4','Vault-App-debug','GITHUB_STEP_SUMMARY']){
    ok(workflow.includes(label),`CI Android: ${label}`);
  }
  ok(workflow.indexOf('npm run test:release')<workflow.indexOf('ci-build-export-resilient.cjs'),'gate antes da exportação');
  ok(workflow.indexOf('ASSINATURA E VERSIONCODE DO VAULT VALIDADOS.')<workflow.indexOf('GITHUB_STEP_SUMMARY'),'resumo só após verificar assinatura/versão');
  ok(workflow.indexOf('GITHUB_STEP_SUMMARY')<workflow.indexOf('upload-artifact@v4'),'resumo anterior ao artefato APK');
  ok(workflow.includes('if-no-files-found: error'),'ausência do APK bloqueia build');
  const queue=load('lib/sync/queue-health.ts');
  const now=Date.parse('2026-11-04T12:00:00Z');
  ok(queue.SYNC_MAX_RETRIES===5 && queue.SYNC_MAX_BACKOFF_MS===60_000,'backoff e tentativas com limite');
  ok(JSON.stringify([1,2,3,4,5].map(queue.getSyncRetryDelayMs))===JSON.stringify([5000,10000,20000,40000,60000]),'backoff exponencial preservado');
  const retry=queue.buildSyncFailureUpdate(2,'rede',now);
  ok(queue.getSyncQueueState(retry,now)==='deferred','backoff não dispara cedo');
  ok(queue.getSyncQueueState(retry,now+10001)==='ready','backoff libera após prazo');
  const terminal=queue.buildSyncFailureUpdate(5,'erro',now);
  ok(queue.getSyncQueueState(terminal,now)==='failed'&&terminal.next_retry_at===null,'falha terminal não entra em loop');
  const summary=queue.summarizeSyncQueue([retry,terminal,{failed:false,retry_count:0,next_retry_at:null}],now);
  ok(summary.ready===1&&summary.deferred===1&&summary.failed===1&&summary.total===3,'fila distingue pronto, espera e falha');
  const coordinator=load('lib/sync/coordinator.ts');
  let visits=0;
  await coordinator.runVaultPullSingleFlight('m67-a',async()=>{visits++;},true);
  await coordinator.runVaultPullSingleFlight('m67-a',async()=>{visits++;});
  ok(visits===1,'pull normal respeita cooldown');
  await coordinator.runVaultPullSingleFlight('m67-a',async()=>{visits++;},true);
  ok(visits===2,'pull urgente não é suprimido');
  let release; const blocked=new Promise(resolve=>release=resolve),order=[];
  const bg=coordinator.runVaultPullSingleFlight('m67-b',async()=>{order.push('begin');await blocked;order.push('end');});
  const urgent=coordinator.runVaultPullSingleFlight('m67-b',async()=>{order.push('urgent');},true);
  release();await Promise.all([bg,urgent]);
  ok(order.join(',')==='begin,end,urgent','pull manual sequenciado após background');
  let other=0;
  await coordinator.runVaultPullSingleFlight('m67-c',async()=>{other++;},true);
  ok(other===1,'conta distinta permanece independente');
  const merge=load('lib/sync/recent-dose-merge.ts');
  const med=(id,extra={})=>({id,user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-11-04',horario:'08:00',quantidade:1,updated_at:'2026-11-04T10:00:00Z',...extra});
  ok(merge.isSameRecentCloudDose({...med('a'),synced:true},med('a')),'dose remota idêntica não precisa reescrever');
  ok(!merge.isSameRecentCloudDose({...med('a'),synced:false},med('a')),'dose pendente nunca é igual para sobrescrita');
  ok(!merge.isSameRecentCloudDose({...med('a'),synced:true},med('a',{quantidade:2})),'mudança de quantidade não é descartada');
  ok(!merge.isSameRecentCloudDose({...med('a'),synced:true},med('a',{person_id:'outro'})),'pessoa distinta não é confundida');
  const status=load('lib/sync/recent-dose-status.ts',{'react':{useSyncExternalStore:(_subscribe,get)=>get()}});
  status.noteRecentDoseRefreshStart('u');
  status.noteRecentDoseRefreshComplete('outra',{consulted:8,imported:8,unchanged:0,protectedLocal:0});
  ok(status.useRecentDoseRefreshStatus().phase==='checking','resultado tardio de outra conta descartado');
  status.noteRecentDoseRefreshComplete('u',{consulted:8,imported:2,unchanged:4,protectedLocal:2});
  ok(status.useRecentDoseRefreshStatus().phase==='complete'&&status.useRecentDoseRefreshStatus().protectedLocal===2,'diagnóstico local fiel');
  status.noteRecentDoseRefreshStart('u2');
  ok(status.useRecentDoseRefreshStatus().imported===0,'troca de conta zera contadores');
  const navigate=load('lib/notification-dose-navigation.ts');
  ok(navigate.resolveDoseNotificationDestination('dose_reminder','08:05')==='/hoje?focus=doses&time=08%3A05','notificação aponta para horário sem confirmar dose');
  ok(navigate.resolveDoseNotificationDestination('dose_overdue_group')==='/?open=pending-doses','atrasos preservam destino explícito');
  ok(navigate.resolveDoseNotificationDestination('dose_reminder','99:99')==='/hoje?focus=doses','horário inválido não injeta query');
  ok(navigate.resolveDoseNotificationDestination('unknown')===null,'tipo desconhecido não inventa ação');
  const {projectCareJourney360}=load('lib/health-intelligence/care-journey-360.ts');
  const snap={medications:{active:4,needsAction:1,temporary:1},access:{withdrawals:{scheduled:2,overdue:1},processes:{active:1},documents:{explicitMissing:1},acquisitions:{planned:3}},archive:{total:6,withAttachments:4,unlinked:1},health:{records30d:8,activeDays30d:4},plan:{items:[{id:'x'}],counts:{now:1}}};
  const before=JSON.stringify(snap);const cards=projectCareJourney360(snap);
  ok(cards.length===7 && new Set(cards.map(x=>x.id)).size===7,'Mapa 360 liga sete áreas distintas');
  ok(cards.find(x=>x.id==='acquisitions').evidence==='planned','aquisição planejada não vira realizada');
  ok(cards.find(x=>x.id==='brain').evidence==='interpretation','recomendação Brain não vira fato');
  ok(cards.find(x=>x.id==='withdrawals').count===2,'retirada agendada não muda desfecho');
  ok(JSON.stringify(snap)===before,'Mapa 360 não altera snapshot');
  const {createDoseNotificationPipeline}=load('lib/dose-notification-pipeline.ts');
  const events=[];const pipeline=createDoseNotificationPipeline(async()=>{events.push('scheduled')},async()=>{events.push('overdue')});
  const input={userId:'u',personId:'p',refreshKey:0,medicamentos:[],logs:[]};
  await pipeline.enqueue(input);
  ok(events.join(',')==='scheduled,overdue','pipeline sequencial agenda e atrasos');
  ok((await pipeline.enqueue({...input})).skipped&&events.length===2,'notificação idêntica não reagendada');
  await pipeline.enqueue({...input,refreshKey:1});
  ok(events.length===4,'nova preferência invalida deduplicação');
  await pipeline.enqueue({...input,logs:[med('a')]});
  ok(events.length===6,'novo registro exige revisão de agenda');
  pipeline.invalidate();await pipeline.enqueue({...input,logs:[med('a')]});
  ok(events.length===8,'invalidação explícita força revisão');
  let awaited;const blocker=new Promise(resolve=>awaited=resolve),old=[];
  const stale=createDoseNotificationPipeline(async x=>{old.push('scheduled '+x.personId);if(x.personId==='p1')await blocker;},async x=>old.push('overdue '+x.personId));
  const first=stale.enqueue({personId:'p1',medicamentos:[],logs:[]});await Promise.resolve();
  const second=stale.enqueue({personId:'p2',medicamentos:[],logs:[]});awaited();await Promise.all([first,second]);
  ok(!old.includes('overdue p1') && old.includes('overdue p2'),'mudança de pessoa impede agendar atrasos antigos');
  const reconciler=read('components/DoseNotificationReconciler.tsx');
  ok((reconciler.match(/useLiveQuery\(/g)||[]).length===1,'uma assinatura Dexie para duas tabelas');
  ok(reconciler.includes('db.transaction("r",[db.medicamentos,db.doseLogs]'),'leitura de medicamentos e doses transacional');
  ok((reconciler.match(/\.where\("\[user_id\+person_id\]"\)\.equals\(owner\)\.toArray\(\)/g)||[]).length===2,'duas leituras isoladas por conta e pessoa');
  ok(reconciler.includes('snapshot.userId!==user.id || snapshot.personId!==activePersonId'),'snapshot de outra pessoa bloqueado');
  const recent=read('lib/sync/recent-dose-refresh.ts');
  for(const token of ['queuedIds.has(remote.id!)','local?.synced === false','localTime > remoteTime','if (response.data === null)','isSameRecentCloudDose(local, remote)'])ok(recent.includes(token),'refresh preserva proteção '+token);
  const avatar=read('components/saude/HealthAvatar.tsx');
  ok(avatar.includes('canMountAvatar3D(')&&avatar.includes('previewVisible')&&avatar.includes('documentVisible'),'Fênix WebGL condicionado a visibilidade');
  ok(avatar.includes('Toque na Fênix para ampliar.')&&avatar.includes('não diagnósticos'),'Fênix informa limite não diagnóstico');
  const meds=read('app/saude/medicamentos/page.tsx');
  ok(meds.includes('regulatoryBorderColor')&&meds.includes('setQuickDoseMedId'),'identidade regulatória e ação de dose rápida mantidas');
  const health=read('app/saude/minha-saude/page.tsx');
  ok(health.includes('id="minha-saude-panorama"')&&health.includes('{() => <PersonalHealthOverview'),'panorama original sob demanda preservado');
  ok(health.includes('id="minha-saude-mapa-cuidado"'),'mapa 360 independente');
  const diagnostics=read('app/diagnostico/page.tsx');
  ok(diagnostics.includes('<SyncDoseRefreshSummary')&&diagnostics.includes('runManualVaultSync'),'diagnóstico integrado à autoridade de sync');
  const recovery=read('app/recuperacao/page.tsx');
  ok(recovery.includes('<SyncDoseRefreshSummary')&&recovery.includes('summarizeSyncQueue'),'recuperação distingue fila e doses');
  const guide=read('app/ajuda/page.tsx');
  ok(guide.includes('searchHelpTopics(query)')&&guide.includes('setSelected(topic)'),'ajuda contextual preservada');
  const v91=read('scripts/test-v91-sync-pipeline-performance-contract.mjs');
  ok(v91.includes('liveQueryCalls === 1')&&v91.includes('ownerScopedReads === 2'),'contrato V91 moderno mantido');
  console.log(`VAULT M67 FINAL: ${checks} verificações estruturais e comportamentais aprovadas.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
