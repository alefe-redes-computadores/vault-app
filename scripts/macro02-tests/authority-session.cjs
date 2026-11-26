'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),out=process.argv[2];
const {createMacro02AuthoritySession,countMacro02Pending}=require(path.join(out,'authority-session.js'));
const {selectMacro02Writer}=require(path.join(out,'account-authority.js'));
const account='u',empty={legacy:0,premium:0,unclassified:0};let now=100,seq=0,identity=account,request=()=>Promise.resolve(wire()),authCalls=0;
const wire=()=>({version:1,account_id:account,writer:'legacy',epoch:'server-1',fence_id:'lease-1',issued_at_ms:1000,expires_at_ms:11000,minimum_protocol:2});
const session=createMacro02AuthoritySession({clientProtocol:2,nowMono:()=>now,newSessionEpoch:()=>String(++seq),authenticatedAccount:async()=>{authCalls++;return identity;},requestCapability:()=>request()});
const decision=(uid=account,pending=empty)=>{const s=session.snapshot(uid,pending);return selectMacro02Writer(s.context,s.evidence,s.nowMono,s.pending);};
let n=0;async function check(label,f){await f();n++;console.log('PASS '+label);}
(async()=>{
 await check('successful authenticated refresh selects legacy without more network in snapshot',async()=>{assert.equal(await session.refresh(account),true);const calls=authCalls;assert.equal(decision().writer,'legacy');assert.equal(authCalls,calls);});
 await check('session or lifecycle invalidation holds and does not persist capability',async()=>{session.invalidate();assert.equal(decision().reason,'unknown');});
 await check('foreign identity cannot refresh',async()=>{identity='other';assert.equal(await session.refresh(account),false);assert.equal(decision().reason,'unknown');identity=account;});
 await check('missing or rejected RPC remains unknown, never fallback',async()=>{request=()=>Promise.reject(Error('missing'));assert.equal(await session.refresh(account),false);assert.equal(decision().reason,'unknown');request=()=>Promise.resolve(wire());});
 await check('scope mismatch in response remains unknown',async()=>{request=()=>Promise.resolve({...wire(),account_id:'other'});assert.equal(await session.refresh(account),false);assert.equal(decision().reason,'unknown');request=()=>Promise.resolve(wire());});
 await check('older refresh cannot overwrite newer lease',async()=>{let resolve,entered;const wait=new Promise(r=>entered=r);request=()=>{entered();return new Promise(r=>resolve=r);};const old=session.refresh(account);await wait;request=()=>Promise.resolve({...wire(),writer:'premium'});assert.equal(await session.refresh(account),true);resolve(wire());assert.equal(await old,false);assert.equal(decision().writer,'premium');});
 await check('logout while RPC in flight invalidates response',async()=>{let resolve,entered;const wait=new Promise(r=>entered=r);request=()=>{entered();return new Promise(r=>resolve=r);};const old=session.refresh(account);await wait;session.invalidate();resolve(wire());assert.equal(await old,false);assert.equal(decision().reason,'unknown');request=()=>Promise.resolve(wire());});
 await check('account switch without lifecycle callback is rejected by second identity read',async()=>{request=async()=>{identity='other';return wire();};assert.equal(await session.refresh(account),false);assert.equal(decision().reason,'unknown');identity=account;request=()=>Promise.resolve(wire());});
 await check('stale capability is not an offline legacy grant',async()=>{assert.equal(await session.refresh(account),true);now+=10000;assert.equal(decision().reason,'expired');});
 await check('clinical queue count is conservative and isolated by account',()=>{const q=(table,payload)=>({table,operation:'update',chave:'x',payload});assert.deepEqual(countMacro02Pending([q('doseLogs',{user_id:account}),q('retiradas',{user_id:account}),q('doseLogs',{user_id:'other'}),q('documents',{user_id:account}),q('medicamentos',{}),q('renovacoes',{user_id:account,macro02_atomic:{}}),q('doseLogs',{user_id:account,unidade_dose:'tablet'})],account),{legacy:2,premium:0,unclassified:3});});
 console.log('MACRO02_AUTHORITY_SESSION_PASS='+n+' (adapter contract, server and actual writers pending)');
})().catch(e=>{console.error(e);process.exitCode=1;});
