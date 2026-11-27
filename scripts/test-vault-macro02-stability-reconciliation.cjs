#!/usr/bin/env node
'use strict';
// Extract the exact merged processor branches, not a separately written approximation.
// Transport/database boundaries are doubles. Real CAS and dose adapter suites remain mandatory.
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require(process.env.VAULT_TYPESCRIPT||'typescript');
const source=fs.readFileSync('hooks/useSyncQueue.ts','utf8');
const sf=ts.createSourceFile('hooks/useSyncQueue.ts',source,ts.ScriptTarget.Latest,true);
assert.equal(sf.parseDiagnostics.length,0);
function decl(name){let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(sf)===name){assert(!found);found=n;}ts.forEachChild(n,visit);}visit(sf);assert(found,name);return found.getText(sf);}
const start=source.indexOf('if(isMacro02Atomic(item)&&await pendingAtomicPredecessor(item))');
const end=source.indexOf('if (\n                    finalized',start);assert(start>0&&end>start);
const actual=source.slice(start,end);
const code=`const ${decl('syncItem')};const ${decl('finalizeQueueItem')};return async function(item,result,addLog){for(let once=0;once<1;once++){${actual}return finalized;}return 'deferred';}`;
const js=ts.transpileModule(`function make(ctx:any){const {db,isMacro02Atomic,isMacro02Metadata,sendMacro02Atomic,sendMacro02AtomicR5,authenticatedUser,pendingAtomicPredecessor,finalizeMacro02Atomic,finalizeMacro02AtomicR5,vitalTable,finalizeTreatmentVisualIntentR03,syncTreatmentVisualIntentR03,requireSupabase,SyncDependencyDeferredError,syncDoseLog,markLocalAsSynced}=ctx;${code}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const make=new Function(js+'\nreturn make;')();
let calls=[],mode='ack',parent=null,predecessor=false,queued=new Map(),ack={version:1,operationId:'exact-dose-receipt'},stockAck={version:2,operationId:'exact-stock-receipt'};
const visual={id:1,table:'tratamento_visual_identity',chave:'tratamento_visual_identity:t',payload:{id:'t',user_id:'u',person_id:'p'},operation:'update',updated_at:'same'};
const dose={id:2,table:'doseLogs',chave:'dose:2',payload:{id:'d',user_id:'u',person_id:'p',macro02_atomic:{version:1}},operation:'update',updated_at:'same'};
const stock={id:3,table:'medicamentos',chave:'stock:3',payload:{id:'m',user_id:'u',person_id:'p',macro02_atomic:{version:2}},operation:'update',updated_at:'same'};
class Deferred extends Error{}
const processItem=make({db:{syncQueue:{where:()=>({equals:()=>({first:async()=>parent})}),get:async id=>queued.get(id),delete:async id=>{calls.push('ordinary-delete');queued.delete(id)}}},authenticatedUser:{id:'u'},isMacro02Metadata:i=>i.payload.macro02_metadata!==undefined,isMacro02Atomic:i=>i.payload.macro02_atomic!==undefined,sendMacro02AtomicR5:async(i,uid)=>{assert.equal(uid,'u');calls.push(i.table==='doseLogs'?'dose-send':'stock-send');if(mode==='inactive')throw Error('MACRO02_ACCOUNT_NOT_ACTIVATED');return i.table==='doseLogs'?(mode==='wrong-boolean'?true:ack):stockAck;},vitalTable:()=>false,pendingAtomicPredecessor:async()=>predecessor,requireSupabase:()=>({auth:{getUser:async()=>({data:{user:{id:'u'}},error:null})}}),SyncDependencyDeferredError:Deferred,
 syncTreatmentVisualIntentR03:async i=>{calls.push('visual-send');if(mode==='conflict')throw Error('CAS conflict');if(mode==='ack'){queued.delete(i.id);return true;}return false;},finalizeTreatmentVisualIntentR03:async()=>{calls.push('visual-finalize');return false;},syncDoseLog:async()=>{calls.push('dose-send');if(mode==='inactive')throw Error('MACRO02_ACCOUNT_NOT_ACTIVATED');return mode==='wrong-boolean'?true:ack;},sendMacro02Atomic:async(i,uid)=>{calls.push('stock-send');assert.equal(uid,'u');if(mode==='inactive')throw Error('MACRO02_ACCOUNT_NOT_ACTIVATED');return stockAck;},finalizeMacro02Atomic:async(i,r)=>{calls.push('clinical-finalize');assert.equal(r,i.table==='doseLogs'?ack:stockAck);queued.delete(i.id);return true;},finalizeMacro02AtomicR5:async(i,r)=>{calls.push('clinical-finalize');assert.equal(r,i.table==='doseLogs'?ack:stockAck);queued.delete(i.id);return true;},markLocalAsSynced:async()=>{calls.push('ordinary-sync');}});
function reset(){calls=[];mode='ack';parent=null;predecessor=false;queued=new Map([[1,visual],[2,dose],[3,stock]]);}
const run=item=>processItem(item,{processed:1},()=>{});let count=0;
async function check(label,fn){reset();await fn();count++;console.log('PASS '+label);}
(async()=>{
 await check('CAS ACK finalizes exactly its own intent, never clinical',async()=>{assert.equal(await run(visual),true);assert.deepEqual(calls,['visual-send']);assert(!queued.has(1)&&queued.has(2)&&queued.has(3));});
 await check('CAS false preserves queue and uses CAS-specific recovery',async()=>{mode='false';assert.equal(await run(visual),false);assert.deepEqual(calls,['visual-send','visual-finalize']);assert.equal(queued.size,3);});
 await check('CAS waits for parent creation',async()=>{parent={operation:'add'};await assert.rejects(run(visual),Deferred);assert.equal(queued.size,3);assert.deepEqual(calls,[]);});
 await check('CAS conflict cannot consume dose or stock',async()=>{mode='conflict';await assert.rejects(run(visual),/CAS conflict/);assert.equal(queued.size,3);assert.deepEqual(calls,['visual-send']);});
 await check('dose ACK exact clinical branch',async()=>{assert.equal(await run(dose),true);assert.deepEqual(calls,['dose-send','clinical-finalize']);assert(queued.has(1)&&!queued.has(2)&&queued.has(3));});
 await check('stock ACK exact clinical branch',async()=>{assert.equal(await run(stock),true);assert.deepEqual(calls,['stock-send','clinical-finalize']);assert(queued.has(1)&&queued.has(2)&&!queued.has(3));});
 await check('causal predecessor defers clinical operation only',async()=>{predecessor=true;assert.equal(await run(dose),'deferred');assert.deepEqual(calls,[]);assert.equal(queued.size,3);assert.equal(await run(visual),true);});
 await check('boolean must never acknowledge dose',async()=>{mode='wrong-boolean';await assert.rejects(run(dose),/Confirmação acoplada ausente/);assert.deepEqual(calls,['dose-send']);assert.equal(queued.size,3);});
 await check('inactive rejects dose and stock, preserving queue; NOT a usable release',async()=>{mode='inactive';await assert.rejects(run(dose),/MACRO02_ACCOUNT_NOT_ACTIVATED/);await assert.rejects(run(stock),/MACRO02_ACCOUNT_NOT_ACTIVATED/);assert.deepEqual(calls,['dose-send','stock-send']);assert.equal(queued.size,3);});
 console.log('MACRO02_STABILITY_DISPATCH='+count+'/'+count+' PASS; INACTIVE_RELEASE=BLOCKED_BY_DESIGN');
})().catch(e=>{console.error(e);process.exitCode=1;});
