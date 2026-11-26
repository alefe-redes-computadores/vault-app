'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
module.exports=async function(){
 require('fake-indexeddb/auto');const Dexie=require('dexie').default;const db=new Dexie('macro02-dormant-real-'+crypto.randomUUID());db.version(1).stores({medicamentos:'id,person_id,user_id',doseLogs:'id,medicamento_id,person_id,data,horario',syncQueue:'id,chave'});
 global.window=new EventTarget();global.document=Object.assign(new EventTarget(),{visibilityState:'visible'});
 let owner='u',failQueue=false,rotate=false,rpcCalls=0;const events=[];const supabase={auth:{onAuthStateChange:fn=>{events.push(fn);return {data:{subscription:{unsubscribe(){}}}};}},rpc:async()=>{rpcCalls++;throw Error('offline');}};
 const root=path.resolve(__dirname,'../..'),cache=new Map();
 function load(rel){const f=path.resolve(root,rel);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);m.paths=Module._nodeModulePaths(path.dirname(f));cache.set(f,m);m.require=n=>{
  if(n==='@/lib/db')return {db};if(n==='@/lib/supabase/client')return {supabase};if(n==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:owner?{id:owner}:null},error:null})};
  if(n==='@/lib/sync/enfileirarOperacao'){const real=load('lib/sync/enfileirarOperacao.ts');return {...real,enfileirarOperacao:async(...args)=>{if(failQueue)throw Error('queue failed');await real.enfileirarOperacao(...args);if(rotate){rotate=false;owner='other';events.forEach(fn=>fn('SIGNED_OUT',null));}}};}
  return n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.resolve(path.dirname(f),n)+'.ts'):require(n);
 };m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);return m.exports;}
 await db.open();try{
  const repo=load('lib/repositories/doseLogs.ts').doseLogsRepository;const med={id:'m',user_id:'u',person_id:'p',nome:'Synthetic',status:'ativo',tipo_uso:'continuo',estoque_quantidade:2,estoque_unidade_medida:'comprimido',estoque_unidade_por_dose:1};await db.medicamentos.add(med);
  const input={personId:'p',medicamentoId:'m',data:'2026-11-25',horario:'10:00',status:'taken',quantidade:1,tomadoEm:'2026-11-25T10:00:00Z',requireRegisteredStock:true};
  const id=await repo.setStatus(input);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,1);assert.equal(await db.syncQueue.count(),2);assert(!(await db.syncQueue.toArray()).some(q=>q.payload.macro02_atomic!==undefined));assert.equal(rpcCalls,0);console.log('PASS actual dormant writer local fact and stock with no RPC');
  assert.equal(await repo.setStatus(input),id);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,1);console.log('PASS dormant repeat confirmation does not debit twice');
  const race=await Promise.allSettled([repo.setStatus({...input,horario:'11:00'}),repo.setStatus({...input,horario:'12:00'})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,0);console.log('PASS actual Dexie race preserves registered balance');
  await repo.setStatus({...input,status:'clear'});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,1);assert.equal(await db.doseLogs.get(id),undefined);console.log('PASS dormant explicit reversal only once');
  const before=await db.doseLogs.count();failQueue=true;await assert.rejects(repo.setStatus({...input,horario:'13:00'}),/queue failed/);failQueue=false;assert.equal(await db.doseLogs.count(),before);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,1);console.log('PASS queue failure rolls back actual legacy fact and stock');
  rotate=true;await assert.rejects(repo.setStatus({...input,horario:'14:00'}),/AUTHORITY_CHANGED/);assert.equal(await db.doseLogs.count(),before);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,1);owner='u';console.log('PASS account switch cancels actual legacy transaction');
  await assert.rejects(repo.setStatus({...input,horario:'15:00',unit:{unidade_dose:'tablet',unidade_dose_rotulo:null,fonte_unidade:'declared'}}),/unidade Premium/);assert.equal(await db.doseLogs.count(),before);console.log('PASS explicit Premium unit never silently discarded');
  await db.medicamentos.update('m',{macro02_stock_managed:true});await assert.rejects(repo.setStatus({...input,horario:'15:30'}),/Evidência Premium/);assert.equal(await db.doseLogs.count(),before);await db.medicamentos.update('m',{macro02_stock_managed:false});console.log('PASS managed marker blocks legacy writer even without cycle');
  const stockQueue=await db.syncQueue.where('chave').equals('medicamentos:m').first();await db.syncQueue.update(stockQueue.id,{payload:{...stockQueue.payload,user_id:'other'}});await assert.rejects(repo.setStatus({...input,horario:'15:45'}),/identidade conflitante/);assert.equal(await db.doseLogs.count(),before);assert.equal((await db.syncQueue.get(stockQueue.id)).payload.user_id,'other');await db.syncQueue.update(stockQueue.id,{payload:stockQueue.payload});console.log('PASS conflicting foreign outbox key never merged or overwritten');
  // Persist a synthetic historical planned row, then exercise the actual setStatus transaction.
  const plannedMed={...med,id:'m-planned',estoque_quantidade:2};await db.medicamentos.add(plannedMed);
  const planned={id:'planned-dexie',user_id:'u',person_id:'p',medicamento_id:plannedMed.id,data:input.data,horario:'16:30',dose_kind:'planned',quantidade:1,created_at:'2026-11-24T10:00:00Z',synced:true};
  await db.doseLogs.add(planned);await db.doseLogs.add({...planned,id:'planned-ignored-dexie',horario:'17:00'});
  const planInput={...input,medicamentoId:plannedMed.id,horario:planned.horario,tomadoEm:'2026-11-25T16:30:00Z'};
  assert.equal(await repo.setStatus(planInput),planned.id);assert.equal(await repo.setStatus(planInput),planned.id);
  assert.equal(await repo.setStatus({...planInput,horario:'17:00',status:'ignored',motivo:'nao_realizada'}),'planned-ignored-dexie');
  const saved=await db.doseLogs.get(planned.id),ignored=await db.doseLogs.get('planned-ignored-dexie');
  assert.equal(saved.dose_kind,'planned');assert.equal(ignored.dose_kind,'planned');assert.equal(saved.created_at,planned.created_at);assert.equal(saved.quantidade,planned.quantidade);assert.equal((await db.medicamentos.get(plannedMed.id)).estoque_quantidade,1);
  const q=await db.syncQueue.where('chave').equals('doseLogs:'+planned.id).first();assert.equal(q.payload.dose_kind,'planned');assert.equal(q.payload.id,planned.id);
  const untouched=JSON.stringify([await db.doseLogs.toArray(),await db.medicamentos.toArray(),await db.syncQueue.toArray()]);
  const projection=load('lib/a10/longitudinal.ts').projectLongitudinalA10({medicamentos:[plannedMed],doseLogs:[saved,ignored]},'u','p',false,'America/Sao_Paulo').facts;
  assert.equal(projection.find(x=>x.id===planned.id).status,'Tomada registrada');assert.equal(projection.find(x=>x.id===ignored.id).status,'Ignorada — informada');assert(projection.every(x=>x.dateKind==='factual'));
  const h=load('lib/medication-dose-history.ts').buildMedicationDoseHistoryMonth({medication:plannedMed,logs:[saved,ignored],monthKey:'2026-11',today:'2026-11-26'});assert.equal(h.days.flatMap(x=>x.events).find(x=>x.id===planned.id).kind,'scheduled_taken');
  const mm=load('lib/health-intelligence/dose-month-metrics.ts').buildDoseMonthMetrics({logs:[saved,ignored],personId:'p',userId:'u',today:'2026-11-26'});assert.equal(mm.total.taken,1);assert.equal(mm.total.ignored,1);
  assert.equal(JSON.stringify([await db.doseLogs.toArray(),await db.medicamentos.toArray(),await db.syncQueue.toArray()]),untouched);assert.equal(rpcCalls,0);
  console.log('MACRO02_PLANNED_WRITER_PROJECTION_OK');
  const beforeAmbiguous=await db.doseLogs.count();
  await db.syncQueue.add({id:'ambiguous',chave:'doseLogs:unknown',table:'doseLogs',operation:'add',payload:{id:'unknown'}});await assert.rejects(repo.setStatus({...input,horario:'16:00'}),/PENDING_CONFLICT/);assert.equal(await db.doseLogs.count(),beforeAmbiguous);assert.equal(rpcCalls,0);console.log('PASS ambiguous clinical queue retains all evidence without RPC');
 }finally{db.close();await db.delete();delete global.window;delete global.document;}
};
