#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {buildSyncFailureUpdate,getSyncQueueState,getSyncRetryDelayMs,summarizeSyncQueue,SYNC_MAX_RETRIES}=load('lib/sync/queue-health.ts');
const now=Date.parse('2026-10-28T12:00:00Z');
assert.deepEqual([1,2,3,4,5].map(getSyncRetryDelayMs),[5000,10000,20000,40000,60000],'backoff is bounded and exponential');
const retry=buildSyncFailureUpdate(2,'rede',now);
assert.equal(retry.failed,false);assert.equal(retry.next_retry_at,'2026-10-28T12:00:10.000Z');
assert.equal(getSyncQueueState(retry,now),'deferred');assert.equal(getSyncQueueState(retry,now+10001),'ready');
const terminal=buildSyncFailureUpdate(SYNC_MAX_RETRIES,'permanente',now);
assert.equal(terminal.failed,true);assert.equal(terminal.next_retry_at,null);assert.equal(getSyncQueueState(terminal,now),'failed');
assert.deepEqual(summarizeSyncQueue([retry,terminal],now),{total:2,ready:0,deferred:1,failed:1});
const pull=fs.readFileSync(path.join(root,'lib/sync/pull.ts'),'utf8');
assert(pull.includes('return pullInFlight')&&pull.includes('pullInFlightUser !== userId'),'same-account callers share the pull; another account cannot cross it');
assert(!pull.includes('Tentativa de execução simultânea bloqueada'),'concurrent pull no longer returns a false success');
const queue=fs.readFileSync(path.join(root,'hooks/useSyncQueue.ts'),'utf8');
assert(queue.includes('buildSyncFailureUpdate(nextRetryCount, errorMessage)'),'failed attempts persist their retry deadline');
const recovery=fs.readFileSync(path.join(root,'app/recuperacao/page.tsx'),'utf8');
assert(recovery.includes('summarizeSyncQueue')&&recovery.includes('em espera')&&recovery.includes('para revisar'),'recovery explains ready, deferred and failed states');
console.log('VAULT V310 — shared pull, persisted backoff, offline queue preservation and explainable recovery OK');
