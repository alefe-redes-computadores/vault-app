'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {createMacro02R2Transport,R2_CAPABILITY_RPC,R2_RECEIPTS_RPC}=require(path.join(process.argv[2],'r2-transport.js'));
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
let now=1000,seq=0,account=uid,online=true,rows=[],calls=[],transform=x=>x;
const capability=()=>({version:1,account_id:account,writer:'legacy',epoch:'m02-dormant-r1',fence_id:'m02-dormant-r1:'+account,issued_at_ms:1000,expires_at_ms:301000,minimum_protocol:2});
const make=()=>createMacro02R2Transport({nowMono:()=>now,newSessionEpoch:()=>String(++seq),authenticatedAccount:async()=>account,queue:async()=>rows,rpc:async(name,args)=>{calls.push({name,args});if(!online)throw Error('offline');if(name!==R2_CAPABILITY_RPC)throw Error('unexpected');return transform(capability());}});
let n=0;async function check(label,fn){await fn();n++;console.log('PASS '+label);}
(async()=>{
 let transport=make(),grant;
 await check('R2 authenticated dormant grant selects only legacy',async()=>{grant=await transport.prepareWrite(uid);assert.equal(grant.writer,'legacy');assert.equal(calls.at(-1).name,R2_CAPABILITY_RPC);await grant.assertCurrent();});
 await check('within current lease offline write can select legacy without another RPC',async()=>{online=false;const count=calls.length;now+=1000;assert.equal((await transport.prepareWrite(uid)).writer,'legacy');assert.equal(calls.length,count);});
 await check('expiry blocks offline transaction and new write',async()=>{now+=300000;await assert.rejects(grant.assertCurrent(),/AUTHORITY_CHANGED/);await assert.rejects(transport.prepareWrite(uid),/CAPABILITY_UNAVAILABLE/);});
 await check('restart offline cannot assume legacy',async()=>{await assert.rejects(make().prepareWrite(uid),/CAPABILITY_UNAVAILABLE/);online=true;});
 await check('R2 cannot return premium even when RPC claims it',async()=>{transform=x=>({...x,writer:'premium'});await assert.rejects(make().prepareWrite(uid),/CAPABILITY_UNAVAILABLE/);transform=x=>x;});
 await check('incorrect fence or account cannot issue grant',async()=>{transform=x=>({...x,fence_id:'m02-dormant-r1:'+other});await assert.rejects(make().prepareWrite(uid));transform=x=>x;account=other;await assert.rejects(make().prepareWrite(uid),/ACCOUNT_UNCONFIRMED/);account=uid;});
 await check('unclassified pending clinical intent blocks mutation',async()=>{rows=[{table:'doseLogs',payload:{user_id:uid,unidade_dose:'tablet'}}];await assert.rejects(make().prepareWrite(uid),/AUTHORITY_CHANGED/);rows=[];});
 await check('invalidation before commit cancels selected grant',async()=>{transport=make();grant=await transport.prepareWrite(uid);transport.invalidate();await assert.rejects(grant.assertCurrent(),/AUTHORITY_CHANGED/);});
 await check('read-only empty receipt inspection needs valid account but no replay',async()=>{const result=await make().readLedger(uid,[]);assert.deepEqual(result,{account_id:uid,fence_id:'m02-dormant-r1:'+uid,complete:true,rows:[]});assert.equal(calls.some(x=>x.name===R2_RECEIPTS_RPC),false);});
 console.log('MACRO02_R2_TRANSPORT_PASS='+n);
})().catch(e=>{console.error(e);process.exitCode=1;});
