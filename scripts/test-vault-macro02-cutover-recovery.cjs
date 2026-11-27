#!/usr/bin/env node
'use strict';
// Actual TypeScript modules; no production data. Transaction doubles exercise
// the contract, not real IndexedDB/PG. Real adapters remain a separate gate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){if(cache.has(rel))return cache.get(rel).exports;const f=path.join(root,rel),m={exports:{}};cache.set(rel,m);const ast=ts.createSourceFile(f,fs.readFileSync(f,'utf8'),ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0);const code=ts.transpileModule(ast.getFullText(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('module','exports','require',code)(m,m.exports,n=>n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.normalize(path.join(path.dirname(rel),n+'.ts'))):require(n));return m.exports;}
const {CUTOVER_TABLES:tables,cutoverCanonical:canonical,cutoverLocalIdentity:identity,inspectMacro02Cutover:inspect,planMacro02FencedRecovery:plan}=load('lib/dose-premium/cutover-recovery.ts');
const {captureMacro02LocalCutover:capture}=load('lib/dose-premium/cutover-local-snapshot.ts');
const {rehearseMacro02AddOnlyRecovery:rehearse}=load('lib/dose-premium/cutover-recovery-transaction.ts');
const uid='synthetic-owner',person='synthetic-person',med='synthetic-med',dose='synthetic-dose',treatment='synthetic-treatment';
const expected={account_id:uid,fence_id:'synthetic-fence',epoch:'synthetic-epoch'};
const row=(id,fields={})=>({id,user_id:uid,...fields});
const empty=()=>Object.fromEntries(tables.map(t=>[t,[]]));
function full(){const rows=empty();rows.persons=[row(person)];rows.medicamentos=[row(med,{person_id:person,estoque_quantidade:9,tratamento_ids:[treatment]})];rows.tratamentos=[row(treatment,{person_id:person})];rows.doseLogs=[row(dose,{person_id:person,medicamento_id:med,quantidade:1,data:'2026-11-25',horario:'10:00',tomado_em:'2026-11-25T10:00:00-03:00',dose_kind:'planned'})];rows.medicamento_tratamentos=[{id:'link',medicamento_id:med,tratamento_id:treatment}];return {account_id:uid,rows,queue:[],omitted_unowned_count:0,unscoped_rows_count:0,external_dependency_queue_count:0};}
const wire=(x=full())=>({version:1,...expected,complete:true,rows:structuredClone(x.rows)}),copy=structuredClone;
const missing=()=>{const x=full();x.rows.doseLogs=[];return x;};
const q=(operation='add',payload=full().rows.doseLogs[0])=>({id:'queue-original',chave:'doseLogs:'+dose,table:'doseLogs',operation,payload:copy(payload),retry_count:4,updated_at:'2026-11-25T15:00:00Z'});
let count=0;async function check(name,run){await run();count++;console.log('PASS '+name);}
function host(initial,{rejectAdd=false,modifyAdd=false,guard=()=>{}}={}){let current=copy(initial),active=false;const h={transaction:async fn=>{assert(!active);active=true;const before=copy(current);try{return await fn();}catch(e){current=before;throw e;}finally{active=false;}},readLocal:async()=>{assert(active);return copy(current);},add:async(t,r)=>{assert(active);if(rejectAdd)throw Error('collision');assert(!current.rows[t].some(x=>x.id===r.id));current.rows[t].push(copy(modifyAdd?{...r,quantidade:777}:r));},assertFenceAndSession:guard,view:()=>copy(current)};return h;}
(async()=>{
 await check('exact scope, no activation, ACK or replay permit',()=>{const a=inspect(full(),wire(),expected);assert(a.localMatchesFence);assert.equal(a.allowsActivation,false);assert.equal(a.allowsReplay,false);assert.equal(a.allowsAck,false);assert.equal(a.counts.equal,5);});
 await check('canonical ordering independent of insertion order, null distinct from missing',()=>{assert.equal(canonical({b:1,a:2}),canonical({a:2,b:1}));assert.notEqual(canonical({a:null}),canonical({}));for(const x of [undefined,NaN,Infinity,-0,new Date(),[,,],{a:undefined}])assert.throws(()=>canonical(x));});
 await check('strict fence and completeness',()=>{for(const patch of [{version:2},{complete:false},{fence_id:'old'},{epoch:'old'},{account_id:'foreign'}])assert.throws(()=>inspect(full(),{...wire(),...patch},expected));});
 await check('foreign row, missing table and duplicate rejected',()=>{for(const fn of [x=>x.rows.persons.push(row(person)),x=>x.rows.persons[0].user_id='foreign',x=>delete x.rows.persons]){const x=full();fn(x);assert.throws(()=>inspect(x,wire(),expected));}});
 await check('foreign person and list reference rejected',()=>{const x=full();x.rows.persons.push(row('other'));x.rows.tratamentos[0].person_id='other';assert.throws(()=>inspect(x,wire(),expected),/CROSS_PERSON/);});
 await check('missing historic reference remains a blocker without fabrication',()=>{const x=full();x.rows.doseLogs[0].medicamento_id='old-med';const a=inspect(x,wire(x),expected);assert(a.blockers.includes('MISSING_DEPENDENCY'));assert.equal(x.rows.doseLogs[0].medicamento_id,'old-med');});
 await check('pair identity for join without remote ID, no fabricated local ID',()=>{const x=full();delete x.rows.medicamento_tratamentos[0].id;assert(inspect(x,wire(x),expected).localMatchesFence);const l=copy(x);l.rows.medicamento_tratamentos=[];assert.throws(()=>plan(l,x,wire(x),expected),/LOCAL_LINK_ID_REQUIRED/);});
 await check('duplicate links with distinct row IDs rejected',()=>{const x=full();x.rows.medicamento_tratamentos.push({...x.rows.medicamento_tratamentos[0],id:'second'});assert.throws(()=>inspect(x,wire(),expected));});
 await check('equal late legacy intent is not ACK',()=>{const x=full();x.queue=[q()];const a=inspect(x,wire(),expected);assert.equal(a.intents[0].status,'equal_at_fence_not_ack');assert(a.blockers.includes('PENDING_QUEUE'));assert.equal(a.counts.legacy,1);assert.deepEqual(x.queue,[q()]);});
 await check('missing late legacy intent is not replay',()=>{const x=full();x.queue=[q()];const a=inspect(x,wire(missing()),expected);assert.equal(a.intents[0].status,'absent_at_fence_not_replay');assert.equal(a.allowsReplay,false);});
 await check('late delete absent is not proof of completion',()=>{const x=full();x.queue=[q('delete')];assert.equal(inspect(x,wire(missing()),expected).intents[0].status,'delete_absence_unproven');assert.equal(inspect(x,wire(),expected).intents[0].status,'delete_conflict');});
 await check('late divergent quantity preserved and unacknowledged',()=>{const x=full();x.queue=[q('update',{...x.rows.doseLogs[0],quantidade:2})];assert.equal(inspect(x,wire(),expected).intents[0].status,'divergent_at_fence');assert.equal(x.queue[0].payload.quantidade,2);});
 await check('ambiguous Premium marker classified, not silently legacy',()=>{const x=full();x.queue=[q('update',{...x.rows.doseLogs[0],unidade_dose:'tablet'})];assert.equal(inspect(x,wire(),expected).counts.unclassified,1);});
 await check('queue key/account/operation mismatch rejected',()=>{for(const fn of [x=>x.queue.push(copy(x.queue[0])),x=>x.queue[0].payload.user_id='foreign',x=>x.queue[0].operation='upsert',x=>x.queue[0].chave='doseLogs:wrong']){const x=full();x.queue=[q()];fn(x);assert.throws(()=>inspect(x,wire(),expected));}});
 await check('unsynced local row without queue cannot prove readiness',()=>{const x=full();x.rows.doseLogs[0].synced=false;const a=inspect(x,wire(x),expected);assert(a.blockers.includes('UNSYNCED_ROWS'));assert.equal(a.counts.unsyncedRows,1);});
 await check('only exact missing rows selected, no recalculation',()=>{const p=plan(missing(),full(),wire(),expected);assert.equal(p.adds.length,1);assert.deepEqual(p.adds[0].row,full().rows.doseLogs[0]);assert.equal(p.allowsLiveRestore,false);assert.equal(p.allowsReplay,false);});
 await check('conflicting backup, local-only facts and pending queue block recovery',()=>{const a=full();a.rows.doseLogs[0].quantidade=2;assert.throws(()=>plan(missing(),a,wire(),expected));assert.throws(()=>plan(full(),missing(),wire(missing()),expected));const b=missing();b.queue=[q()];assert.throws(()=>plan(b,full(),wire(),expected));});
 await check('unowned rows/queue/dependency intents block recovery',()=>{for(const k of ['omitted_unowned_count','unscoped_rows_count','external_dependency_queue_count']){const x=missing();x[k]=1;assert.throws(()=>plan(x,full(),wire(),expected));}});
 await check('read transaction snapshots account and preserves original queue bytes',async()=>{const x=full();let inside=false;const other=row('foreign-person',{user_id:'foreign'});x.rows.persons.push(other);const queue=[q(),{...q(),id:'foreign-q',payload:{...q().payload,user_id:'foreign'}},{table:'doseLogs',payload:{}},{table:'tratamento_visual_identity',payload:{user_id:uid}}];const y=await capture({transaction:async f=>{inside=true;try{return await f();}finally{inside=false;}},readTable:async t=>{assert(inside);return t==='syncQueue'?queue:x.rows[t];},assertSession:()=>{}},uid);assert.equal(y.rows.persons.length,1);assert.deepEqual(y.queue,[q()]);assert.equal(y.omitted_unowned_count,1);assert.equal(y.external_dependency_queue_count,1);});
 await check('own link missing local PK must not vanish silently',async()=>{const x=full();delete x.rows.medicamento_tratamentos[0].id;const y=await capture({transaction:f=>f(),readTable:async t=>t==='syncQueue'?[]:x.rows[t],assertSession:()=>{}},uid);assert.equal(y.unscoped_rows_count,1);});
 await check('account switch invalidates capture',async()=>{let checks=0;await assert.rejects(capture({transaction:f=>f(),readTable:async t=>t==='syncQueue'?[]:full().rows[t],assertSession:()=>{if(++checks===3)throw Error('session changed');}},uid),/session changed/);});
 const input=()=>({before:missing(),backup:full(),wire:wire(),expected});
 await check('add-only transaction reproduces exact postimage; stock unchanged',async()=>{const h=host(missing());const r=await rehearse(h,input());assert.equal(r.added,1);assert.equal(identity(h.view()),identity(full()));assert.equal(h.view().rows.medicamentos[0].estoque_quantidade,9);assert.equal(r.allowsActivation,false);});
 await check('concurrent local changes stop before write',async()=>{const x=missing();x.rows.medicamentos[0].estoque_quantidade=8;const h=host(x);await assert.rejects(rehearse(h,input()),/LOCAL_CHANGED/);assert.equal(identity(h.view()),identity(x));});
 await check('PK conflict rolls back and preserves original data',async()=>{const h=host(missing(),{rejectAdd:true});await assert.rejects(rehearse(h,input()),/collision/);assert.equal(identity(h.view()),identity(missing()));});
 await check('incorrect postimage rolls back no stock recompute',async()=>{const h=host(missing(),{modifyAdd:true});await assert.rejects(rehearse(h,input()),/POSTIMAGE_MISMATCH/);assert.equal(identity(h.view()),identity(missing()));});
 await check('session/fence loss at each gate rolls back',async()=>{for(let stop=1;stop<=6;stop++){let n=0;const h=host(missing(),{guard:()=>{if(++n===stop)throw Error('fence changed');}});await assert.rejects(rehearse(h,input()),/fence changed/);assert.equal(identity(h.view()),identity(missing()));}});
 console.log('MACRO02_CUTOVER_LAB_PASS='+count);
 if(process.argv.includes('--pure-only')){console.log('REAL_DEXIE_REMOTE_FENCE_AND_ACTIVATION_PENDING');return;}
 await actualDexie();console.log('MACRO02_CUTOVER_DEXIE_LAB_PASS');console.log('AUTHENTICATED_REMOTE_FENCE_AND_ACTIVATION_PENDING');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Uses the actual read-only Vault adapter on isolated synthetic Dexie, not production.
async function actualDexie(){
 require('fake-indexeddb/auto');if(typeof global.CustomEvent==='undefined')global.CustomEvent=class CustomEvent extends Event{constructor(t,o){super(t);this.detail=o?.detail;}};
 const Dexie=require('dexie').default,db=new Dexie('macro02-cutover-lab-'+crypto.randomUUID());
 db.version(1).stores(Object.fromEntries([...tables,'syncQueue'].map(t=>[t,'id'])));
 const f=path.join(root,'lib/sync/macro02-cutover-local.ts'),m={exports:{}};
 new Function('module','exports','require',ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,n=>n==='@/lib/db'?{db}:n.startsWith('@/')?load(n.slice(2)+'.ts'):require(n));
 const read=m.exports.readMacro02CutoverLocal;
 await db.open();try{
  const seed=missing();for(const t of tables)if(seed.rows[t].length)await db.table(t).bulkAdd(seed.rows[t]);
  const list=[...tables,'syncQueue'].map(t=>db.table(t));
  const h=(guard=()=>{},bad=false)=>({transaction:fn=>db.transaction('rw',list,fn),readLocal:()=>read(uid,guard),add:async(t,r)=>{await db.table(t).add(bad?{...r,quantidade:999}:r);},assertFenceAndSession:guard});
  const i={before:missing(),backup:full(),wire:wire(),expected};
  assert.equal(identity(await read(uid,()=>{})),identity(missing()));
  await assert.rejects(rehearse(h(()=>{},true),i),/POSTIMAGE_MISMATCH/);assert.equal(await db.table('doseLogs').count(),0);
  let checks=0;await assert.rejects(rehearse(h(()=>{if(++checks===10)throw Error('session changed');}),i),/session changed/);assert.equal(await db.table('doseLogs').count(),0);
  await db.table('doseLogs').add({...full().rows.doseLogs[0],user_id:'foreign'});await assert.rejects(rehearse(h(),i));assert.equal((await db.table('doseLogs').get(dose)).user_id,'foreign');await db.table('doseLogs').delete(dose);
  assert.equal((await rehearse(h(),i)).added,1);assert.equal(identity(await read(uid,()=>{})),identity(full()));assert.equal((await db.table('medicamentos').get(med)).estoque_quantidade,9);assert.equal(await db.table('syncQueue').count(),0);
  console.log('PASS real Dexie lab rollback, foreign PK collision, session invalidation and exact recovery');
 }finally{db.close();await db.delete();}
}
