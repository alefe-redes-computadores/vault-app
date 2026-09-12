import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const ok = (condition, label) => {
  if (!condition) throw new Error(`FALHOU: ${label}`);
  checks.push(label);
  console.log(`OK: ${label}`);
};

const hydration = read("app/saude/hidratacao/page.tsx") ? read("app/saude/hidratacao/page.tsx") : "";
const reminders = read("app/saude/lembretes/page.tsx");
const domain = read("lib/health-reminders/domain.ts");
const scheduler = read("lib/health-reminders/scheduler.ts");
const reminderRepo = read("lib/repositories/healthReminders.ts");
const goalRepo = read("lib/repositories/healthGoals.ts");
const history = read("lib/medication-dose-history.ts");
const historyPage = read("app/saude/medicamentos/historico/page.tsx");
const today = read("app/hoje/page.tsx");
const realtime = read("hooks/useSupabaseRealtime.ts");
const reconciler = read("components/HealthReminderReconciler.tsx");

ok(!hydration.includes("??2000") && !hydration.includes("?? 2000"), "hidratação não inventa meta padrão");
ok(hydration.includes("sem meta definida") && hydration.includes("deleteRegistro"), "hidratação explica meta ausente e permite corrigir registro");
ok(hydration.includes("Dias sem registro não são tratados como consumo zero"), "ausência de hidratação continua diferente de zero");
ok(reminders.includes("HEALTH_REMINDER_TARGETS") && reminders.includes("Registrar medição") === false, "editor usa destinos canônicos do domínio");
ok(domain.includes('frequency === "weekly" && weekdays.length !== 1'), "semanal exige exatamente um dia");
ok(domain.includes('frequency === "custom" && weekdays.length === 0'), "personalizado exige dias explícitos");
ok(domain.includes("targetRoute.startsWith") && domain.includes("HEALTH_REMINDER_TARGETS.some"), "rota de notificação é interna e reconhecida");
ok(scheduler.includes("const permission = await getHealthReminderPermission()") && scheduler.includes("export async function requestHealthReminderPermission"), "reconciliação não pede permissão sem ação do usuário");
ok(scheduler.includes("reminderRunsOnWeekday"), "agenda respeita frequência validada");
ok(reminderRepo.includes("assertOwnedPerson") && goalRepo.includes("assertOwnedPerson"), "lembretes e metas validam dono da pessoa");
ok(history.includes("recordCoveragePercent") && !history.includes("adherencePercent"), "histórico mede cobertura de registros, não adesão clínica");
ok(historyPage.includes("horários revisados"), "interface explica a métrica de cobertura");
ok(today.includes('.where("person_id")') && today.includes(".equals(activePersonId)"), "Hoje carrega histórico somente da pessoa ativa");
ok(realtime.includes("onAuthStateChange") && realtime.includes("activeUserId !== userId"), "Realtime acompanha sessão e mantém isolamento do usuário");
ok(realtime.includes("pending || local?.synced === false"), "Realtime não sobrescreve alteração local pendente");
ok(reconciler.includes('App.addListener("resume"') && reconciler.includes("person.user_id !== user.id"), "notificações reconciliam ao retomar e validam a pessoa");

console.log(`CONTRATOS SUPERCIRURGIA V5: OK (${checks.length})`);
