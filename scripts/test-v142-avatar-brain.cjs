const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
require('fake-indexeddb/auto');const Dexie=require('dexie').default;
const db=new Dexie('vault-v142-isolated-doses');db.version(1).stores({medicamentos:'id,person_id,user_id',doseLogs:'id,medicamento_id,person_id,data,horario',syncQueue:'id,chave'});
// Exercise the real repository AND outbox with real Dexie; auth/remote remain doubles.
let failQueue=false;const cache=new Map();
function load(file){const filename=path.resolve(file);if(cache.has(filename))return cache.get(filename).exports;const m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,m);
 m.require=name=>{
 if(name==='@/lib/db')return {db};
 if(name==='@/lib/supabase/local-auth')return {getLocalFirstAuthUser:async()=>({data:{user:{id:'u'}},error:null})};
 if(name==='@/lib/supabase/client')return {supabase:{}};
 // This historical test exercises the Premium writer, with explicit units and
 // stock cycles, not the dormant production release. Only this test loader
 // supplies a synthetic authenticated capability. No production override.
 if(name==='@/lib/sync/macro02-authority')return {prepareMacro02ClinicalWrite:async uid=>{
   const {acceptMacro02Capability,selectMacro02Writer,assertSameMacro02Authority}=load('lib/dose-premium/account-authority.ts');
   const {countMacro02Pending}=load('lib/dose-premium/authority-session.ts');
   const epoch='00000000-0000-4000-8000-000000000142';
   const ctx={accountId:uid,sessionEpoch:crypto.randomUUID(),clientProtocol:2};
   const evidence=acceptMacro02Capability({version:1,account_id:uid,writer:'premium',epoch,fence_id:'synthetic-v142',issued_at_ms:0,expires_at_ms:300000,minimum_protocol:2},ctx,0,0);
   const pending=async()=>countMacro02Pending(await db.syncQueue.toArray(),uid);
   const selected=selectMacro02Writer(ctx,evidence,0,await pending());assert.equal(selected.kind,'allow');assert.equal(selected.writer,'premium');
   return {writer:'premium',epoch,assertCurrent:async()=>assertSameMacro02Authority(selected,ctx,evidence,0,await pending())};
 }};
 if(name==='@/lib/sync/enfileirarOperacao'){const real=load('lib/sync/enfileirarOperacao.ts');return {...real,enfileirarOperacao:async(...args)=>{if(failQueue)throw Error('queue unavailable');return real.enfileirarOperacao(...args);}};}
 return name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);};
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
(async()=>{
 const repo=load('lib/repositories/doseLogs.ts').doseLogsRepository;
 const {declareDoseUnit}=load('lib/dose-premium/historical-unit.ts');const unit=declareDoseUnit('tablet','declared');const cycle=crypto.randomUUID();
 const med={id:'m',person_id:'p',user_id:'u',nome:'Teste',status:'ativo',tipo_uso:'continuo',estoque_quantidade:0,estoque_unidade_medida:'comprimido',estoque_unidade_por_dose:1,estoque_ciclo_id:cycle};await db.medicamentos.add(med);
 const input={personId:'p',medicamentoId:'m',data:'2026-10-14',horario:'10:00',status:'taken',quantidade:1,unit,requireRegisteredStock:true,tomadoEm:'2026-10-14T10:00:00Z'};
 await assert.rejects(repo.setStatus(input),/Estoque registrado insuficiente/);assert.equal(await db.doseLogs.count(),0);assert.equal(await db.syncQueue.count(),0);
 // Unknown stock is not falsely classified as absent.
 await db.medicamentos.update('m',{estoque_quantidade:undefined});await assert.rejects(repo.setStatus(input),/não comparável/);assert.equal(await db.doseLogs.count(),0);await repo.setStatus({...input,requireRegisteredStock:false,adjustStock:false});assert.equal((await db.doseLogs.toArray()).length,1);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,undefined);
 await assert.rejects(repo.setStatus({...input,status:'ignored',onlyIfPending:true,motivo:'sem_estoque'}),/já foi tomada/);
 await repo.setStatus({...input,status:'clear',adjustStock:false});
 // Test fixture acknowledges the previous chain before a new explicit physical count.
 await db.syncQueue.clear();await db.medicamentos.update('m',{estoque_quantidade:1,estoque_ciclo_id:crypto.randomUUID()});
 const race=await Promise.allSettled([repo.setStatus(input),repo.setStatus({...input,horario:'11:00'})]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1,'same inventory must not be spent twice by a bulk request');assert.equal((await db.medicamentos.get('m')).estoque_quantidade,0);
 const log=(await db.doseLogs.toArray()).find(l=>l.tomado_em);await repo.setStatus({...input,horario:log.horario});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,0,'repeat confirmation is idempotent at zero stock');
 await repo.setStatus({...input,horario:log.horario,status:'clear'});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,1,'reversal restores exact historical quantity');
 await db.syncQueue.clear();await db.medicamentos.update('m',{estoque_quantidade:0,estoque_ciclo_id:crypto.randomUUID()});const noTake={...input,status:'ignored',onlyIfPending:true,motivo:'sem_estoque',adjustStock:false,expected:null,requireKnownEmptyStock:true};await repo.setStatus(noTake);await repo.setStatus(noTake);
 const ignored=(await db.doseLogs.toArray()).find(l=>l.horario==='10:00');assert.equal(ignored.motivo,'sem_estoque');assert(!ignored.tomado_em);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,0);
 await assert.rejects(repo.setStatus({...input,personId:'foreign'}),/Medicamento/);
 // Real historical confirmation remains possible, never inferred from balance.
 await repo.setStatus({...input,horario:'12:00',requireRegisteredStock:false});assert.equal((await db.medicamentos.get('m')).estoque_quantidade,-1);
 await db.syncQueue.clear();await db.medicamentos.update('m',{estoque_quantidade:2,estoque_ciclo_id:crypto.randomUUID()});const count=await db.doseLogs.count();failQueue=true;await assert.rejects(repo.setStatus({...input,horario:'13:00'}),/queue unavailable/);assert.equal((await db.medicamentos.get('m')).estoque_quantidade,2);assert.equal(await db.doseLogs.count(),count);failQueue=false;
 const {buildMedicationAvailabilityInsights:brain}=load('lib/health-intelligence/medication-availability-insights.ts');const records=[{id:'a',person_id:'p',user_id:'u',medicamento_id:'m',data:'2026-10-14',horario:'10:00',ignorado_em:'2026-10-14',motivo:'sem_estoque'},{id:'b',person_id:'p',user_id:'other',medicamento_id:'m',data:'2026-10-14',horario:'11:00',ignorado_em:'2026-10-14',motivo:'sem_estoque'}];
 const context={personId:'p',hoje:'2026-10-14',medicamentos:[{...med,estoque_horarios:['10:00','11:00']}],doseLogs:records};const insights=brain(context);assert.equal(insights.length,1);assert.equal(insights[0].amostra,1);assert.match(insights[0].mensagem,/Você confirmou/);assert.equal(insights[0].id,'availability-review-m');assert(!brain({...context,doseLogs:[]}).length);assert(!brain({...context,doseLogs:[{...records[0],tomado_em:'2026-10-14'}]}).length);assert.match(brain({...context,doseLogs:[{...records[0],motivo:undefined} ]})[0].mensagem,/não presume o motivo/);
 const {avatarInsightContext:summary,avatarContextLink:link,shortestAvatarAngle:angle}=load('lib/health-profile/avatar-context.ts');const base={id:'low',kind:'observation',urgencia:'baixa',confianca:'alta',amostra:4};const high={...base,id:'high',kind:'alert',gravidadeSeguranca:'critica'};assert.equal(summary([base,high,high]).primary.id,'high');assert.equal(summary([base,high,high]).count,2);assert.equal(summary([]).rank,0);assert.equal(link('//outside'),'/inteligencia/alertas');assert.equal(link('/\\outside'),'/inteligencia/alertas');assert.equal(link('/saude/medicamentos/detalhes?id=m'),'/saude/medicamentos/detalhes?id=m');assert(Math.abs(angle(6*Math.PI,Math.PI/2)-6*Math.PI)<=Math.PI);
 console.log('V142: real upsert, atomic stock guard, race/idempotence/reversal, explicit reason, ownership, rollback and Brain/Avatar priority passed.');
})().finally(()=>db.delete()).catch(e=>{console.error(e);process.exitCode=1;});
