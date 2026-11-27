'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),cache=new Map();
function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.resolve(path.dirname(file),n)+'.ts'):require(n));return m.exports;}
const {createMacro02DeviceAuthorityR5,selectMacro02DeviceR5}=load('lib/dose-premium/cutover-device-authority-r5.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,uid=id(1),epoch=id(2);
const active={format:'macro02-enrollment-r3',account_id:uid,state:'premium',epoch,minimum_protocol:3,generation:2};
const marker={format:'macro02-device-r5',account_id:uid,epoch,generation:2,local_sha256:'a'.repeat(64),remote_sha256:'b'.repeat(64)};
const legacy={table:'doseLogs',operation:'update',chave:'dose:legacy',payload:{id:id(3),user_id:uid}};
function fixture(){let state={account:uid,online:true,remote:structuredClone(active),device:structuredClone(marker),queue:[],reads:0};const host={localAccount:async()=>state.account,online:()=>state.online,readRemote:async()=>{state.reads++;return state.remote;},readDevice:async()=>state.device,queue:async()=>state.queue};return {state,host,runtime:createMacro02DeviceAuthorityR5(host)};}
let pass=0;async function test(n,fn){await fn();pass++;console.log('PASS '+n);}
(async()=>{
 await test('verified active account actually selects Premium writer',async()=>{const f=fixture(),a=await f.runtime.prepareWrite(uid);assert.equal(a.writer,'premium');assert.equal(a.epoch,epoch);await a.assertCurrent();await a.assertFinalQueue();});
 await test('active epoch persists in simulated new runtime offline',async()=>{const f=fixture();f.state.online=false;const newRuntime=createMacro02DeviceAuthorityR5(f.host);assert.equal((await newRuntime.prepareWrite(uid)).writer,'premium');assert.equal(f.state.reads,0);});
 await test('active account on an unverified device is held',async()=>{const f=fixture();f.state.device=null;await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);});
 await test('offline unknown device is held',async()=>{const f=fixture();f.state.device=null;f.state.online=false;await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);});
 await test('wrong account marker is rejected',async()=>{const f=fixture();f.state.device.account_id=id(4);await assert.rejects(f.runtime.prepareWrite(uid),/DEVICE_SCOPE/);});
 await test('stale epoch or generation cannot write',async()=>{for(const patch of [{epoch:id(5)},{generation:3}]){const f=fixture();Object.assign(f.state.remote,patch);await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);}});
 await test('active device cannot downgrade to legacy',async()=>{const f=fixture();f.state.remote={...active,state:'legacy',epoch:null,generation:3};await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);});
 await test('frozen and held state stops writes',async()=>{for(const state of ['frozen','hold']){const f=fixture();f.state.remote.state=state;await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);}});
 await test('legacy queue conflicts with active account at entry and final check',async()=>{const f=fixture(),a=await f.runtime.prepareWrite(uid);await a.assertCurrent();f.state.queue=[legacy];await assert.rejects(a.assertFinalQueue(),/QUEUE_CONFLICT/);await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);});
 await test('session invalidation and connectivity changes invalidate prepared writer',async()=>{for(const invalidate of [f=>f.runtime.invalidate(),f=>{f.state.online=false;}]){const f=fixture(),a=await f.runtime.prepareWrite(uid);await a.assertCurrent();invalidate(f);await assert.rejects(a.assertFinalQueue(),/DEVICE_CHANGED/);}});
 await test('another local account cannot acquire authority',async()=>{const f=fixture();f.state.account=id(4);await assert.rejects(f.runtime.prepareWrite(uid),/DEVICE_AUTH/);});
 await test('concurrent reads of same account are coalesced',async()=>{const f=fixture();const a=await Promise.all([f.runtime.resolve(uid),f.runtime.resolve(uid)]);assert.equal(f.state.reads,1);assert.deepEqual(a[0],a[1]);});
 await test('legacy online remains available without a device marker',async()=>{const f=fixture();f.state.device=null;f.state.remote={...active,state:'legacy',epoch:null,generation:0};assert.equal((await f.runtime.prepareWrite(uid)).writer,'legacy');f.state.online=false;await assert.rejects(f.runtime.prepareWrite(uid),/REVIEW_REQUIRED/);});
 console.log(`M02_ACTIVE_DEVICE_R5_DOUBLES_PASS=${pass}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
