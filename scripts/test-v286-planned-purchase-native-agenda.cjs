const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const read=f=>fs.readFileSync(f,'utf8');
const brain=read('lib/notification-brain.ts'),panel=read('components/NotificationBrainPanel.tsx'),reconciler=read('components/HealthReminderReconciler.tsx'),providers=read('components/Providers.tsx');
for(const token of ['"compra"','compra: [1440, 0]','plannedPurchaseTime: "12:00"','validTime(parsed.plannedPurchaseTime'])assert(brain.includes(token),`brain ${token}`);
assert(panel.includes('Compras planejadas')&&panel.includes('Compra planejada')&&panel.includes('Não confirma compra, gasto ou entrada no estoque'));
for(const token of ['db.renovacoes','isPrescriptionOnly(item)','isFutureAcquisition(item,today)','renewalEventDate(item).slice(0,10)','kind:"compra"','/saude/renovacao/detalhes?id='])assert(reconciler.includes(token),`reconciler ${token}`);
assert(providers.includes('data.type === "health_event"'),'cold-start navigation handles purchase event');
let desired=[];const filename=path.resolve('lib/health-reminders/event-scheduler.ts'),m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));m.require=id=>{
 if(id==='@/lib/notification-preferences')return {isVaultNotificationCategoryEnabled:c=>c==='renovacoes'};
 if(id==='@capacitor/local-notifications')return {LocalNotifications:{checkPermissions:async()=>({display:'granted'})}};
 if(id==='@/lib/notification-brain')return {formatReminderOffset:n=>n?`${n} min antes`:'na hora',getVaultNotificationBrainSettings:()=>({eventOffsets:{consulta:[60],exame:[60],retirada:[60],compra:[1440,0]},dateOnlyEventTime:'09:00',plannedPurchaseTime:'12:00'})};
 if(id==='@/lib/native-runtime')return {isVaultNative:()=>true};
 if(id==='@/lib/notifications')return {ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault'};
 if(id==='@/lib/notification-reconciliation')return {VAULT_NOTIFICATION_FINGERPRINT:'fp',vaultNotificationFingerprint:p=>p.join('|'),reconcileVaultNotificationSet:async n=>{desired=n}};
 return require(id)};
m._compile(ts.transpileModule(read(filename),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
(async()=>{const count=await m.exports.reconcileHealthEventNotifications([{id:'buy',userId:'u',personId:'p',kind:'compra',title:'Pristiq',date:'2099-12-31',status:'agendada',targetRoute:'/saude/renovacao/detalhes?id=buy'}]);assert.equal(count,2);assert(desired.every(n=>n.extra.eventKind==='compra'&&n.extra.targetRoute.includes('id=buy')));assert(desired.every(n=>n.title==='Compra planejada'));assert(desired.every(n=>!n.body.includes('compra realizada')));console.log('VAULT V286 — COMPRA PLANEJADA + ALARME NATIVO: OK')})().catch(e=>{console.error(e);process.exitCode=1});
