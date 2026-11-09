"use strict";
/** M99 P3 — testes herméticos. Nunca acessa Android real, Supabase, rede ou Dexie real. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
let n=0;
const check=(value,label)=>{assert.ok(value,`M99 P3: ${label}`);console.log(`OK ${++n}: ${label}`);};
const read=file=>fs.readFileSync(file,"utf8");
function loadTs(file,imports={}){
 const source=read(file);
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(ast.parseDiagnostics.length===0,`parse ${file}`);
 const js=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},reportDiagnostics:true});
 check((js.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length===0,`transpile ${file}`);
 const mod={exports:{}};
 new Function("module","exports","require",js.outputText)(mod,mod.exports,key=>{
  if(Object.hasOwn(imports,key))return imports[key];
  throw Error(`M99 P3: import não simulado: ${key} em ${file}`);
 });
 return mod.exports;
}
const mem=new Map();const events=[];
global.window={localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)},dispatchEvent:e=>events.push(e.type)};
global.CustomEvent=class{constructor(type){this.type=type}};
const eventName="vault:notification-preferences-changed";
const pause=loadTs("lib/dose-alert-pause-m99p2.ts",{"@/lib/notification-preferences":{VAULT_NOTIFICATION_PREFERENCES_EVENT:eventName}});
const policy=loadTs("lib/dose-snooze-policy-m99p3.ts");
const slot={personId:"p1",medicamentoId:"m1",data:"2026-11-08",horario:"12:00"};
const base=new Date(2026,10,8,12,2,0);
check(policy.canSnoozeDoseSlotM99P3(slot,base),"slot válido pode adiar sem marcá-lo");
check(!policy.canSnoozeDoseSlotM99P3({...slot,data:"2026-02-30"},base),"data impossível rejeitada");
check(!policy.canSnoozeDoseSlotM99P3({...slot,horario:"24:99"},base),"hora impossível rejeitada");
check(!policy.canSnoozeDoseSlotM99P3(slot,new Date(2026,10,10)),"notificação velha rejeitada");
check(!policy.canSnoozeDoseSlotM99P3(slot,new Date(2026,10,8,11,30)),"notificação prematura rejeitada");
check(policy.doseSnoozeIdM99P3(slot)===policy.doseSnoozeIdM99P3({...slot}),"mesmo slot mantém ID");
check(policy.doseSnoozeIdM99P3({...slot,personId:"p2"})!==policy.doseSnoozeIdM99P3(slot),"ID difere por pessoa");
const at=base.getTime()+10*60000;
check(pause.setVaultDoseSlotSnoozeUntilM99P3("p1","m1",slot.data,slot.horario,at,base.getTime()),"adiamento local persistido");
check(pause.getVaultDoseSlotSnoozeUntilM99P3("p1","m1",slot.data,slot.horario,base.getTime())===at,"slot salvo por pessoa e medicamento");
check(pause.getVaultDoseSlotSnoozeUntilM99P3("p2","m1",slot.data,slot.horario,base.getTime())===null,"adiamento isolado entre pessoas");
check(pause.getVaultDoseSlotSnoozeUntilM99P3("p1","m1",slot.data,slot.horario,at+1)===null,"adiamento expira");
check(!pause.setVaultDoseSlotSnoozeUntilM99P3("p1","m1",slot.data,slot.horario,base.getTime()+24*3600000,base.getTime()),"janela prolongada recusada");
check(events.includes(eventName),"mudança solicita reconciliador canônico");
const report=policy.summarizeSnoozedNotificationsM99P3([
 {extra:{type:policy.DOSE_SNOOZE_TYPE_M99P3,personId:"p1"},schedule:{at:new Date(at)}},
 {extra:{type:policy.DOSE_SNOOZE_TYPE_M99P3,personId:"p2"},schedule:{at:new Date(at+100)}},
 {extra:{type:"dose_reminder",personId:"p1"},schedule:{at:new Date(at+200)}},
],"p1",base.getTime());
check(report.count===1&&report.nextAt===at,"diagnóstico sem nomes e com isolamento por pessoa");

let pending=[];let permission="granted";let loggedIn=true;let owner="u1";let logs=[];let writeCount=0;
const person={id:"p1",user_id:"u1"};
const med={id:"m1",person_id:"p1",user_id:"u1",status:"ativo",estoque_quantidade:12};
const native={
 getPending:async()=>({notifications:pending.map(x=>({...x}))}),
 checkPermissions:async()=>({display:permission}),
 cancel:async({notifications})=>{const ids=new Set(notifications.map(x=>x.id));pending=pending.filter(x=>!ids.has(x.id));},
 schedule:async({notifications})=>{writeCount+=notifications.length;for(const x of notifications){pending=pending.filter(y=>y.id!==x.id);pending.push(x);}},
};
const fakeDb={persons:{get:async id=>id==="p1"?person:null},medicamentos:{get:async id=>id==="m1"?med:null},doseLogs:{where:()=>({equals:()=>({toArray:async()=>logs})})}};
const fakeSlot={buildDoseSlotIndex:rows=>rows,resolveDoseSlot:(rows,id,date,time)=>({state:rows.some(x=>x.medicamento_id===id&&x.data===date&&x.horario===time&&x.tomado_em)?"taken":"pending"}),doseSlotIsResolved:slot=>slot.state==="taken"||slot.state==="ignored"||slot.state==="conflict"};
const service=loadTs("lib/dose-snooze-m99p3.ts",{
 "@capacitor/local-notifications":{LocalNotifications:native},
 "@/lib/db":{db:fakeDb},
 "@/lib/supabase/local-auth":{getLocalFirstAuthUser:async()=>({data:{user:loggedIn?{id:owner}:null},error:null})},
 "@/lib/native-runtime":{isVaultNative:()=>true},
 "@/lib/notifications":{ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:"vault_reminders"},
 "@/lib/notification-preferences":{isVaultNotificationCategoryEnabled:()=>true},
 "@/lib/dose-slot-authority":fakeSlot,
 "@/lib/dose-alert-pause-m99p2":pause,
 "@/lib/dose-snooze-policy-m99p3":policy,
});
(async()=>{
 const request={...slot,type:"dose_reminder"};
 loggedIn=false;
 check(await service.snoozeDoseReminderM99P3(request,base)===false&&writeCount===0,"sem sessão não agenda");
 loggedIn=true;owner="u2";
 check(await service.snoozeDoseReminderM99P3(request,base)===false&&writeCount===0,"outra conta não agenda");
 owner="u1";permission="denied";
 check(await service.snoozeDoseReminderM99P3(request,base)===false&&writeCount===0,"permissão Android bloqueada respeitada");
 permission="granted";logs=[{medicamento_id:"m1",data:slot.data,horario:slot.horario,tomado_em:"2026-11-08T12:01:00"}];
 check(await service.snoozeDoseReminderM99P3(request,base)===false&&writeCount===0,"dose já tomada não pode ser adiada");
 logs=[];
 pending.push({id:88,extra:{type:"dose_overdue_group",personId:"p1",medicamentoIds:["m1"],data:slot.data,horario:slot.horario}});
 pending.push({id:89,extra:{type:"dose_overdue_group",personId:"p1",medicamentoIds:["m1","m2"],data:slot.data,horario:slot.horario}});
 pending.push({id:90,extra:{type:"dose_overdue_group",personId:"p2",medicamentoIds:["m1"],data:slot.data,horario:slot.horario}});
 check(await service.snoozeDoseReminderM99P3(request,base)===true,"primeiro adiamento legítimo");
 check(pending.filter(x=>x.extra?.type===policy.DOSE_SNOOZE_TYPE_M99P3).length===1,"um aviso para um slot");
 check(!pending.some(x=>x.id===88)&&pending.some(x=>x.id===89)&&pending.some(x=>x.id===90),"só cancela reforço exclusivo; preserva outros medicamentos e pessoas");
 check(writeCount===1&&pending.some(x=>x.extra?.snoozeUntil===at),"agendamento nativo auditável, 10 minutos");
 check(pending.find(x=>x.extra?.type===policy.DOSE_SNOOZE_TYPE_M99P3).actionTypeId===undefined,"adiamento sem ação de confirmação em massa");
 check(await service.snoozeDoseReminderM99P3(request,new Date(base.getTime()+60000))===true,"novo adiamento substitui anterior");
 check(pending.filter(x=>x.extra?.type===policy.DOSE_SNOOZE_TYPE_M99P3).length===1,"ID fixo não duplica aviso");
 const snapshot={personId:"p1",userId:"u1",medicamentos:[med],logs:[]};
 check(await service.reconcileSnoozedDoseNotificationsM99P3(snapshot,base.getTime()+60000)===0,"pendência legítima mantida");
 logs=[{medicamento_id:"m1",data:slot.data,horario:slot.horario,tomado_em:"2026-11-08T12:03:00"}];
 check(await service.reconcileSnoozedDoseNotificationsM99P3({...snapshot,logs},base.getTime()+60000)===1,"tomada remove adiamento obsoleto");
 check(!pending.some(x=>x.extra?.type===policy.DOSE_SNOOZE_TYPE_M99P3),"sem novas notificações após tomada");
 check(pending.some(x=>x.id===89)&&pending.some(x=>x.id===90),"reconciliação não remove grupo misto nem outra pessoa");
 // Segurança de contratos V91, M66 e V226 por fonte: nunca suavizar testes anteriores.
 const canonical=read("components/DoseNotificationReconciler.tsx");
 check((canonical.match(/useLiveQuery\(/g)||[]).length===1&&canonical.includes('db.transaction("r",[db.medicamentos,db.doseLogs]'),"assinatura transacional V91 preservada");
 check(canonical.includes("refreshKey: preferenceRevision")&&canonical.includes('  }, [activePersonId, user?.id, snapshot, preferenceRevision]);'),"assinatura M66 intacta");
 check(canonical.includes("reconcileSnoozedDoseNotificationsM99P3")&&canonical.includes("doseNotificationPipeline.enqueue("),"reaproveita fila e não cria observador Dexie");
 const scheduled=read("lib/dose-notifications.ts");
 check(scheduled.includes('id: "ADIAR"')&&scheduled.includes('foreground: true')&&scheduled.includes('VAULT_V226_INCREMENTAL_NATIVE_REMINDERS'),"ação nativa e contrato V226 preservados");
 const overdue=read("lib/overdue-dose-notifications.ts");
 check(overdue.includes("getVaultDoseSlotSnoozeUntilM99P3")&&overdue.includes("getVaultDosePauseUntil(personId"),"adiamento individual e pausa P2 coexistem");
 const actions=read("hooks/useDoseNotificationActions.ts");
 check(actions.includes('event.actionId === "ADIAR"')&&actions.includes("if (!exactNotificationDate) return;")&&actions.includes("snoozeDoseReminderM99P3"),"ação exige identidade e data exata do slot");
 check(read("components/Providers.tsx").includes('data.type === "dose_snooze_m99p3"')&&read("lib/notification-dose-navigation.ts").includes('case "dose_snooze_m99p3":'),"clique seguro abre Dose no Hoje");
 check(read("components/notifications/VaultDoseAlertPanelM99.tsx").includes("Adiamentos individuais ativos"),"diagnóstico Android mostra adiamentos sem medicamento");
 check(read("scripts/test-v63-release-gate.mjs").includes('"scripts/test-vault-m99-p3-final.cjs"'),"P3 incluída no gate histórico");
 console.log(`M99 P3: ${n} verificações herméticas aprovadas; APK físico ainda exige homologação.`);
})().catch(e=>{console.error(e);process.exitCode=1});
