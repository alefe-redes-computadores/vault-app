#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), Module=require('node:module'), path=require('node:path'), ts=require('typescript');
require('fake-indexeddb/auto');
const Dexie=require('dexie').default;
const db=new Dexie('vault-m74-isolated');
db.version(1).stores({persons:'id,user_id',health_reminders:'id,person_id,user_id',syncQueue:'id',health_connect_imports:'id',documents:'id'});
let failAt=0, writes=0, currentUser='u1';
const cache=new Map();
function load(file){const name=path.resolve(file);if(cache.has(name))return cache.get(name).exports;const m=new Module(name,module);m.paths=Module._nodeModulePaths(path.dirname(name));cache.set(name,m);
m.require=id=>{if(id==='@/lib/db')return {db};if(id==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:{id:currentUser}},error:null})};if(id==='@/lib/supabase/client')return {supabase:{}};if(id==='@/lib/sync/enfileirarOperacao')return {enfileirarOperacao:async(_table,_op,row)=>{if(++writes===failAt)throw Error('queue failure');await db.syncQueue.add({id:row.id});},solicitarProcessamentoSync:()=>{}};if(id.startsWith('@/'))return load(id.slice(2)+'.ts');return require(id)};
m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,name);return m.exports;}
(async()=>{
const {clearGuardedLocalData}=load('lib/sync/guarded-local-clear.ts');
const clear=()=>Promise.all([db.persons.clear(),db.health_reminders.clear(),db.syncQueue.clear(),db.documents.clear()]).then(()=>{});
await db.persons.add({id:'p',user_id:'u1'});await db.documents.add({id:'doc'});await db.health_connect_imports.add({id:'ledger'});
await assert.rejects(clearGuardedLocalData(db,clear),/áreas que precisam de revisão/);assert.equal(await db.documents.count(),1);assert.equal(await db.health_connect_imports.count(),1);
await db.health_connect_imports.clear();await db.syncQueue.add({id:'queued'});await assert.rejects(clearGuardedLocalData(db,clear),/aguardando sincronização/);assert.equal(await db.documents.count(),1);await db.syncQueue.clear();
await assert.rejects(clearGuardedLocalData(db,async()=>{await db.documents.clear();throw Error('failure');}),/failure/);assert.equal(await db.documents.count(),1);
const repo=load('lib/repositories/healthReminders.ts').healthRemindersRepository;
const row=time=>({person_id:'p',title:'Água',target_type:'health_record:agua',target_route:'/saude/hidratacao',time,frequency:'daily',weekdays:[],status:'active'});
const input=[row('09:00'),row('12:00'),row('15:00')];writes=0;failAt=2;
await assert.rejects(repo.createMany(input),/queue failure/);assert.equal(await db.health_reminders.count(),0);assert.equal(await db.syncQueue.count(),0);
failAt=0;writes=0;await repo.createMany(input);assert.equal(await db.health_reminders.count(),3);assert.equal(await db.syncQueue.count(),3);
await db.health_reminders.add({id:'foreign',person_id:'p',user_id:'u2',time:'13:00'});
assert.equal((await repo.getAll('p')).length,3);currentUser='u2';await assert.rejects(repo.getAll('p'),/não pertence/);currentUser='u1';
const search=load('lib/health-intelligence/vault-brain-commands.ts').searchVaultBrainCommands;
const context={userId:'u1',personId:'p',medications:[],documents:[],treatments:[],appointments:[],exams:[],renewals:[],credentials:[
{id:'mine',user_id:'u1',person_id:'p',title:'Alvorada',category:'email',password_encrypted:'segredo_unico'},
{id:'foreign_user',user_id:'u2',person_id:'p',title:'Alvorada',category:'email'},
{id:'foreign_person',user_id:'u1',person_id:'p2',title:'Alvorada',category:'email'}]};
const results=search('Alvorada',context).filter(x=>x.kind==='credential');assert.equal(results.length,1);assert.match(results[0].href,/mine/);assert(!JSON.stringify(results).includes('segredo_unico'));assert.equal(search('Alvorada',{...context,userId:'u2'}).filter(x=>x.kind==='credential').length,1);
await db.syncQueue.clear();await clearGuardedLocalData(db,clear);assert.equal(await db.persons.count(),0);assert.equal(await db.documents.count(),0);assert.equal(await db.health_reminders.count(),0);
console.log('M74: IndexedDB real isolado: fila, tabelas não revisadas, rollback de limpeza, lote e isolamento OK');
})().finally(()=>db.delete()).catch(error=>{console.error(error);process.exitCode=1});
