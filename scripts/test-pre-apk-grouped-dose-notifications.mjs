import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const ok=(condition,message)=>{
  if(!condition) throw new Error(`FALHOU: ${message}`);
  console.log(`OK: ${message}`);
};

const dose=read("lib/dose-notifications.ts");
const nav=read("components/HealthReminderReconciler.tsx");

ok(dose.includes("VAULT_GROUPED_DOSE_REMINDERS_PRE_APK"),"agrupamento de doses instalado");
ok(dose.includes('type:"dose_reminder_group"'),"payload de grupo explícito");
ok(dose.includes("group.length===1"),"dose única preserva notificação individual");
ok(dose.includes("group.length} medicamentos para tomar agora"),"título informa quantidade");
ok(dose.includes('.join(" · ")'),"corpo resume medicamentos");
ok(dose.includes('targetRoute:"/hoje"'),"grupo aponta para Hoje");
ok(!dose.includes('type:"dose_reminder_group",\n        personId,\n        horario:first.horario,\n        data:first.data,\n        medicamentoIds:group.map((slot)=>slot.medicamentoId),\n        targetRoute:"/hoje",\n        actionTypeId'),"grupo não herda ação clínica em massa");
ok(dose.includes('extra?.type==="dose_reminder" || extra?.type==="dose_reminder_group"'),"reconciliação cancela grupos antigos");
ok(nav.includes('extra?.type === "dose_reminder_group"'),"listener reconhece grupo");
ok(nav.includes('extra.targetRoute === "/hoje"'),"deep-link restringido a Hoje");
ok(nav.includes("await changePerson(extra.personId)"),"deep-link respeita pessoa proprietária");
ok(nav.includes('router.push("/hoje")'),"toque abre Hoje");

console.log("VAULT DOSES AGRUPADAS PRÉ-APK — CONTRATO OK");
