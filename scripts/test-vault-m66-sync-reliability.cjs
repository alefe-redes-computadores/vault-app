#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), path=require('node:path'), Module=require('node:module'),assert=require('node:assert/strict'),ts=require('typescript');
const source=p=>fs.readFileSync(p,'utf8');let count=0;
const check=(yes,label)=>{assert.ok(yes,'M66: '+label);count++;};
function load(p,imports={}){
 const s=source(p),ast=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'TS parsing '+p);
 const js=ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const mod=new Module(path.resolve(p),module);mod.require=id=>Object.hasOwn(imports,id)?imports[id]:require(id);mod._compile(js,path.resolve(p));return mod.exports;
}
const files=['lib/sync/recent-dose-refresh.ts','lib/sync/recent-dose-merge.ts','lib/sync/recent-dose-status.ts','lib/dose-notification-pipeline.ts','components/DoseNotificationReconciler.tsx','components/SyncDoseRefreshSummary.tsx','app/diagnostico/page.tsx','app/recuperacao/page.tsx'];
for(const p of files){const ast=ts.createSourceFile(p,source(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(ast.parseDiagnostics.length===0,'parsing '+p);}
const merge=load('lib/sync/recent-dose-merge.ts');
const base={user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-11-04',horario:'07:00',quantidade:1,updated_at:'2026-11-04T12:00:00.000Z'};
const med=(id,more={})=>({id,...base,...more});
check(merge.isSameRecentCloudDose({...med('a'),synced:true},med('a')),'sem regravar dose identica');
check(!merge.isSameRecentCloudDose({...med('a'),synced:false},med('a')),'dose local pendente permanece diferente');
check(!merge.isSameRecentCloudDose({...med('a'),synced:true},med('a',{quantidade:2})),'mudanca de dose reconhecida');
check(!merge.isSameRecentCloudDose({...med('a'),synced:true},med('a',{person_id:'outro'})),'conta/pessoa nao se misturam');
check(!merge.isSameRecentCloudDose({...med('a'),synced:true,extra:1},med('a')),'campos locais extras provocam comparacao conservadora');
const status=load('lib/sync/recent-dose-status.ts',{react:{useSyncExternalStore:(_sub,get)=>get()}});
status.noteRecentDoseRefreshStart('u');status.noteRecentDoseRefreshComplete('outro',{consulted:5,imported:5,unchanged:0,protectedLocal:0});
check(status.useRecentDoseRefreshStatus().phase==='checking','resultado tardio de outra conta ignorado');
status.noteRecentDoseRefreshComplete('u',{consulted:5,imported:1,unchanged:1,protectedLocal:3});
check(status.useRecentDoseRefreshStatus().imported===1&&status.useRecentDoseRefreshStatus().protectedLocal===3,'conferencia metadados exatos');
status.noteRecentDoseRefreshStart('u2');check(status.useRecentDoseRefreshStatus().imported===0,'contagem anterior nao atravessa conta');
status.noteRecentDoseRefreshError('u2');check(status.useRecentDoseRefreshStatus().phase==='error','erro nao vira sucesso');
(async()=>{
 const local=new Map([['same',{...med('same'),synced:true}],['unsent',{...med('unsent',{quantidade:8}),synced:false}],['newer',{...med('newer',{updated_at:'2026-11-04T13:00:00.000Z',quantidade:9}),synced:true}]]);
 const cloud=[med('same'),med('unsent'),med('queued'),med('newer'),med('added')],queue=[{table:'doseLogs',payload:{id:'queued'}}];
 let bulkWrites=0,dbCalls=0,queryMode='ok';
 const db={doseLogs:{bulkGet:async ids=>ids.map(id=>local.get(id)),bulkPut:async rows=>{bulkWrites++;rows.forEach(row=>local.set(row.id,row));}},syncQueue:{filter:()=>({toArray:async()=>queue})},transaction:async(_mode,_dose,_queue,fn)=>fn()};
 const request={select(){return this},eq(){return this},gte(){return this},order(){return this},range(){dbCalls++;return Promise.resolve(queryMode==='null'?{data:null,error:null}:queryMode==='failure'?{data:null,error:{message:'timeout'}}:{data:cloud,error:null});}};
 const refresh=load('lib/sync/recent-dose-refresh.ts',{'@/lib/db':{db},'@/lib/supabase/client':{supabase:{from:()=>request}},'@/lib/sync/recent-dose-merge':merge,'@/lib/sync/recent-dose-status':status});
 check(await refresh.refreshRecentCloudDoses('u')===1,'apenas nova dose remota atualiza banco');
 check(bulkWrites===1&&local.get('unsent').quantidade===8&&local.get('newer').quantidade===9,'fila e copia local recente preservadas');
 check(status.useRecentDoseRefreshStatus().protectedLocal===3&&status.useRecentDoseRefreshStatus().unchanged===1,'classificacao preservada e idempotencia corretas');
 check(await refresh.refreshRecentCloudDoses('u')===0&&bulkWrites===1&&dbCalls===2,'refresh repetido nao ocasiona write amplification');
 queryMode='null';await assert.rejects(refresh.refreshRecentCloudDoses('u'),/página de doses/);
 check(bulkWrites===1&&status.useRecentDoseRefreshStatus().phase==='error','pagina nula bloqueia falso sucesso sem gravacao');
 queryMode='failure';await assert.rejects(refresh.refreshRecentCloudDoses('u'),/timeout/);
 check(bulkWrites===1,'erro remoto impede gravacao local');
 const {createDoseNotificationPipeline}=load('lib/dose-notification-pipeline.ts');
 let release;const hold=new Promise(r=>release=r),events=[];
 const pipeline=createDoseNotificationPipeline(async()=>{events.push('scheduled');await hold;},async()=>{events.push('overdue')});
 const snap={userId:'u',personId:'p',refreshKey:0,medicamentos:[],logs:[]};
 const first=pipeline.enqueue(snap);check(first===pipeline.enqueue({...snap}),'duplicatas durante trabalho reutilizam promise');
 release();await first;check(events.join(',')==='scheduled,overdue','agenda e atraso aplicados uma unica vez');
 check((await pipeline.enqueue(snap)).skipped&&events.length===2,'snapshot igual nao rearma notificacao');
 await pipeline.enqueue({...snap,refreshKey:1});check(events.length===4,'mudanca de preferencias sempre rearma');
 await pipeline.enqueue({...snap,refreshKey:1,logs:[med('new')]});check(events.length===6,'nova dose exige nova agenda');
 pipeline.invalidate();await pipeline.enqueue({...snap,refreshKey:1,logs:[med('new')]});check(events.length===8,'troca de dono e desmontagem invalidam cache');
 const turns=[];const reorder=createDoseNotificationPipeline(async x=>{turns.push(x.refreshKey ?? 0);},async()=>{});
 await reorder.enqueue(snap);
 const newer=reorder.enqueue({...snap,refreshKey:20});
 const back=reorder.enqueue(snap);
 await Promise.all([newer,back]);
 check(turns.join(',')==='0,0','retorno ao snapshot anterior durante trabalho novo nao perde a ultima alteracao');
 let attempts=0;
 const failed=createDoseNotificationPipeline(async()=>{attempts++;throw Error('native');},async()=>{});
 await assert.rejects(failed.enqueue(snap));await assert.rejects(failed.enqueue(snap));check(attempts===2,'falha nao bloqueia tentativa futura');
 let unlock;const wait=new Promise(r=>unlock=r),order=[];
 const crossing=createDoseNotificationPipeline(async x=>{order.push('scheduled '+x.personId);if(x.personId==='old')await wait;},async x=>order.push('overdue '+x.personId));
 const old=crossing.enqueue({personId:'old',medicamentos:[],logs:[]});await Promise.resolve();
 const fresh=crossing.enqueue({personId:'new',medicamentos:[],logs:[]});unlock();await Promise.all([old,fresh]);
 check(!order.includes('overdue old')&&order.includes('overdue new'),'reconciliacao obsoleta nao agenda atrasos para pessoa anterior');
 const rec=source('components/DoseNotificationReconciler.tsx');
 check(rec.includes('refreshKey: preferenceRevision')&&rec.includes('userId: user.id'),'preferencias e conta participam da chave');
 check(rec.includes('}, [activePersonId, user?.id]);')&&rec.includes('  }, [activePersonId, user?.id, snapshot, preferenceRevision]);'),'invalida somente na troca de conta/desmontagem');
 const diagnostic=source('app/diagnostico/page.tsx'),recovery=source('app/recuperacao/page.tsx'),widget=source('components/SyncDoseRefreshSummary.tsx');
 check(diagnostic.includes('<SyncDoseRefreshSummary userId={user?.id} />')&&recovery.includes('<SyncDoseRefreshSummary userId={user?.id} />'),'diagnostico e recuperacao apresentam a mesma fonte');
 check(widget.includes('status.userId === userId')&&widget.includes('não confirmação de tomada')&&!/\bdb\.|supabase/.test(widget),'estado por conta sem gravacao clinica');
 const ref=source('lib/sync/recent-dose-refresh.ts');
 for(const s of ['queuedIds.has(remote.id!)','local?.synced === false','localTime > remoteTime','.gte("data", earliest)','.order("id", { ascending: true })','.range(offset, offset + pageSize - 1)'])check(ref.includes(s),'V234 conservado: '+s);
 const v91=source('scripts/test-v91-sync-pipeline-performance-contract.mjs');
 check(v91.includes('liveQueryCalls === 1') && v91.includes('ownerScopedReads === 2') &&
   v91.includes('db.transaction(\"r\",[db.medicamentos,db.doseLogs]') &&
   rec.includes('db.transaction(\"r\",[db.medicamentos,db.doseLogs]') &&
   (rec.match(/useLiveQuery\(/g)||[]).length === 1,
   'V91 atualizado para assinatura única transacional, mantendo leitura das duas tabelas');
 const gate=source('scripts/test-v63-release-gate.mjs');
 for(const s of ['test-vault-m66-sync-reliability.cjs','test-vault-m65-care-360.cjs','test-vault-m52-sync-resilience.cjs','test-v310-sync-offline-continuity.cjs','test-v228-stability.cjs'])check(gate.includes(s),'gate conserva '+s);
 console.log(`VAULT M66: ${count} verificacoes aprovadas`);
})().catch(e=>{console.error(e);process.exitCode=1});
