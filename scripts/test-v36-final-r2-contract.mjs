import fs from "node:fs";
const r=(f)=>fs.readFileSync(f,"utf8");
const ok=(v,m)=>{if(!v)throw new Error("V36 FINAL R2: "+m)};

const prefs=r("lib/notification-preferences.ts");
const panel=r("components/NotificationPreferencesPanel.tsx");
const dose=r("lib/dose-notifications.ts");
const health=r("lib/health-reminders/scheduler.ts");
const events=r("lib/health-reminders/event-scheduler.ts");
const persistent=r("lib/notifications.ts");
const insights=r("components/InsightNotificationReconciler.tsx");
const providers=r("components/Providers.tsx");
const page=r("app/saude/lembretes/page.tsx");
const cap=JSON.parse(r("capacitor.config.json"));
const workflow=r(".github/workflows/build-android.yml");
const icon=r("assets/android/ic_stat_vault.xml");

for(const c of [
 "doses","consultas","exames","retiradas",
 "renovacoes","documentos","lembretes_saude","insights"
]) ok(prefs.includes(`"${c}"`),`categoria ${c} ausente`);

ok(panel.includes("Notificações do Vault"),"painel visual ausente");
ok(page.includes("<NotificationPreferencesPanel />"),"painel não montado");
ok(dose.includes('isVaultNotificationCategoryEnabled("doses")'),"dose sem categoria");
ok(dose.includes("LocalNotifications.schedule"),"motor de doses foi perdido");
ok(health.includes('isVaultNotificationCategoryEnabled("lembretes_saude")'),"health reminders sem categoria");
ok(events.includes('isVaultNotificationCategoryEnabled("consultas")'),"consultas sem categoria");
ok(events.includes('isVaultNotificationCategoryEnabled("exames")'),"exames sem categoria");
ok(events.includes('isVaultNotificationCategoryEnabled("retiradas")'),"retiradas sem categoria");
ok(persistent.includes('isVaultNotificationCategoryEnabled("documentos")'),"documentos sem categoria");
ok(persistent.includes('isVaultNotificationCategoryEnabled("renovacoes")'),"renovações sem categoria");

ok(
 insights.includes('gravidadeSeguranca === "importante"') &&
 insights.includes('gravidadeSeguranca === "critica"'),
 "insights não são conservadores"
);
ok(insights.includes("COOLDOWN_MS"),"cooldown de insight ausente");
ok(insights.includes(".slice(0, 1)"),"limite anti-spam ausente");
ok(providers.includes("<InsightNotificationReconciler />"),"insights não montados");

ok(cap.plugins?.LocalNotifications?.smallIcon==="ic_stat_vault","smallIcon incorreto");
ok(workflow.includes("assets/android/ic_stat_vault.xml"),"workflow perdeu ícone");
ok(icon.includes("#FFFFFFFF"),"ícone não contém foreground branco");
ok(icon.includes("@android:color/transparent"),"ícone não é transparente");

ok(events.includes("parseEventDate"),"event scheduler perdeu parser de data/hora");
console.log("V36 FINAL R2 CONTRACT: OK");
