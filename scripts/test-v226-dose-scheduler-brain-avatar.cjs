const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

const files = ['lib/dose-notifications.ts','lib/health-insights.ts','components/saude/AvatarReadings.tsx','app/mais/page.tsx','scripts/test-v63-release-gate.mjs'];
for (const file of files) assert.ok(fs.existsSync(path.join(root,file)),`V226: missing ${file}`);
const doseSource=fs.readFileSync(path.join(root,'lib/dose-notifications.ts'),'utf8');
const prefsSource=fs.readFileSync(path.join(root,'app/mais/page.tsx'),'utf8');
const brainSource=fs.readFileSync(path.join(root,'lib/health-insights.ts'),'utf8');
const avatarSource=fs.readFileSync(path.join(root,'components/saude/AvatarReadings.tsx'),'utf8');
assert.match(doseSource,/VAULT_V226_INCREMENTAL_NATIVE_REMINDERS/);
assert.match(doseSource,/VAULT_NOTIFICATION_FINGERPRINT/);
assert.match(doseSource,/reconcileVaultNotificationSet\(/);
assert.doesNotMatch(doseSource,/if\(oldDoseIds\.length>0\) await LocalNotifications\.cancel/);
assert.match(prefsSource,/VAULT_V226_SINGLE_FLIGHT_ENABLE/);
assert.match(prefsSource,/await reconcileScheduledDoseNotifications\(/);
assert.doesNotMatch(prefsSource,/medicamentosAgendaveis\.map\(/);
assert.match(brainSource,/buildRecordedDoseRoutineInsights/);
assert.match(avatarSource,/summarizeAvatarReadingFreshness/);

let pending=[], enabled=true, schedCalls=0, cancelled=0, permission='granted';
const api = {
 getPending: async()=>({notifications:pending.map(n=>({...n}))}),
 cancel: async({notifications})=>{cancelled+=notifications.length;const ids=new Set(notifications.map(n=>n.id));pending=pending.filter(n=>!ids.has(n.id));},
 schedule: async({notifications})=>{schedCalls+=notifications.length;for(const n of notifications){pending=pending.filter(p=>p.id!==n.id);pending.push(n);}},
 checkPermissions:async()=>({display:permission}),registerActionTypes:async()=>{},
};
const mocks={
 '@capacitor/local-notifications':{LocalNotifications:api},
 '@/lib/native-runtime':{isVaultNative:()=>true},
 '@/lib/medication-availability':{hasKnownEmptyMedicationStock:(m)=>m.estoque_quantidade===0},
 '@/lib/notification-preferences':{isVaultNotificationCategoryEnabled:()=>enabled},
 '@/lib/notifications':{
    ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>enabled,
    requestNotificationPermissions:async()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault-test',
 },
 '@/lib/db':{db:{medicamentos:{get:async()=>null,where:()=>({equals:()=>({toArray:async()=>[]})})},doseLogs:{where:()=>({equals:()=>({toArray:async()=>[]})})}}},
};
const cache=new Map();
function load(rel){
 const filename=path.resolve(root,rel); if(cache.has(filename))return cache.get(filename).exports;
 const mod=new Module(filename,module); cache.set(filename,mod);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
 mod.require=id=>{
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(id.startsWith('@/'))return load(id.slice(2)+'.ts');
  if(id.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(filename),id))+'.ts');
  return require(id);
 };
 const source=fs.readFileSync(filename,'utf8');
 const transpiled=ts.transpileModule(source,{fileName:filename,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 const errs=(transpiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>ts.flattenDiagnosticMessageText(x.messageText,' '));
 assert.deepEqual(errs,[],rel);mod._compile(transpiled.outputText,filename);return mod.exports;
}
const scheduled=load('lib/dose-notifications.ts');
const brain=load('lib/health-intelligence/dose-routine-insights.ts');
const freshness=load('lib/health-profile/avatar-freshness.ts');
const audit=load('lib/dose-reminder-diagnostics.ts');
const date='2026-10-22';
const now=new Date(2026,9,22,8,0,0);
const med=(id,person='p',user='u')=>({id,person_id:person,user_id:user,nome:`Medicamento ${id}`,dosagem:'10mg',status:'ativo',tipo_uso:'continuo',estoque_quantidade:12,estoque_horarios:['09:00']});
const meds=[med('a'),med('b')];
const input={personId:'p',medicamentos:meds,logs:[],now};
async function testScheduler(){
 assert.equal(await scheduled.reconcileScheduledDoseNotifications(input),7);
 assert.equal(pending.length,7,'same-clock reminders must be grouped by day');
 assert.ok(pending.every(n=>n.extra.type==='dose_reminder_group'));
 assert.ok(pending.every(n=>n.actionTypeId===undefined),'group never records two doses with one action');
 assert.equal(schedCalls,7);assert.equal(cancelled,0);
 assert.equal(await scheduled.reconcileScheduledDoseNotifications(input),7);
 assert.equal(schedCalls,7,'idempotency: unchanged schedule does not touch OS');
 assert.equal(cancelled,0,'idempotency: unchanged schedule is never cancelled');
 const log={person_id:'p',user_id:'u',medicamento_id:'a',data:date,horario:'09:00',tomado_em:'2026-10-22T08:30:00'};
 await scheduled.reconcileScheduledDoseNotifications({...input,logs:[log]});
 assert.equal(cancelled,1,'only changed group must be cancelled');
 assert.equal(schedCalls,8,'only changed reminder is scheduled');
 assert.equal(pending.find(n=>n.extra.data===date).extra.type,'dose_reminder');
 assert.equal(pending.find(n=>n.extra.data===date).extra.medicamentoId,'b');
 const newMed={...med('b'),nome:'Novo nome'};
 await scheduled.reconcileScheduledDoseNotifications({...input,medicamentos:[meds[0],newMed],logs:[log]});
 assert.equal(cancelled,8,'changed label updates existing fingerprint, not silent drift');
 assert.equal(schedCalls,15);
 await scheduled.reconcileScheduledDoseNotifications({personId:'other',medicamentos:[med('x','other','other-user')],logs:[],now});
 assert.equal(pending.filter(n=>n.extra.personId==='p').length,0,'person switch cancels previous schedule');
 assert.equal(pending.filter(n=>n.extra.personId==='other').length,7);
 enabled=false;await scheduled.reconcileScheduledDoseNotifications(input);
 assert.equal(pending.length,0,'disable cancels scheduled notifications');
 enabled=true;
 await scheduled.reconcileScheduledDoseNotifications({...input,medicamentos:[{...med('z'),estoque_quantidade:0}],logs:[]});
 assert.ok(pending.length>0&&pending.every(n=>n.extra.type==='dose_stock_review'));
 assert.ok(pending.every(n=>n.actionTypeId===undefined),'zero-stock review cannot mark a dose as taken');
 await scheduled.cancelAllDoseNotifications([{id:'z',person_id:'p',nome:'z',dosagem:'',estoque_horarios:[]}]);
 assert.equal(pending.length,0);
 permission='denied';await scheduled.reconcileScheduledDoseNotifications(input);
 assert.equal(pending.length,0);
 permission='granted';
}
function testBrain(){
 const own=[
  {id:1,extra:{personId:'p',type:'dose_reminder_group',data:'2026-10-22',horario:'09:00'}},
  {id:2,extra:{personId:'p',type:'dose_reminder',data:'2026-10-22',horario:'10:00'}},
  {id:3,extra:{personId:'p',type:'dose_reminder',data:'2026-10-22',horario:'10:00'}},
  {id:4,extra:{personId:'other',type:'dose_reminder_group'}},
  {id:5,extra:{personId:'p',type:'dose_stock_review'}},
  {id:5,extra:{personId:'p',type:'dose_stock_review'}},
 ];
 assert.deepEqual(audit.summarizeNativeDoseAgenda(own,'p'),{grouped:1,individual:2,planned:0,stockReview:1,overdue:0,simultaneousIndividualSlots:1,total:4});
 assert.equal(audit.summarizeNativeDoseAgenda(own,'other').total,1);

 const logs=[];
 for(let d=0;d<8;d++){
  const day=`2026-10-${String(15+d).padStart(2,'0')}`;
  logs.push({person_id:'p',user_id:'u',medicamento_id:'a',data:day,horario:'21:00',dose_kind:'scheduled',...(d%2?{tomado_em:day+'T21:00:00'}:{ignorado_em:day+'T21:00:00'})});
 }
 const ctx={personId:'p',hoje:'2026-10-22',medicamentos:meds,doseLogs:logs};
 let insights=brain.buildRecordedDoseRoutineInsights(ctx);
 assert.equal(insights.length,1,'explicitly ignored evening doses with enough evidence');
 assert.equal(insights[0].amostra,8);
 assert.match(insights[0].mensagem,/Dias sem registro não foram contados/);
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:logs.slice(0,3)}).length,0,'minimum sample');
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:logs.map(l=>({...l,dose_kind:'sos'}))}).length,0,'SOS excluded');
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:logs.map(l=>({...l,person_id:'foreign'}))}).length,0,'person isolation');
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:logs.map(l=>({...l,user_id:'foreign'}))}).length,0,'account isolation');
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:[...logs,...logs.map(l=>({...l,tomado_em:'2026-10-22T20:00:00'}))]}).length,0,'conflicting legacy logs excluded');
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:logs.map(l=>({...l,data:'2026-10-40'}))}).length,0,'invalid calendar dates excluded');
 assert.equal(brain.buildRecordedDoseRoutineInsights({...ctx,doseLogs:logs.map(l=>({...l,data:'2026-10-23'}))}).length,0,'future dates excluded');
 const summary=freshness.summarizeAvatarReadingFreshness(['2026-10-22','2026-10-16','2026-10-10','2026-09-01','2026-10-40','2026-10-23'],'2026-10-22');
 assert.deepEqual(summary,{recent7:2,recent30:1,historical:1,futureOrInvalid:2});
}
(async()=>{testBrain();await testScheduler();console.log('V226 OK: native unchanged alarms, grouped review, person transition, stock, owner, Brain evidence, Avatar freshness.');})().catch(e=>{console.error(e);process.exitCode=1});
