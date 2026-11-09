"use strict";
/** M99 P2 — teste hermético; não chama Android, banco, rede ou dados reais. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
let checked = 0;
const check = (cond, msg) => { assert.ok(cond, `M99 P2: ${msg}`); console.log(`OK ${++checked}: ${msg}`); };
const read = file => fs.readFileSync(file, "utf8");
function compile(file) {
  const src = read(file);
  const ast = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  check(ast.parseDiagnostics.length === 0, `${file}: sintaxe válida`);
  const result = ts.transpileModule(src, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
  check(!(result.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error), `${file}: transpilação`);
  return result.outputText;
}
function load(file, deps) {
  const module = { exports: {} };
  new Function("module", "exports", "require", compile(file))(module, module.exports, key => {
    if (Object.prototype.hasOwnProperty.call(deps, key)) return deps[key];
    throw new Error(`M99 P2 ${file}: import não simulado ${key}`);
  });
  return module.exports;
}
const events = [];
let stored = {};
global.window = {
  localStorage: {getItem: key => Object.prototype.hasOwnProperty.call(stored,key)?stored[key]:null, setItem: (key,value) => { stored[key]=value; }},
  dispatchEvent: event => events.push(event.type),
};
global.CustomEvent = class { constructor(type) { this.type=type; } };
const pref={VAULT_NOTIFICATION_PREFERENCES_EVENT:"vault:notification-preferences-changed",isVaultNotificationCategoryEnabled:()=>true};
const pause=load("lib/dose-alert-pause-m99p2.ts", {"@/lib/notification-preferences": pref});
const now=new Date(2026,10,8,12,1,0).getTime();
check(pause.getVaultDosePauseUntil("p1",now)===null,"por padrão nenhum bloqueio");
check(pause.setVaultDosePauseMinutes("p1",60,now),"pausa de 60 minutos salva");
check(pause.getVaultDosePauseUntil("p1",now)===now+60*60_000,"pausa observada no perfil correto");
check(pause.getVaultDosePauseUntil("p2",now)===null,"pessoa diferente não herda pausa");
check(pause.getVaultDosePauseUntil("p1",now+60*60_000)===null,"pausa vence precisamente no limite");
check(!pause.setVaultDosePauseMinutes("p1",1000,now),"rejeita duração indevida");
check(!pause.setVaultDosePauseMinutes("",60,now),"rejeita pessoa vazia");
check(events.includes("vault:notification-preferences-changed"),"solicita reconciliação quando usuário altera pausa");
check(!pause.shouldKeepOverdueReinforcement(new Date(now+20*60_000),new Date(now),now+60*60_000),"suprime aviso dentro da pausa");
check(pause.shouldKeepOverdueReinforcement(new Date(now+61*60_000),new Date(now),now+60*60_000),"preserva reforço depois da pausa");
check(!pause.shouldKeepOverdueReinforcement(new Date(now-1000),new Date(now),null),"não cria aviso vencido");
check(pause.setVaultDosePauseMinutes("p1",0,now),"retomar remove pausa");
check(pause.getVaultDosePauseUntil("p1",now)===null,"retomada restaura padrão");
check(pause.setVaultDosePauseMinutes("p1",60,now),"reconfigura para prova nativa");

// Reconciliador de reforços real com Android falso — nunca toca em doses reais.
let pending=[];
const android={
  getPending:async()=>({notifications:pending.map(n=>({...n}))}),
  checkPermissions:async()=>({display:"granted"}),
  cancel:async({notifications})=>{const ids=new Set(notifications.map(n=>n.id));pending=pending.filter(n=>!ids.has(n.id));},
  schedule:async({notifications})=>{for(const n of notifications){pending=pending.filter(old=>old.id!==n.id);pending.push(n);}},
};
const native={isVaultNative:()=>true};
const notifications={ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:"vault_reminders",requestNotificationPermissions:async()=>true};
const slotAuthority={buildDoseSlotIndex:logs=>logs,resolveDoseSlot:(logs,id,date,time)=>logs.find(log=>log.medicamento_id===id&&log.data===date&&log.horario===time)||null,doseSlotIsResolved:log=>Boolean(log?.tomado_em||log?.ignorado_em)};
const overdue=load("lib/overdue-dose-notifications.ts", {
  "@/lib/medication-availability":{hasKnownEmptyMedicationStock:med=>med.estoque_quantidade===0},
  "@capacitor/local-notifications":{LocalNotifications:android},
  "@/lib/native-runtime":native,
  "@/lib/notification-preferences":pref,
  "@/lib/notification-brain":{getVaultNotificationBrainSettings:()=>({doseOverdueOffsets:[30]})},
  "@/lib/dose-alert-policy-m99":{getVaultDoseAlertMode:person=>person==="p1"?"persistente":"suave",doseAlertOffsetsForMode:mode=>mode==="persistente"?[30,60,120,210]:[30]},
  "@/lib/dose-alert-pause-m99p2":pause,
  "@/lib/notifications":notifications,
  "@/lib/dose-slot-authority":slotAuthority,
});
const med=(person,id)=>({id,person_id:person,nome:"Exemplo",status:"ativo",tipo_uso:"continuo",estoque_quantidade:20,estoque_horarios:["12:00"]});
const baseNow=new Date(now);
(async()=>{
  await overdue.reconcileOverdueDoseNotifications({personId:"p2",medicamentos:[med("p2","b")],logs:[],now:baseNow});
  const p2Baseline=pending.filter(n=>n.extra.personId==="p2").map(n=>n.id).sort();
  check(p2Baseline.length===7,"outra pessoa: agenda de 7 dias permanece");
  await overdue.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[],now:baseNow});
  const pausedToday=pending.filter(n=>n.extra.personId==="p1"&&n.extra.data==="2026-11-08");
  check(pausedToday.length===2,"hoje: pausa remove duas primeiras tentativas, mantém posteriores");
  check(pausedToday.every(n=>n.extra.offsetMinutes>=120),"nenhum reforço dentro da pausa");
  check(pending.filter(n=>n.extra.personId==="p1").length===26,"restam 26 tentativas no horizonte da pessoa p1");
  const beforeRepeat=pending.filter(n=>n.extra.personId==="p1").map(n=>n.id).sort();
  await overdue.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[],now:baseNow});
  check(JSON.stringify(pending.filter(n=>n.extra.personId==="p1").map(n=>n.id).sort())===JSON.stringify(beforeRepeat),"retomar/reconciliar não duplica avisos");
  check(JSON.stringify(pending.filter(n=>n.extra.personId==="p2").map(n=>n.id).sort())===JSON.stringify(p2Baseline),"não cancela alarmes de p2");
  const taken={person_id:"p1",medicamento_id:"a",data:"2026-11-08",horario:"12:00",tomado_em:"2026-11-08T12:05:00"};
  await overdue.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[taken],now:baseNow});
  check(!pending.some(n=>n.extra.personId==="p1"&&n.extra.data==="2026-11-08"),"tomada confirmada elimina reforços remanescentes do slot");
  check(pending.filter(n=>n.extra.personId==="p2").length===7,"tomada p1 não altera p2");
  pause.setVaultDosePauseMinutes("p1",0,now);
  await overdue.reconcileOverdueDoseNotifications({personId:"p1",medicamentos:[med("p1","a")],logs:[],now:baseNow});
  check(pending.filter(n=>n.extra.personId==="p1"&&n.extra.data==="2026-11-08").length===4,"retomada permite próximos reforços ainda futuros");
  check(!JSON.stringify(pending).includes("tomado_em"),"pausa não produz registro de ingestão");

  // Prova que o reconciliador de horários usa predicado isolado apenas no caminho normal.
  let ownership=null;
  const reconciliation={reconcileVaultNotificationSet:async(desired, owns)=>{ownership=owns;return {desired:desired.length};},VAULT_NOTIFICATION_FINGERPRINT:"fp",vaultNotificationFingerprint:()=>"hash"};
  const scheduled=load("lib/dose-notifications.ts", {
    "@/lib/medication-availability":{hasKnownEmptyMedicationStock:()=>false},
    "@/lib/notification-reconciliation":reconciliation,
    "@/lib/notification-brain":{getVaultNotificationBrainSettings:()=>({stockReviewTime:"10:00"})},
    "@/lib/notification-preferences":pref,
    "@/lib/native-runtime":native,
    "@capacitor/local-notifications":{LocalNotifications:{...android,registerActionTypes:async()=>{}}},
    "@/lib/dose-slot-authority":slotAuthority,
    "@/lib/notifications":notifications,
  });
  await scheduled.reconcileScheduledDoseNotifications({personId:"p1",medicamentos:[med("p1","a"),med("p2","b")],logs:[],now:new Date(2026,10,8,8,0,0)});
  check(typeof ownership==="function","agenda de horário fornece predicado de propriedade");
  const sample=personId=>({extra:{type:"dose_reminder",personId}});
  check(ownership(sample("p1")) && ownership(sample("p2")),"V226: troca de pessoa substitui a agenda normal anterior");
  check(!ownership({extra:{type:"document_expiry",personId:"p1"}}),"não cancela outros canais de avisos");
  check(ownership({extra:{type:"dose_reminder"}}),"V226: alarmes legados sem pessoa tambem sao recolhidos");

  const hooks=read("hooks/useNotificationRecoveryM99P2.ts");
  compile("hooks/useNotificationRecoveryM99P2.ts");
  compile("components/DoseNotificationReconciler.tsx");
  compile("components/notifications/VaultDoseAlertPanelM99.tsx");
  check(hooks.includes('appStateChange')&&hooks.includes('visibilitychange')&&hooks.includes('pageshow'),"retomada nativa, visibilidade e navegação cobertas");
  const canonical=read("components/DoseNotificationReconciler.tsx");
  check(canonical.includes("useNotificationRecoveryM99P2")&&canonical.includes("recoveryRevision]")&&canonical.includes("doseNotificationPipeline.enqueue("),"retomada no reconciliador canônico");
  check((canonical.match(/useLiveQuery\(/g)||[]).length===1 && canonical.includes('db.transaction("r",[db.medicamentos,db.doseLogs]'),"assinatura transacional V91 preservada");
  const panel=read("components/notifications/VaultDoseAlertPanelM99.tsx");
  check(panel.includes("setVaultDosePauseMinutes")&&panel.includes("Não adia o horário prescrito"),"interface explica que pausa não altera a prescrição");
  check(!panel.includes("doseLogsRepository")&&!panel.includes("setStatus("),"painel não salva tomada");
  const gate=read("scripts/test-v63-release-gate.mjs");
  check(gate.includes('"scripts/test-vault-m99-p2-recovery.cjs"'),"contratos P2 integrados ao gate global");
  console.log(`M99 P2: ${checked} garantias aprovadas; aparelho físico ainda requer homologação.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
