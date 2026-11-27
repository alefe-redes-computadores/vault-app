'use strict';
// Real VaultDB schema, repository and enqueue adapter; synthetic account and
// explicit fake Premium grant. Never imports real Supabase credentials.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
require('fake-indexeddb/auto');
if(typeof global.CustomEvent==='undefined')global.CustomEvent=class CustomEvent extends Event{constructor(t,o){super(t);this.detail=o?.detail;}};
global.window=new EventTarget();global.document=new EventTarget();
const root=path.resolve(__dirname,'../..'),cache=new Map(),id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const uid=id(1),pid=id(2),mid=id(3),epoch=id(4),foreign=id(5),stamp='2026-11-26T12:00:00Z';
let checks=0,failAt=0,dispatched=0;
const auth={writer:'premium',epoch,assertCurrent:async()=>{if(++checks===failAt)throw Error('SYNTHETIC_SESSION_CHANGED');}};
function load(rel){const f=path.resolve(root,rel);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);m.paths=Module._nodeModulePaths(path.dirname(f));cache.set(f,m);m.require=n=>{
 if(n==='@/lib/supabase/storage')return {deleteFile:async()=>{throw Error('UNEXPECTED_STORAGE');}};
 if(n==='@/lib/supabase/client')return {supabase:{rpc:async()=>{throw Error('UNEXPECTED_REMOTE_RPC');}}};
 if(n==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:{id:uid}},error:null})};
 if(n==='@/lib/sync/macro02-authority')return {prepareMacro02ClinicalWrite:async u=>{assert.equal(u,uid);return auth;}};
 if(n==='@/lib/sync/enfileirarOperacao'){const actual=load('lib/sync/enfileirarOperacao.ts');return {...actual,solicitarProcessamentoSync:()=>{assert.equal(require('dexie').default.currentTransaction,null);dispatched++;}};}
 if(n.startsWith('@/')||n.startsWith('.')){const p=n.startsWith('@/')?path.resolve(root,n.slice(2)):path.resolve(path.dirname(f),n);for(const t of [p,p+'.ts',path.join(p,'index.ts')])if(fs.existsSync(t)&&fs.statSync(t).isFile())return load(t);throw Error('IMPORT_NOT_FOUND:'+n);}
 return require(n);
};m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);return m.exports;}
(async()=>{
 const {db}=load('lib/db/index.ts'),{doseLogsRepository}=load('lib/repositories/doseLogs.ts'),{metadataPendingProtection}=load('lib/dose-premium/cutover-metadata-pending.ts');
 await db.open();try{
 await db.persons.add({id:pid,user_id:uid,name:'Synthetic',isDefault:true,synced:true});
 await db.persons.add({id:foreign,user_id:foreign,name:'Other synthetic account',synced:true});
 await db.medicamentos.add({id:mid,user_id:uid,person_id:pid,nome:'Synthetic',dosagem:'1 mg',tipo_uso:'temporario',estoque_quantidade:9,estoque_unidade_medida:'comprimido',estoque_unidade_por_dose:1,macro02_stock_managed:true,estoque_ciclo_id:id(7),created_at:stamp,updated_at:stamp,synced:true});
 const input={personId:pid,medicamentoId:mid,data:'2099-11-26',horario:'08:00',quantidade:1,motivo:'Synthetic planning'};
 const did=await doseLogsRepository.agendarDoseAvulsa(input);assert.equal((await db.medicamentos.get(mid)).estoque_quantidade,9);assert.equal((await db.doseLogs.get(did)).dose_kind,'planned');assert.equal((await db.doseLogs.get(did)).tomado_em,undefined);const queue=await db.syncQueue.toArray();assert.equal(queue.length,1);assert(queue[0].payload.macro02_metadata);assert.equal(queue[0].payload.macro02_metadata.changes[0].after.id,did);assert(metadataPendingProtection(queue,uid).has('doseLogs',did));assert.equal(dispatched,1);
 const snapshot=async()=>JSON.stringify([await db.doseLogs.toArray(),await db.medicamentos.toArray(),await db.syncQueue.toArray()]);const old=await snapshot();
 await assert.rejects(doseLogsRepository.agendarDoseAvulsa({...input,horario:'09:00'}),/CLINICAL_PENDING/);assert.equal(await snapshot(),old);assert.equal(dispatched,1);
 // Drop only the synthetic queued envelope as test setup, not application ACK.
 await db.syncQueue.clear();await db.doseLogs.update(did,{synced:true});const before=await snapshot();checks=0;failAt=5;
 await assert.rejects(doseLogsRepository.agendarDoseAvulsa({...input,horario:'10:00'}),/SYNTHETIC_SESSION_CHANGED/);assert.equal(await snapshot(),before);assert.equal(dispatched,1);assert.equal(await db.persons.count(),2);
 console.log('MACRO02_R3_RESIDUAL_REAL_DEXIE_FIXTURE_PASS');
 }finally{db.close();await db.delete();}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
