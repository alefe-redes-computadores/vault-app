'use strict';
// Real Vault schema + fake IndexedDB + isolated authenticated RPC fixture.
// Does not contact Supabase. PG wire/real-schema tests are separate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module'),crypto=require('node:crypto');
require('fake-indexeddb/auto');
if(typeof global.CustomEvent==='undefined')global.CustomEvent=class CustomEvent extends Event{constructor(t,o){super(t);this.detail=o?.detail;}};
global.window=new EventTarget();global.document=new EventTarget();
const root=path.resolve(__dirname,'../..'),cache=new Map();
const uid='00000000-0000-4000-8000-000000000001',foreign='00000000-0000-4000-8000-000000000002',epoch='00000000-0000-4000-8000-000000000099',operationId='00000000-0000-4000-8000-000000000088',pid='00000000-0000-4000-8000-000000000011',mid='00000000-0000-4000-8000-000000000031',did='00000000-0000-4000-8000-000000000061';
let account=uid,claim,completed=null,failFinalize=false,callback=null;
const supabase={auth:{getUser:async()=>({data:{user:account?{id:account}:null},error:null}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe:()=>{callback=null;}}}};}},rpc:async(name,args)=>{
 assert.equal(account,uid);assert.equal(require('dexie').default.currentTransaction,null);
 if(name==='vault_macro02_recovery_claim_r3'){assert.equal(args.p_epoch,epoch);assert.equal(args.p_operation_id,operationId);return {data:structuredClone(claim),error:null};}
 if(name==='vault_macro02_recovery_complete_r3'){if(failFinalize)return {data:null,error:{message:'network'}};const r={...args.p_receipt,format:'macro02-recovery-completion-r3'};delete r.added;if(completed)assert.deepEqual(r,completed);completed=r;return {data:r,error:null};}
 throw Error('Unexpected RPC');
}};
function load(rel){const f=path.resolve(root,rel);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);m.paths=Module._nodeModulePaths(path.dirname(f));cache.set(f,m);m.require=n=>{
 if(n==='@/lib/supabase/storage')return {deleteFile:async()=>{throw Error('UNEXPECTED_EXTERNAL_STORAGE');}};
 if(n==='@/lib/supabase/client')return {supabase};
 if(n.startsWith('@/')||n.startsWith('.')){const p=n.startsWith('@/')?path.resolve(root,n.slice(2)):path.resolve(path.dirname(f),n);for(const target of [p,p+'.ts',path.join(p,'index.ts')])if(fs.existsSync(target)&&fs.statSync(target).isFile())return load(target);throw Error('IMPORT_NOT_FOUND:'+n);}
 return require(n);
};m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);return m.exports;}
(async()=>{
 const {db}=load('lib/db/index.ts'),{CUTOVER_TABLES}=load('lib/dose-premium/cutover-recovery.ts'),{MACRO02_R3_REMOTE_COLUMNS}=load('lib/dose-premium/cutover-storage-codec.ts'),{exportAuthenticatedMacro02RecoveryImage,restoreAuthenticatedMacro02RecoveryImage}=load('lib/sync/macro02-operational-recovery.ts');
 const full=(t,r)=>({...Object.fromEntries(MACRO02_R3_REMOTE_COLUMNS[t].split(',').map(k=>[k,null])),...r});
 const p=full('persons',{id:pid,user_id:uid,is_default:true,name:'Synthetic'}),m=full('medicamentos',{id:mid,user_id:uid,person_id:pid,nome:'Synthetic',dosagem:'1 mg',estoque_quantidade:9,tratamento_ids:[],lembrete_receita_modo:'none',macro02_stock_managed:false}),d=full('doseLogs',{id:did,user_id:uid,person_id:pid,medicamento_id:mid,quantidade:1,data:'2026-11-26',horario:'08:00'});
 const fence_id=`m02-cutover-r3:${uid}:${epoch}`,rows={...Object.fromEntries(CUTOVER_TABLES.map(t=>[t,[]])),persons:[p],medicamentos:[m],doseLogs:[d]};
 claim={format:'macro02-recovery-claim-r3',account_id:uid,epoch,operation_id:operationId,state:'held',fence_id,server_snapshot_sha256:'b'.repeat(64),snapshot:{format:'macro02-raw-pg-r3',account_id:uid,epoch,fence_id,complete:true,rows,allows_activation:false,allows_replay:false},allows_activation:false,allows_replay:false};
 await db.open();try{
 const {is_default,...person}=p;await db.persons.add({...person,isDefault:is_default,synced:true});await db.persons.add({id:foreign,user_id:foreign,name:'Other synthetic account'});await db.medicamentos.add({...m,synced:true});const exact={...d,synced:true,observacoes:undefined};delete exact.motivo;await db.doseLogs.add(exact);
 const backup=await exportAuthenticatedMacro02RecoveryImage(uid);assert.equal(backup.sha256,crypto.createHash('sha256').update(backup.bytes).digest('hex'));const input={uid,epoch,operationId,backupText:backup.bytes,expectedSourceSha256:backup.sha256};await db.doseLogs.delete(did);
 await assert.rejects(restoreAuthenticatedMacro02RecoveryImage({...input,expectedSourceSha256:'a'.repeat(64)}),/CHECKSUM/);assert.equal(await db.doseLogs.count(),0);
 account=foreign;await assert.rejects(restoreAuthenticatedMacro02RecoveryImage(input),/ACCOUNT_UNCONFIRMED/);account=uid;
 failFinalize=true;await assert.rejects(restoreAuthenticatedMacro02RecoveryImage(input),/REMOTE_UNAVAILABLE/);assert.equal(await db.doseLogs.count(),1);assert.equal((await db.medicamentos.get(mid)).estoque_quantidade,9);assert.equal(await db.syncQueue.count(),0);
 db.close();await db.open();failFinalize=false;const result=await restoreAuthenticatedMacro02RecoveryImage(input);assert.equal(result.receipt.added,0);assert.equal(result.allowsActivation,false);assert.equal(result.allowsAck,false);assert.equal(await db.doseLogs.count(),1);assert.equal(await db.persons.count(),2);assert.equal(await db.syncQueue.count(),0);const restored=await db.doseLogs.get(did);assert(Object.hasOwn(restored,'observacoes'));assert(!Object.hasOwn(restored,'motivo'));
 assert.equal((await exportAuthenticatedMacro02RecoveryImage(uid)).sha256,backup.sha256);assert.equal(callback,null);
 console.log('MACRO02_R3_OPERATIONAL_DEXIE_FIXTURE_PASS');
 }finally{db.close();await db.delete();}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
