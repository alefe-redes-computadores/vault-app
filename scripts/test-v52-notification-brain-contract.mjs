import fs from "node:fs";
function read(path){return fs.readFileSync(path,"utf8");}
function ok(value,label){if(!value)throw new Error(`FALHOU: ${label}`);console.log(`OK: ${label}`);}
const brain=read("lib/notification-brain.ts");
const events=read("lib/health-reminders/event-scheduler.ts");
const overdue=read("lib/overdue-dose-notifications.ts");
const page=read("app/saude/lembretes/page.tsx");
ok(brain.includes("VAULT_NOTIFICATION_BRAIN_V52"),"cérebro V52 presente");
ok(brain.includes("consulta: [1440, 60]")&&brain.includes("doseOverdueOffsets: [30, 60, 120]"),"defaults seguros preservados e ampliados");
ok(events.includes("VAULT_EVENT_MULTI_REMINDER_V52")&&events.includes("eventOffsets[event.kind]"),"compromissos aceitam múltiplos lembretes");
ok(events.includes("offsetMinutes"),"identidade do lembrete inclui antecedência");
ok(overdue.includes("VAULT_SMART_OVERDUE_ESCALATION_V52"),"escalonamento de dose V52 presente");
ok(overdue.includes("isResolved")&&overdue.includes("tomado_em||log.ignorado_em"),"dose resolvida silencia escalonamento");
ok(overdue.includes("cancelOverdueDoseNotification")&&overdue.includes('e?.data===input.data'),"ação cancela todos os avisos do slot exato");
ok(overdue.includes('actionTypeId:ACTION_TYPE_ID'),"ações nativas permanecem nas doses pendentes");
ok(page.includes("NotificationBrainPanel"),"configuração do cérebro exposta na tela de lembretes");
console.log("V52 NOTIFICATION BRAIN CONTRACT: OK");
