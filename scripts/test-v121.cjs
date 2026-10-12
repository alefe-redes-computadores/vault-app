const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let pending = [], enabled = true, permission = 'granted', failSchedule = false;
let storedMeds = [], storedLogs = [];
const api = {
 getPending: async()=>({notifications:pending.map(n=>({...n}))}),
 cancel: async({notifications})=>{const ids=new Set(notifications.map(n=>n.id));pending=pending.filter(n=>!ids.has(n.id));},
 schedule: async({notifications})=>{if(failSchedule)throw new Error('schedule rejected');for(const n of notifications){pending=pending.filter(p=>p.id!==n.id);pending.push(n);}},
 checkPermissions:async()=>({display:permission}),registerActionTypes:async()=>{},
};
const native={isVaultNative:()=>true};
const notifications={ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>enabled,requestNotificationPermissions:async()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault'};
const preferences={isVaultNotificationCategoryEnabled:()=>enabled};
const db={medicamentos:{get:async id=>storedMeds.find(m=>m.id===id),where:()=>({equals:person=>({toArray:async()=>storedMeds.filter(m=>m.person_id===person)})})},doseLogs:{where:()=>({equals:person=>({toArray:async()=>storedLogs.filter(m=>m.person_id===person)})})}};
const mocks={'@capacitor/local-notifications':{LocalNotifications:api},'@/lib/native-runtime':native,'@/lib/notifications':notifications,'@/lib/notification-preferences':preferences,'@/lib/notification-brain':{getVaultNotificationBrainSettings:()=>({doseOverdueOffsets:[30]})},'@/lib/db':{db}};
const cache=new Map();
function load(rel){
 const filename=path.join(root,rel);if(cache.has(filename))return cache.get(filename).exports;
 const mod=new Module(filename,module);cache.set(filename,mod);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
 mod.require=id=>{
  if(mocks[id])return mocks[id];
  const resolved=id.startsWith('@/')?path.join(root,id.slice(2)):id.startsWith('.')?path.resolve(path.dirname(filename),id):null;
  if(resolved){for(const ext of ['.ts','.tsx'])if(fs.existsSync(resolved+ext)){
   // Keep unrelated clinical engines outside this operational test boundary.
   if(rel==='lib/health-insights.ts' && /health-intelligence/.test(resolved) && !/medication-availability-insights$/.test(resolved))return new Proxy({}, {get:()=>()=>[]});
   return load(path.relative(root,resolved+ext));
  }return new Proxy({}, {get:()=>()=>[]});}
  return require(id);
 };
 const source=fs.readFileSync(filename,'utf8');const compiled=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 const errors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '));
 assert.deepEqual(errors,[],rel);mod._compile(compiled.outputText,filename);return mod.exports;
}
const {hasKnownEmptyMedicationStock,medicationIgnoredStatus,resolveMedicationStockReview}=load('lib/medication-availability.ts');
const {buildMedicationAvailabilityInsights}=load('lib/health-intelligence/medication-availability-insights.ts');
const scheduled=load('lib/dose-notifications.ts'), overdue=load('lib/overdue-dose-notifications.ts');
const now=new Date(2026,9,12,8,0,0),day='2026-10-12';
const med=(id,qty)=>({id,person_id:'p',nome:id,status:'ativo',tipo_uso:'continuo',formato:'capsula',estoque_quantidade:qty,estoque_horarios:['18:00','09:00'],estoque_unidade_por_dose:1,dosagem:'30mg'});
const zero=med('Venvanse',0),normal=med('Outro',10),unknown=med('Desconhecido',undefined);
const ignored={person_id:'p',medicamento_id:zero.id,data:day,horario:'09:00',ignorado_em:day+'T08:00:00'};
assert.equal(hasKnownEmptyMedicationStock(zero),true);
for(const qty of [undefined,null,NaN,Infinity])assert.equal(hasKnownEmptyMedicationStock({estoque_quantidade:qty}),false);
assert.equal(medicationIgnoredStatus({taken:0,ignored:1,pending:0,emptyStock:true}).label,'Dose ignorada');
assert.equal(medicationIgnoredStatus({taken:1,ignored:1,pending:0,emptyStock:false}).tone,'text-amber-400');
const context={personId:'p',hoje:day,medicamentos:[zero],doseLogs:[ignored]};
assert.equal(buildMedicationAvailabilityInsights(context).length,1);
assert.match(buildMedicationAvailabilityInsights(context)[0].mensagem,/não presume o motivo/);
for(const c of [{...context,personId:'foreign'},{...context,hoje:'2026-10-11'},{...context,doseLogs:[{...ignored,person_id:'foreign'}]},{...context,medicamentos:[normal]},{...context,medicamentos:[unknown]},{...context,doseLogs:[{...ignored,dose_kind:'sos'}]},{...context,doseLogs:[{...ignored,tomado_em:day+'T07:00:00'}]}])assert.equal(buildMedicationAvailabilityInsights(c).length,0);
const core=load('lib/health-insights.ts');
const ignoredOnly=core.processarListaMedicamentos([{...zero,estoque_horarios:['09:00']}],[ignored])[0];
assert.equal(ignoredOnly.foiTomadoHoje,false,'uma dose ignorada não significa medicamento tomado');
assert.equal(ignoredOnly.dosesTomadasHoje,0);assert.equal(ignoredOnly.dosesIgnoradasHoje,1);assert.equal(ignoredOnly.dosesPendentesHoje,0);
const mixed=core.processarListaMedicamentos([zero],[ignored,{...ignored,horario:'18:00',ignorado_em:undefined,tomado_em:day+'T18:00:00'}])[0];
assert.equal(mixed.foiTomadoHoje,false);assert.equal(mixed.dosesTomadasHoje,1);assert.equal(mixed.dosesIgnoradasHoje,1);assert.equal(mixed.dosesPendentesHoje,0);
const taken=core.processarListaMedicamentos([{...zero,estoque_horarios:['09:00']}],[{...ignored,ignorado_em:undefined,tomado_em:day+'T09:00:00'}])[0];assert.equal(taken.foiTomadoHoje,true);
const conflict=core.processarListaMedicamentos([{...zero,estoque_horarios:['09:00']}],[ignored,{...ignored,ignorado_em:undefined,tomado_em:day+'T09:00:00'}])[0];assert.equal(conflict.dosesTomadasHoje+conflict.dosesIgnoradasHoje,1,'o mesmo horário não conta duas vezes');
(async()=>{
 const lookup={person:async id=>id==='p'?{user_id:'u'}:undefined,medication:async id=>[zero,normal].find(m=>m.id===id)};
 assert.deepEqual(await resolveMedicationStockReview({personId:'p',medicamentoIds:['Venvanse']},'u',lookup),{personId:'p',destination:'/saude/medicamentos/detalhes?id=Venvanse'});
 assert.equal((await resolveMedicationStockReview({personId:'p',medicamentoIds:['Venvanse','Outro']},'u',lookup)).destination,'/saude/medicamentos');
 assert.equal(await resolveMedicationStockReview({personId:'p',medicamentoIds:['Venvanse']},'foreign',lookup),null);
 assert.equal(await resolveMedicationStockReview({personId:'p',medicamentoIds:['missing']},'u',lookup),null);
 assert.equal(await resolveMedicationStockReview({personId:'p',medicamentoIds:['Venvanse']},'u',{...lookup,medication:async()=>({...zero,person_id:'other'})}),null);
 assert.equal(await resolveMedicationStockReview({personId:'p',medicamentoIds:['Venvanse']},'u',{...lookup,medication:async()=>({...zero,user_id:'foreign'})}),null);
 assert.equal(await resolveMedicationStockReview({personId:'p',medicamentoIds:[]},'u',lookup),null);
 await scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[zero,normal,unknown],logs:[],now});
 const stock=pending.filter(n=>n.extra.type==='dose_stock_review');assert.equal(stock.length,7,'uma revisão por dia');
 for(const n of stock){assert.equal(n.actionTypeId,undefined);assert.deepEqual(n.extra.medicamentoIds,['Venvanse']);assert.equal(n.extra.horario,'09:00');}
 for(const n of pending.filter(n=>n.extra.type!=='dose_stock_review'))assert.equal((n.extra.medicamentoIds||[n.extra.medicamentoId]).includes('Venvanse'),false);
 await scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[zero],logs:[ignored],now});
 assert.equal(pending.filter(n=>n.extra.type==='dose_stock_review'&&n.extra.data===day).length,0,'ignorar a primeira dose não reagenda uma segunda cobrança no dia');
 const refill={...zero,estoque_quantidade:10};
 await scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[refill],logs:[],now});
 assert.equal(pending.some(n=>n.extra.type==='dose_stock_review'),false,'aquisição remove revisão de estoque');
 assert.ok(pending.some(n=>n.extra.type==='dose_reminder'&&n.extra.medicamentoId==='Venvanse'));
 const overdueCount=pending.length;
 await overdue.reconcileOverdueDoseNotifications({personId:'p',medicamentos:[zero],logs:[],now});assert.equal(pending.length,overdueCount,'estoque zerado não gera cobrança de atraso');
 await overdue.reconcileOverdueDoseNotifications({personId:'p',medicamentos:[normal],logs:[],now});assert.ok(pending.some(n=>n.extra.type==='dose_overdue_group'));
 await overdue.reconcileOverdueDoseNotifications({personId:'p',medicamentos:[{...normal,estoque_quantidade:0}],logs:[],now});assert.equal(pending.some(n=>n.extra.type==='dose_overdue_group'),false,'zerar estoque cancela atrasos agendados');
 await Promise.all([scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[refill],logs:[],now}),scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[zero],logs:[],now})]);
 assert.equal(pending.some(n=>n.extra.type==='dose_reminder'),false,'a revisão mais recente vence');
 await scheduled.cancelDoseNotifications({id:zero.id,person_id:'p',nome:zero.nome,dosagem:'',estoque_horarios:[]});assert.equal(pending.length,0,'cancelamento remove revisão de estoque');
 storedMeds=[zero];storedLogs=[];
 await scheduled.scheduleDoseNotifications({id:zero.id,person_id:'p',nome:zero.nome,dosagem:'',estoque_horarios:zero.estoque_horarios});
 assert.ok(pending.every(n=>n.extra.type==='dose_stock_review'),'chamadas legadas também respeitam estoque');
 await scheduled.cancelAllDoseNotifications(storedMeds);assert.equal(pending.length,0);
 enabled=false;await scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[zero],logs:[],now});assert.equal(pending.length,0);enabled=true;
 failSchedule=true;await assert.rejects(scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[zero],logs:[],now}));failSchedule=false;
 await scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[normal],logs:[],now});assert.ok(pending.length>0,'falha não trava as próximas reconciliações');
 for(const rel of ['app/saude/medicamentos/page.tsx','app/hoje/page.tsx','components/saude/HealthBody.tsx','components/DoseNotificationReconciler.tsx','components/Providers.tsx','components/HealthReminderReconciler.tsx']){
  const parsed=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{fileName:rel,compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});assert.deepEqual((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],rel);
 }
 console.log('V121 OK: ignorada ≠ tomada, rotina mista, inteligência por pessoa, estoque desconhecido, revisão diária, reposição, atrasos, legado e concorrência.');
})().catch(e=>{console.error(e);process.exitCode=1});
