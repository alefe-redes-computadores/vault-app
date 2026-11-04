#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let checks = 0;
function ok(value, label) { assert.ok(value, 'M52: '+label); checks++; console.log('✓ M52 '+label); }
const read = p => fs.readFileSync(p,'utf8');
const compile = (p,jsx=ts.JsxEmit.None) => {
  const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(parsed.parseDiagnostics.length===0,'syntax '+p);
  return ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx}}).outputText;
};
function load(p,stubs={}){
  const mod=new Module(path.resolve(p),module);
  mod.require=id=>{
    if(Object.prototype.hasOwnProperty.call(stubs,id))return stubs[id];
    throw Error('M52 unexpected module '+id+' in '+p);
  };
  mod._compile(compile(p),path.resolve(p));
  return mod.exports;
}
(async()=>{
  const coord=load('lib/sync/coordinator.ts');
  let count=0;
  await coord.runVaultPullSingleFlight('owner-1',async()=>{count++;},true);
  await coord.runVaultPullSingleFlight('owner-1',async()=>{count++;});
  ok(count===1,'completed nonurgent pull respects cooldown');
  await coord.runVaultPullSingleFlight('owner-1',async()=>{count++;},true);
  ok(count===2,'urgent pull bypasses completed cooldown');
  // An explicit urgent call during a long background pull must not be swallowed.
  let release;
  const gate=new Promise(resolve=>release=resolve);
  const order=[];
  const background=coord.runVaultPullSingleFlight('owner-2',async()=>{order.push('background start');await gate;order.push('background end');});
  const queuedManual=coord.runVaultPullSingleFlight('owner-2',async()=>{order.push('urgent');},true);
  const duplicate=coord.runVaultPullSingleFlight('owner-2',async()=>{order.push('unexpected');},true);
  ok(queuedManual===duplicate,'two urgent requests while background active coalesce into one follow-up');
  const ordinary=coord.runVaultPullSingleFlight('owner-2',async()=>{order.push('unexpected normal');});
  release(); await Promise.all([background,queuedManual,ordinary]);
  ok(order.join(',')==='background start,background end,urgent','follow-up urgent executes after background and never overlaps');
  await coord.runVaultPullSingleFlight('owner-2',async()=>{order.push('second explicit');},true);
  ok(order.at(-1)==='second explicit','later explicit request remains possible');
  let releaseFail;
  const failedGate=new Promise(resolve=>releaseFail=resolve);
  let recovered=0;
  const failed=coord.runVaultPullSingleFlight('owner-3',async()=>{await failedGate;throw Error('wifi');});
  const retry=coord.runVaultPullSingleFlight('owner-3',async()=>{recovered++;},true);
  releaseFail();await assert.rejects(failed,/wifi/);await retry;
  ok(recovered===1,'urgent follow-up survives earlier failed background pull');
  let releaseA;
  const gateA=new Promise(resolve=>releaseA=resolve);
  let accountB=0;
  const ownerA=coord.runVaultPullSingleFlight('account-A',async()=>await gateA,true);
  await coord.runVaultPullSingleFlight('account-B',async()=>{accountB++;},true);
  ok(accountB===1,'independent accounts never share active pull promise');
  releaseA();await ownerA;

  const store=new Map(),events=[];
  const oldWin=global.window,oldStorage=global.localStorage,oldEvent=global.CustomEvent;
  global.window={dispatchEvent(evt){events.push(evt.type)}};
  global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  global.CustomEvent=class CustomEvent{constructor(type){this.type=type}};
  try {
    const diag=load('lib/sync/diagnostics.ts');
    diag.beginPullDiagnostics();
    for(let i=0;i<40;i++)diag.recordPullTable('table'+i,i*12,i!==23&&i!==27);
    const immediate=diag.getPullDiagnostics();
    ok(immediate.tables.length===40,'table metrics remain durably readable before events flush');
    ok(immediate.tables[23].ok===false&&immediate.tables[27].ok===false,'failed tables keep exact evidence');
    ok(diag.getPullFailureCount(immediate)===2,'partial read failure counted exactly');
    ok(diag.getPullFailureMessage(immediate)==='2 tabela(s) tiveram falha na leitura da nuvem.','partial pull cannot be labeled fully synchronized');
    ok(events.length===0,'diagnostic update does not dispatch 41 synchronous UI refreshes');
    await Promise.resolve();
    ok(events.length===1,'41 table/boot changes coalesced into one UI notification');
    diag.finishPullDiagnostics();
    ok(diag.getPullDiagnostics().finishedAt!==null,'finish timestamp persisted');
    await Promise.resolve();
    ok(events.length===2,'finish notifies observer after durable completion');
    diag.beginPullDiagnostics();diag.recordPullTable('dose_logs',24,true);diag.finishPullDiagnostics();
    ok(diag.getPullFailureMessage()===null,'healthy next run clears old partial failures');
    diag.clearPullDiagnostics();
    ok(diag.getPullDiagnostics().tables.length===0,'clear removes only diagnostic metadata');
    ok(!read('lib/sync/diagnostics.ts').includes('payload:'),'diagnostics never store clinical payload');
  } finally {
    if(oldWin===undefined)delete global.window;else global.window=oldWin;
    if(oldStorage===undefined)delete global.localStorage;else global.localStorage=oldStorage;
    if(oldEvent===undefined)delete global.CustomEvent;else global.CustomEvent=oldEvent;
  }

  // Shared Dexie store: errors must be distinguishable from an actually empty queue.
  let observer=null,subscribers=0,unsubscribed=0,changes=0;
  const unsubs=[];
  const queue=load('hooks/useSyncQueueSummary.ts',{
    dexie:{liveQuery(fn){ok(typeof fn==='function','Dexie source is a shared projection');return {subscribe(handlers){observer=handlers;subscribers++;return {unsubscribe(){unsubscribed++}}}}}},
    react:{useSyncExternalStore(subscribe,getSnapshot){unsubs.push(subscribe(()=>changes++));return getSnapshot()}},
    '@/lib/db':{db:{syncQueue:{toArray:async()=>[]}}},
  });
  queue.useSyncQueueSummary();queue.useSyncQueueSummary();
  ok(subscribers===1,'two consumers share one Dexie subscription');
  observer.next({pending:3,failed:1,total:4});
  ok(changes===2,'new counts notify both consumers once');
  observer.next({pending:3,failed:1,total:4});
  ok(changes===2,'unchanged queue counts do not rerender');
  const originalWarn=console.warn;
  try { console.warn=()=>{}; observer.error(new Error('IndexedDB temporarily unavailable')); }
  finally { console.warn=originalWarn; }
  ok(changes===4,'queue read error becomes visible to consumers');
  const afterError=queue.useSyncQueueSummary();
  ok(afterError.unavailable===true&&afterError.pending===3,'queue failure never becomes false empty state');
  observer.next({pending:0,failed:0,total:0});
  const afterRecovery=queue.useSyncQueueSummary();
  ok(afterRecovery.unavailable===false&&afterRecovery.total===0,'successful Dexie emission recovers truthful empty status');
  unsubs.splice(0).forEach(fn=>fn());
  ok(unsubscribed===1,'last observer releases shared Dexie subscription');

  // Same runtime truth for the manual and boot paths, with stock/dose authority untouched.
  const transitions=[];
  const manual=load('lib/sync/manual-sync.ts',{'./runtime-status':{setVaultSyncRuntime:s=>transitions.push(s)}});
  let pushes=0;
  const partial=await manual.runManualVaultSync({pull:async()=>{},push:async()=>{pushes++;return {remaining:0,permanentlyFailed:0}},pullIssue:()=> '2 tabela(s) tiveram falha na leitura da nuvem.'});
  ok(partial.phase==='error'&&pushes===1,'manual sync preserves queue processing but reports partial pull failure');
  ok(transitions.map(x=>x.phase).join(',')==='pulling,pushing,error','manual sync never ends in success after partial pull');
  const healthy=await manual.runManualVaultSync({pull:async()=>{},push:async()=>({remaining:0,permanentlyFailed:0}),pullIssue:()=>null});
  ok(healthy.phase==='synced','successful pull and empty upload queue remain success');
  const offline=await manual.runManualVaultSync({pull:async()=>{},push:async()=>({remaining:1,permanentlyFailed:0,offline:true})});
  ok(offline.phase==='idle','offline queue stays pending and is not declared synchronized');

  const provider=read('components/Providers.tsx');
  const diagnostics=read('app/diagnostico/page.tsx');
  const recovery=read('app/recuperacao/page.tsx');
  const status=read('components/SyncStatusIndicator.tsx');
  const alert=read('components/GlobalSyncIssueAlert.tsx');
  const hook=read('hooks/useSyncQueueSummary.ts');
  ok(provider.includes('const partialPullIssue = getPullFailureMessage();')&&provider.includes('setIsPullDone('),'boot detects partial cloud tables while preserving push attempt');
  ok(provider.indexOf('if (result.fatalError || result.permanentlyFailed > 0)')<provider.indexOf('const partialPullIssue = getPullFailureMessage();',provider.indexOf('if (result.fatalError || result.permanentlyFailed > 0)')),'terminal queue errors remain highest priority');
  ok(provider.includes('setVaultSyncRuntime({ phase: "error", error: partialPullIssue })'),'boot cannot show complete sync with partial cloud failure');
  ok(provider.includes('setVaultSyncRuntime({ phase: "synced", error: null });'),'truly healthy boot still shows synced');
  ok(diagnostics.includes('pullIssue: () => getPullFailureMessage()'),'diagnosis checks actual cloud table failures');
  ok(diagnostics.includes('syncRuntime.phase === "background"')&&diagnostics.includes('if (!user?.id || !isOnline || syncBusy) return;'),'diagnosis never races a slow background pull');
  ok(recovery.includes('getPullFailureMessage()')&&recovery.includes('failedPullTables'),'recovery uses same clinical-neutral failure classification');
  ok(recovery.includes('disabled={!isOnline || syncBusy || !user}'),'recovery disables manual action during in-flight sync');
  ok(hook.includes('db.syncQueue.toArray()')&&hook.includes('rows.length - failed'),'queue projection never drops pending/failed semantics');
  ok(status.includes('queueUnavailable')&&status.indexOf('if (syncRuntime.phase === "error")')<status.indexOf('pendingCount >'),'visible indicator prioritizes terminal errors over waiting queue');
  ok(alert.includes('queueUnavailable')&&alert.includes('router.push("/diagnostico")'),'queue unavailable is actionable through canonical diagnostic route');
  ok(!/db\.\w+\.(?:delete|clear|bulkPut|bulkDelete)\(/.test([status,alert,hook].join('\n')),'status UI performs no clinical database mutations');
  ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m52-sync-resilience.cjs'),'M52 registered in canonical global gate');
  for(const p of ['app/diagnostico/page.tsx','app/recuperacao/page.tsx','components/Providers.tsx','components/SyncStatusIndicator.tsx','components/GlobalSyncIssueAlert.tsx'])compile(p,ts.JsxEmit.ReactJSX);
  console.log(`VAULT M52: ${checks} safety/performance contracts passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
