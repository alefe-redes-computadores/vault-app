"use strict";
/** M99 P1 — hermético, não usa Android, IndexedDB, rede ou dados clínicos. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
let count=0;
const ok=(v,msg)=>{assert.ok(v,`M99: ${msg}`);console.log(`OK ${++count}: ${msg}`);};
const read=file=>fs.readFileSync(file,"utf8");
function transpile(file){
 const source=read(file);
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,`sintaxe TS/TSX: ${file}`);
 const result=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 ok((result.diagnostics||[]).length===0,`transpilação: ${file}`);
 return result.outputText;
}
const file="lib/dose-alert-policy-m99.ts";
const compiled=transpile(file);
let stored={};
const storage={getItem:key=>Object.prototype.hasOwnProperty.call(stored,key)?stored[key]:null,setItem:(key,value)=>{stored[key]=value;}};
const events=[];
global.window={localStorage:storage,dispatchEvent:event=>events.push(event.type)};
global.CustomEvent=class {constructor(type){this.type=type;}};
const moduleM99={exports:{}};
new Function("module","exports","require",compiled)(moduleM99,moduleM99.exports,key=>{
 if(key==="@/lib/notification-preferences")return {VAULT_NOTIFICATION_PREFERENCES_EVENT:"vault:notification-preferences-changed"};
 throw new Error(`import não esperado: ${key}`);
});
const x=moduleM99.exports;
ok(x.getVaultDoseAlertMode("p1")==="suave","modo padrão conserva comportamento antigo");
ok(x.setVaultDoseAlertMode("p1","reforcado")===true,"preferência por pessoa salva");
ok(x.getVaultDoseAlertMode("p1")==="reforcado"&&x.getVaultDoseAlertMode("p2")==="suave","isolamento entre pessoas");
ok(events.includes("vault:notification-preferences-changed"),"reconciliação canônica solicitada");
ok(x.doseAlertOffsetsForMode("suave",[120,30,60]).join(",")==="30","suave seleciona um único aviso");
ok(x.doseAlertOffsetsForMode("reforcado",[120,30]).join(",")==="30,90","reforçado agenda duas tentativas");
ok(x.doseAlertOffsetsForMode("persistente",[120,30]).join(",")==="30,60,120,210","persistente limitado a quatro tentativas");
ok(x.doseAlertOffsetsForMode("persistente",[]).every(n=>n>0&&n<=1440),"offsets positivos e limitados");
ok(x.setVaultDoseAlertMode("", "persistente")===false,"sem pessoa não altera preferência");
const scheduler=read("lib/overdue-dose-notifications.ts");
ok(scheduler.includes("getVaultDoseAlertMode(personId)"),"agenda usa preferência da pessoa ativa");
ok(scheduler.includes("extra?.personId===personId"),"reconciliador preserva alarmes de outra pessoa");
ok(scheduler.includes("offsetMinutes:item.offsetMinutes"),"alarme guarda deslocamento próprio sem inferir dose tomada");
ok(/MAX_PENDING_OVERDUE\s*=\s*80/.test(scheduler) && scheduler.includes(".slice(0,MAX_PENDING_OVERDUE)"),"limite de agenda é respeitado");
ok(scheduler.includes("if(at<=now)continue"),"não agenda alarme já vencido");
const panel=read("components/notifications/VaultDoseAlertPanelM99.tsx");
transpile("components/notifications/VaultDoseAlertPanelM99.tsx");
ok(panel.includes("checkExactNotificationSetting"),"diagnóstico de permissão especial");
ok(panel.includes("changeExactNotificationSetting"),"pedido de permissão só após gesto do usuário");
ok(panel.includes("vault_m99_test")&&panel.includes("Nenhuma medicação foi registrada"),"teste nativo isolado de registros clínicos");
ok(!panel.includes("doseLogsRepository")&&!panel.includes("setStatus("),"painel nunca marca dose");
const page=read("app/saude/lembretes/page.tsx");
ok(page.includes("<VaultDoseAlertPanelM99 />"),"interface integrada à central existente");
const workflow=read(".github/workflows/build-android.yml");
ok(workflow.includes("node scripts/patch-android-exact-alarms-m99.mjs"),"APK configura permissão no manifesto gerado");
const manifestPatch=read("scripts/patch-android-exact-alarms-m99.mjs");
ok(!manifestPatch.includes('"android.permission.USE_EXACT_ALARM" />')&&!manifestPatch.includes('"android.permission.USE_FULL_SCREEN_INTENT" />'),"sem permissão invasiva de full-screen");
// Exercita a reconciliação real com Android simulado: não apenas contratos textuais.
const nativeSource=transpile("lib/overdue-dose-notifications.ts");
let pending=[];
let currentOffsets=[30];
let permission="granted";
const android={
  getPending:async()=>({notifications:pending.map(n=>({...n}))}),
  checkPermissions:async()=>({display:permission}),
  cancel:async({notifications})=>{const ids=new Set(notifications.map(n=>n.id));pending=pending.filter(n=>!ids.has(n.id));},
  schedule:async({notifications})=>{for(const n of notifications){pending=pending.filter(old=>old.id!==n.id);pending.push(n);}},
};
const fakeImports={
  "@/lib/medication-availability":{hasKnownEmptyMedicationStock:med=>med.estoque_quantidade===0},
  "@capacitor/local-notifications":{LocalNotifications:android},
  "@/lib/native-runtime":{isVaultNative:()=>true},
  "@/lib/notification-preferences":{isVaultNotificationCategoryEnabled:()=>true},
  "@/lib/notification-brain":{getVaultNotificationBrainSettings:()=>({doseOverdueOffsets:currentOffsets})},
  "@/lib/dose-alert-policy-m99":{
    getVaultDoseAlertMode:x.getVaultDoseAlertMode,
    doseAlertOffsetsForMode:x.doseAlertOffsetsForMode,
  },
  "@/lib/notifications":{
    ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:"vault_reminders",
  },
  "@/lib/dose-slot-authority":{
    buildDoseSlotIndex:(logs)=>logs,
    resolveDoseSlot:(index,medicamentoId,data,horario)=>index.find(log=>log.medicamento_id===medicamentoId&&log.data===data&&log.horario===horario)||null,
    doseSlotIsResolved:log=>Boolean(log?.tomado_em||log?.ignorado_em),
  },
};
const nativeModule={exports:{}};
new Function("module","exports","require",nativeSource)(nativeModule,nativeModule.exports,key=>{
  if(Object.prototype.hasOwnProperty.call(fakeImports,key))return fakeImports[key];
  throw new Error(`importação nativa não esperada: ${key}`);
});
const nativeModuleExports=nativeModule.exports;
const today="2026-11-08";
const now=new Date(2026,10,8,8,0,0);
const med=(personId,id)=>({id,person_id:personId,nome:`Medicamento ${id}`,status:"ativo",tipo_uso:"continuo",estoque_horarios:["12:00"],estoque_quantidade:30});
(async()=>{
  await nativeModuleExports.reconcileOverdueDoseNotifications({personId:"p2",medicamentos:[med("p2","b")],logs:[],now});
  const p2Before=pending.filter(n=>n.extra.personId==="p2");
  ok(p2Before.length===7,"modo suave de outra pessoa: 7 agendamentos semanais, um por slot");
  await nativeModuleExports.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[],now});
  ok(pending.filter(n=>n.extra.personId==="p1").length===14,"modo reforçado p1: dois avisos por slot");
  x.setVaultDoseAlertMode("p1","suave");
  await nativeModuleExports.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[],now});
  ok(pending.filter(n=>n.extra.personId==="p1").length===7,"modo suave p1: apenas um aviso por slot");
  ok(pending.filter(n=>n.extra.personId==="p2").length===p2Before.length,"reconciliação de p1 não cancela p2");
  x.setVaultDoseAlertMode("p1","persistente");
  await nativeModuleExports.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[],now});
  const p1=pending.filter(n=>n.extra.personId==="p1");
  ok(p1.length===28,"persistente: 4 avisos por slot, 7 dias");
  ok(new Set(p1.map(n=>n.id)).size===p1.length,"IDs únicos por tentativa e slot");
  ok(pending.filter(n=>n.extra.personId==="p2").length===p2Before.length,"mudança de intensidade p1 preserva pessoa p2");
  const resolved={person_id:"p1",medicamento_id:"a",data:today,horario:"12:00",tomado_em:"2026-11-08T12:05:00"};
  await nativeModuleExports.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[resolved],now});
  ok(!pending.some(n=>n.extra.personId==="p1"&&n.extra.data===today),"dose tomada cancela todas as tentativas daquele slot");
  await nativeModuleExports.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[{...med("p1","a"),estoque_quantidade:0}],logs:[],now});
  ok(!pending.some(n=>n.extra.personId==="p1"),"estoque zerado não gera cobranças, sem tocar pessoa p2");
  ok(pending.some(n=>n.extra.personId==="p2"),"estoque p1 não apaga agenda p2");
  console.log(`M99 P1: ${count} contratos aprovados (Android físico pendente)`);
})().catch(error=>{console.error(error);process.exitCode=1});
