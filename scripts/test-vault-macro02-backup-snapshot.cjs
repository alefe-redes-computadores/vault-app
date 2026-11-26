#!/usr/bin/env node
'use strict';
// Executes the real export module and canonical backup validator. The default
// V63 mode requires Dexie + fake-indexeddb; hermetic-only is local diagnostics,
// not a substitute for the IndexedDB contract or an empty-device restore test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const names=['persons','documents','medicamentos','renovacoes','retiradas','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','medicos','farmacias','hospitais','locais','exames','consultas','cirurgias','tratamentos','cids','doseLogs','credentials','bankCards','vaults','instituicoes','anexos_clinicos','settings','registros_saude','health_reminders','health_goals','health_profiles','health_devices','versiculos','medicamento_tratamentos','exame_tratamentos','vaultMembers','syncQueue'];
const own='account-a',foreign='account-b',person='person-a';
const rows={persons:[{id:person,user_id:own},{id:'person-b',user_id:foreign}],medicamentos:[{id:'med-a',user_id:own,person_id:person},{id:'med-b',user_id:foreign,person_id:'person-b'}],tratamentos:[{id:'t-a',user_id:own}],medicamento_tratamentos:[{id:'link-a',medicamento_id:'med-a',tratamento_id:'t-a'},{id:'link-b',medicamento_id:'med-b',tratamento_id:'t-a'}],documents:[{id:'doc-a',user_id:own,text:'initial'}],doseLogs:[{id:'dose-a',user_id:own,person_id:person,medicamento_id:'med-a'}],vital_audit:[{id:'v-a',user_id:own,person_id:person},{id:'v-foreign',user_id:own,person_id:'person-b'}]};
function moduleLoader(db){
 const cache=new Map();
 function load(rel){if(cache.has(rel))return cache.get(rel).exports;const filename=path.join(root,rel),m={exports:{}};cache.set(rel,m);const source=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0,rel);const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','require',code)(m,m.exports,id=>{if(id==='@/lib/db')return {db};if(id.startsWith('@/lib/'))return load(id.slice(2)+'.ts');if(id.startsWith('./')||id.startsWith('../'))return load(path.normalize(path.join(path.dirname(rel),id+'.ts')));throw Error('Unexpected dependency '+id);});return m.exports;}
 return {load,exportAllData:load('lib/export.ts').exportAllData,vital:load('lib/vital/model.ts').TABLES};
}
function verifyResult(result){assert.equal(result.version,'3.0');assert.equal(result.user_id,own);assert.deepEqual(result.persons.map(x=>x.id),[person]);assert.deepEqual(result.medicamentos.map(x=>x.id),['med-a']);assert.deepEqual(result.medicamento_tratamentos.map(x=>x.id),['link-a']);assert.deepEqual(result.vital_audit.map(x=>x.id),['v-a']);assert.equal(result.documents[0].text,'initial');assert.equal(result.macro02_recovery.pendingCount,0);}
async function hermetic(){
 let tx=null,reads=[],count=0,fail=null;const data=structuredClone(rows),db={};const loader=moduleLoader(db);const all=[...names,...loader.vital];
 for(const name of all){const table={name,where:key=>({equals:value=>({toArray:()=>read(name,r=>r[key]===value)})}),toArray:()=>read(name,()=>true)};db[name]=table;}
 db.table=name=>db[name];
 async function read(name,filter){assert(tx&&tx.has(name),'read outside consistent transaction: '+name);reads.push(name);if(fail===name)throw Error('simulated read failure');return structuredClone((data[name]??[]).filter(filter));}
 db.transaction=async(mode,tables,run)=>{assert.equal(mode,'r');assert.equal(tx,null);assert.equal(new Set(tables.map(x=>x.name)).size,all.length);tx=new Set(tables.map(x=>x.name));count++;try{return await run();}finally{tx=null;data.documents[0].text='after commit';}};
 verifyResult(JSON.parse(await loader.exportAllData(own)));assert.equal(count,1);assert.deepEqual([...new Set(reads)].sort(),all.sort());console.log('PASS all exported tables, dependencies and queue in one read transaction (double)');
 data.documents[0].text='initial';fail='documents';await assert.rejects(loader.exportAllData(own),/Falha ao exportar dados/);assert.equal(tx,null);console.log('PASS failed dependency aborts export (double)');
 data.documents[0].text='initial';fail='syncQueue';await assert.rejects(loader.exportAllData(own),/Falha ao exportar dados/);assert.equal(tx,null);console.log('PASS failed queue read aborts export (double)');
 await assert.rejects(loader.exportAllData(''),/Usuário inválido/);console.log('PASS empty account rejected');
}
async function indexeddb(){
 require('fake-indexeddb/auto');if(typeof global.CustomEvent==='undefined')global.CustomEvent=class CustomEvent extends Event{constructor(type,options){super(type);this.detail=options?.detail;}};const Dexie=require('dexie').default;const db=new Dexie('macro02-export-'+crypto.randomUUID());const loader=moduleLoader(db),all=[...names,...loader.vital];db.version(1).stores(Object.fromEntries(all.map(n=>[n,'id,user_id,person_id'])));await db.open();try{
 for(const [name,values] of Object.entries(rows))await db.table(name).bulkAdd(values);
 const nativeTx=db.transaction.bind(db);let readCount=0;db.transaction=function(mode,tables,run){if(mode==='r'){readCount++;assert.deepEqual(tables.map(x=>x.name).sort(),all.slice().sort());return nativeTx(mode,tables,async()=>{assert(Dexie.currentTransaction);return run();});}return nativeTx(mode,tables,run);};
 // Concurrent writer must run after snapshot reads, not between the clinical
 // rows and dependency/outbox reads. No write belongs to the exporter itself.
 const snapshot=loader.exportAllData(own);const concurrent=nativeTx('rw',[db.table('documents'),db.table('doseLogs')],async()=>{await db.table('documents').update('doc-a',{text:'after commit'});await db.table('doseLogs').update('dose-a',{quantidade:2});});
 const before=JSON.parse(await snapshot);await concurrent;verifyResult(before);assert.equal(before.dose_logs[0].quantidade,undefined);assert.equal(readCount,1);const after=JSON.parse(await loader.exportAllData(own));assert.equal(after.documents[0].text,'after commit');assert.equal(after.dose_logs[0].quantidade,2);console.log('PASS Dexie snapshot serializes concurrent dependency and dose edits');
 }finally{db.close();await db.delete();}
}
(async()=>{await hermetic();if(process.argv.includes('--hermetic-only')){console.log('MACRO02_BACKUP_SNAPSHOT_HERMETIC_ONLY=4; INDEXEDDB_NOT_RUN');return;}await indexeddb();console.log('MACRO02_BACKUP_SNAPSHOT_GATE_OK');})().catch(e=>{console.error(e);process.exitCode=1;});
