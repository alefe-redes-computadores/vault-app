'use strict';
const assert=require('node:assert/strict');
const {acceptMacro02Capability,runWithMacro02Authority}=require(process.argv[2]);
const ctx={accountId:'u',sessionEpoch:'s',clientProtocol:2};
const pending={legacy:0,premium:0,unclassified:0};
const evidence=writer=>acceptMacro02Capability({version:1,account_id:'u',writer,epoch:writer,fence_id:'f-'+writer,issued_at_ms:100,expires_at_ms:10000,minimum_protocol:2},ctx,0,5);
const legacy=evidence('legacy'),premium=evidence('premium');
function host(grant,options={}){let state=[],calls=[],reads=0;return {state:()=>state,calls,run:()=>runWithMacro02Authority({snapshot:async()=>{reads++;return options.snapshot?.(reads)??{context:ctx,evidence:grant,nowMono:10,pending};},transaction:async fn=>{calls.push('tx');const old=state.slice();try{return await fn();}catch(e){state=old;throw e;}},writeLegacy:async()=>{calls.push('legacy');state.push('legacy-fact','legacy-intent');if(options.fail)throw Error('writer-failed');return 'legacy';},writePremium:async()=>{calls.push('premium');state.push('premium-fact','premium-intent');if(options.fail)throw Error('writer-failed');return 'premium';}})};}
let n=0;async function test(label,f){await f();n++;console.log('PASS '+label);}
(async()=>{
 await test('inactive invokes only legacy and commits fact+intent',async()=>{const h=host(legacy);assert.equal(await h.run(),'legacy');assert.deepEqual(h.calls,['tx','legacy']);assert.deepEqual(h.state(),['legacy-fact','legacy-intent']);});
 await test('active invokes only Premium and commits fact+intent',async()=>{const h=host(premium);assert.equal(await h.run(),'premium');assert.deepEqual(h.calls,['tx','premium']);assert.deepEqual(h.state(),['premium-fact','premium-intent']);});
 await test('unknown does not enter transaction or mutate',async()=>{const h=host(null);await assert.rejects(h.run(),/AUTHORITY_HOLD/);assert.deepEqual(h.calls,[]);assert.deepEqual(h.state(),[]);});
 await test('authority changed before mutation invokes neither writer',async()=>{const h=host(legacy,{snapshot:i=>({context:ctx,evidence:i===1?legacy:premium,nowMono:10,pending})});await assert.rejects(h.run(),/AUTHORITY_CHANGED/);assert.deepEqual(h.calls,['tx']);assert.deepEqual(h.state(),[]);});
 await test('authority changed before commit rolls back both fact and intent',async()=>{const h=host(legacy,{snapshot:i=>({context:ctx,evidence:i===3?premium:legacy,nowMono:10,pending})});await assert.rejects(h.run(),/AUTHORITY_CHANGED/);assert.deepEqual(h.calls,['tx','legacy']);assert.deepEqual(h.state(),[]);});
 await test('writer failure rolls back without invoking other writer',async()=>{for(const g of [legacy,premium]){const h=host(g,{fail:true});await assert.rejects(h.run(),/writer-failed/);assert.equal(h.calls.length,2);assert.deepEqual(h.state(),[]);}});
 await test('opposite pending detected after write rolls back',async()=>{const h=host(premium,{snapshot:i=>({context:ctx,evidence:premium,nowMono:10,pending:i===3?{...pending,legacy:1}:pending})});await assert.rejects(h.run(),/AUTHORITY_CHANGED/);assert.deepEqual(h.state(),[]);});
 await test('account switch mid-transaction rolls back',async()=>{const h=host(legacy,{snapshot:i=>({context:i===3?{...ctx,accountId:'v'}:ctx,evidence:legacy,nowMono:10,pending})});await assert.rejects(h.run(),/AUTHORITY_CHANGED/);assert.deepEqual(h.state(),[]);});
 console.log('MACRO02_ROUTING_TRANSACTION_DOUBLES_PASS='+n+' (transaction doubles, not Dexie)');
})().catch(e=>{console.error(e);process.exitCode=1;});
