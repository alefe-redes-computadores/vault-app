'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
require('fake-indexeddb/auto');
if(typeof global.CustomEvent==='undefined')global.CustomEvent=class CustomEvent extends Event{constructor(t,o){super(t);this.detail=o?.detail;}};
const root=path.resolve(__dirname,'../..'),cache=new Map();
function load(rel){const f=path.resolve(root,rel);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);m.paths=Module._nodeModulePaths(path.dirname(f));cache.set(f,m);m.require=n=>{
 if(n==='@/lib/supabase/storage')return {deleteFile:async()=>{throw Error('UNEXPECTED_EXTERNAL_STORAGE');}};
 if(n.startsWith('@/')||n.startsWith('.')){const p=n.startsWith('@/')?path.resolve(root,n.slice(2)):path.resolve(path.dirname(f),n);for(const target of [p,p+'.ts',path.join(p,'index.ts')])if(fs.existsSync(target)&&fs.statSync(target).isFile())return load(target);throw Error('IMPORT_NOT_FOUND:'+n);}
 return require(n);
};m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);return m.exports;}
(async()=>{
 const {db}=load('lib/db/index.ts'),{CUTOVER_TABLES,cutoverLocalIdentity}=load('lib/dose-premium/cutover-recovery.ts'),{readMacro02CutoverLocal}=load('lib/sync/macro02-cutover-local.ts'),{rehearseMacro02AddOnlyRecovery}=load('lib/dose-premium/cutover-recovery-transaction.ts');
 assert.equal(db.name,'vault-db');await db.open();try{
 assert.equal(db.verno,59);for(const name of [...CUTOVER_TABLES,'syncQueue'])assert.equal(db.table(name).schema.primKey.keyPath,'id');
 const uid='fixture-owner',person='fixture-person',mid='fixture-med',did='fixture-dose';
 await db.persons.add({id:person,user_id:uid,name:'Synthetic'});await db.medicamentos.add({id:mid,user_id:uid,person_id:person,nome:'Synthetic',estoque_quantidade:9});
 await db.persons.add({id:'foreign-person',user_id:'foreign',name:'Synthetic other'});
 const before=await readMacro02CutoverLocal(uid,()=>{}),backup=structuredClone(before);backup.rows.doseLogs.push({id:did,user_id:uid,person_id:person,medicamento_id:mid,data:'2026-11-25',horario:'10:00',quantidade:1,dose_kind:'planned',tomado_em:'2026-11-25T10:00:00-03:00',synced:true});
 const expected={account_id:uid,fence_id:'fixture-fence',epoch:'fixture-epoch'},wire={version:1,...expected,complete:true,rows:structuredClone(backup.rows)};
 const names=[...CUTOVER_TABLES,'syncQueue'];let count=0;const host=(guard=()=>{})=>({transaction:fn=>db.transaction('rw',names.map(n=>db.table(n)),fn),readLocal:()=>readMacro02CutoverLocal(uid,guard),add:async(t,r)=>{await db.table(t).add(r);},assertFenceAndSession:guard});
 // Aborts after insert when local scope invalidates, against the actual schema.
 await assert.rejects(rehearseMacro02AddOnlyRecovery(host(()=>{if(++count===10)throw Error('fixture-session-lost');}),{before,backup,wire,expected}),/fixture-session-lost/);assert.equal(await db.doseLogs.count(),0);
 const result=await rehearseMacro02AddOnlyRecovery(host(),{before,backup,wire,expected});assert.equal(result.added,1);assert.equal(result.allowsActivation,false);assert.equal(cutoverLocalIdentity(await readMacro02CutoverLocal(uid,()=>{})),cutoverLocalIdentity(backup));assert.equal((await db.medicamentos.get(mid)).estoque_quantidade,9);assert.equal(await db.syncQueue.count(),0);assert.equal(await db.persons.count(),2);
 db.close();await db.open();assert.equal(cutoverLocalIdentity(await readMacro02CutoverLocal(uid,()=>{})),cutoverLocalIdentity(backup));
 console.log('MACRO02_CUTOVER_VAULT_SCHEMA_DEXIE_LAB_PASS');
 }finally{db.close();await db.delete();}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
