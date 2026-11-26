'use strict';
const assert=require('node:assert/strict');
require('fake-indexeddb/auto');
if(!global.CustomEvent)global.CustomEvent=class extends Event{constructor(type,opts){super(type,opts);this.detail=opts?.detail;}};
const Dexie=require('dexie').default;
const {VitalRepository}=require('../build/vital/repository');
const {createVitalStorage,VITAL_STORES}=require('../build/vital/storage-dexie');
const {createVitalDraftStorage,DRAFT_STORE}=require('../build/vital/drafts');
const {VITAL_ACK_STORE}=require('../build/vital/cloud-transport');
const {randomUUID}=require('node:crypto');
const uid=randomUUID(),A={user_id:uid,person_id:randomUUID()},B={user_id:uid,person_id:randomUUID()},C={user_id:randomUUID(),person_id:randomUUID()};
const stores={...VITAL_STORES,persons:'id,user_id',locais:'id',medicos:'id',rehab_programs_m5:'id',syncQueue:'id,chave,table',vital_drafts:DRAFT_STORE,vital_sync_ack:VITAL_ACK_STORE};
const name='vault-vital-test-'+randomUUID();let db,scope=A,queueFailure=false;const DAY='2026-11-25';
const open=async()=>{const d=new Dexie(name);d.version(1).stores(stores);await d.open();return d;};
const bind=()=>{const auth=async()=>scope.user_id;const storage=createVitalStorage({db,authenticatedUser:auth,activeScope:()=>scope,enqueue:async(table,operation,row)=>{if(queueFailure)throw Error('fila falhou');await db.table('syncQueue').put({id:randomUUID(),chave:`${table}:${row.id}`,table,operation,payload:row});},dispatch:()=>{}});return {repo:new VitalRepository(storage,()=>new Date(2026,10,25,18)),drafts:createVitalDraftStorage({db,authenticatedUser:auth,activeScope:()=>scope})};};
const data={name:'Alimento de teste',favorite:true,active:true,notes:null};
(async()=>{try{db=await open();await db.table('persons').bulkAdd([A,B,C].map(s=>({id:s.person_id,user_id:s.user_id})));let {repo,drafts}=bind();
 const id=randomUUID();const row=await repo.saveFood(A,{id,expected_revision:null,data});assert.equal(row.id,id);assert.equal(await db.table('syncQueue').count(),1);console.log('PASS Dexie real + IndexedDB simulado: fato e outbox');
 queueFailure=true;await assert.rejects(repo.saveFood(A,{id:randomUUID(),expected_revision:null,data}),/fila falhou/);assert.equal(await db.table('vital_foods').count(),1);assert.equal(await db.table('syncQueue').count(),1);queueFailure=false;console.log('PASS rollback transacional real');
 scope=B;assert.equal((await repo.list(B,'vital_foods')).length,0);await assert.rejects(repo.saveFood(B,{id,expected_revision:null,data}));scope=C;assert.equal((await repo.list(C,'vital_foods')).length,0);scope=A;console.log('PASS isolamento entre contas e pessoas');
 const draftId=randomUUID();await drafts.save(A,{id:draftId,kind:'meal',payload:{day:DAY,time:'12:00'},expected_revision:null,expected_draft_revision:null});db.close();db=await open();({repo,drafts}=bind());assert.equal((await repo.list(A,'vital_foods'))[0].id,id);assert.equal((await drafts.load(A,draftId,'meal',x=>x)).value.day,DAY);assert.equal(await db.table('syncQueue').count(),1);console.log('PASS reabertura e recuperação de rascunho');
 await repo.saveFood(A,{id,expected_revision:1,data:{...data,name:'Outro'}});await assert.rejects(repo.saveFood(A,{id,expected_revision:1,data}));console.log('PASS revisão concorrente');
 const backup=await repo.exportBackup(A);const cloud={async page(table,s,after,limit){return backup.entries.filter(e=>e.table===table&&(!after||e.row.id>after)).map(e=>{const {synced,...r}=e.row;return r;}).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,limit);},async get(){throw Error('unexpected get')},async insert(){throw Error('unexpected write')},async cas(){throw Error('unexpected write')}};
 // Use the actual Dexie transaction and repository, not a second in-memory implementation.
 const restoreName=name+'-restore';const restoreDb=new Dexie(restoreName);restoreDb.version(1).stores(stores);await restoreDb.open();try{await restoreDb.table('persons').put({id:A.person_id,user_id:A.user_id});const restoredRepo=new VitalRepository(createVitalStorage({db:restoreDb,authenticatedUser:async()=>A.user_id,activeScope:()=>A,enqueue:async()=>{throw Error('already confirmed should not enqueue')},dispatch:()=>{}}));const restored=await restoredRepo.restoreBackup(A,backup,cloud);assert.equal(restored.confirmed,backup.entries.length);assert.equal(await restoreDb.table('vital_sync_ack').count(),backup.entries.length);assert.equal((await restoredRepo.list(A,'vital_foods'))[0].id,id);assert.equal(await restoreDb.table('syncQueue').count(),0);await assert.rejects(restoredRepo.restoreBackup(A,backup,cloud));console.log('PASS backup em Dexie real e recusa de sobrescrita');}finally{restoreDb.close();await Dexie.delete(restoreName);}
 console.log('VITAL_INDEXEDDB_TOTAL=6 PASS=6 FAIL=0');
 }finally{db?.close();await Dexie.delete(name);}})().catch(e=>{console.error(e);process.exitCode=1;});
