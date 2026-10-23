#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('fake-indexeddb/auto');const Dexie=require('dexie').default;
const db=new Dexie('vault-v230-planned-course-isolated');
db.version(1).stores({medicamentos:'id,person_id,user_id',doseLogs:'id,medicamento_id,person_id,data,horario',syncQueue:'id'});
let failQueue=false;const cache=new Map();
const dateOffset=days=>{const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;
 const m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,m);
 m.require=name=>{
  if(name==='@/lib/db')return {db};
  if(name==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:{id:'u'}},error:null})};
  if(name==='@/lib/supabase/client')return {supabase:{}};
  if(name==='@/lib/sync/enfileirarOperacao')return {enfileirarOperacao:async(table,action,row)=>{if(failQueue)throw Error('queue unavailable');await db.syncQueue.add({id:crypto.randomUUID(),table,action,row})}};
  return name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);
 };
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;
}
(async()=>{
 const repo=load('lib/repositories/doseLogs.ts').doseLogsRepository;
 const med={id:'m',person_id:'p',user_id:'u',nome:'Tratamento de teste',status:'ativo',tipo_uso:'eventual',estoque_quantidade:12,estoque_unidade_medida:'comprimido',estoque_unidade_por_dose:1};
 await db.medicamentos.add(med);
 const course={start:dateOffset(1),days:3,times:['08:00','20:00']};
 assert.deepEqual(await repo.replaceTemporaryCourse({personId:'p',medicamentoId:'m',course}),{scheduled:6,cancelled:0});
 assert.equal(await db.doseLogs.count(),6);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,12);
 assert.deepEqual(await repo.replaceTemporaryCourse({personId:'p',medicamentoId:'m',course}),{scheduled:0,cancelled:0});
 const existing=(await db.doseLogs.toArray()).find(row=>row.data===course.start&&row.horario==='08:00');
 await db.doseLogs.update(existing.id,{tomado_em:new Date().toISOString()});
 const changed={...course,days:2,times:['08:00']};
 assert.deepEqual(await repo.replaceTemporaryCourse({personId:'p',medicamentoId:'m',course:changed}),{scheduled:0,cancelled:4});
 assert.equal(await db.doseLogs.count(),2,'confirmed and one future slot remain');
 const before=await db.doseLogs.toArray(),beforeQueue=await db.syncQueue.count();
 failQueue=true;await assert.rejects(repo.replaceTemporaryCourse({personId:'p',medicamentoId:'m',course:{...changed,days:3}}),/queue unavailable/);
 assert.deepEqual(await db.doseLogs.toArray(),before,'transaction rollback preserves plan');assert.equal(await db.syncQueue.count(),beforeQueue);
 failQueue=false;await assert.rejects(repo.replaceTemporaryCourse({personId:'other',medicamentoId:'m',course:changed}),/pessoa|Medicamento/i);
 const summary=load('lib/health-intelligence/temporary-course-insights.ts').temporaryCourseSummaries({personId:'p',userId:'u',hoje:dateOffset(0),medicamentos:[med],doseLogs:before});
 assert.equal(summary.length,1,'current open course is shown once; settled historical course remains stored without an open alert');
 assert.equal(summary.find(row=>row.pending)?.pending,1);
 assert.deepEqual(load('lib/health-intelligence/temporary-course-insights.ts').temporaryCourseSummaries({personId:'p',userId:'other',hoje:dateOffset(0),medicamentos:[med],doseLogs:before}),[]);
 const home=fs.readFileSync('app/page.tsx','utf8');assert(home.includes('log.data < ontem'));assert(home.includes('doseLogsRepository.setStatus({ personId: activePersonId'));
 const avatar=fs.readFileSync('components/saude/HealthAvatar3D.tsx','utf8');assert(!avatar.includes('positions.setX('));
 console.log('V230: real IndexedDB planning, idempotence, stock isolation, preserve taken, cancel future, queue rollback, owner scope, historical Home and WebGL geometry OK');
})().finally(()=>db.delete()).catch(e=>{console.error(e);process.exitCode=1});
