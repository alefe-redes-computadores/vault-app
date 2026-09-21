import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V36: ${message}`);
};

const scheduler = read("lib/health-reminders/scheduler.ts");
const events = read("lib/health-reminders/event-scheduler.ts");
const reconciler = read("components/HealthReminderReconciler.tsx");
const page = read("app/saude/lembretes/page.tsx");
const dose = read("lib/dose-notifications.ts");
const providers = read("components/Providers.tsx");
const workflow = read(".github/workflows/build-android.yml");

ok(
  scheduler.includes("isNotificationPreferenceEnabled") &&
    scheduler.includes("vaultHealthReminder"),
  "regras sincronizadas não respeitam preferência/cancelamento"
);

ok(
  events.includes("vaultHealthEvent") &&
    events.includes('kind: "consulta" | "exame" | "retirada"') &&
    events.includes("if (!time") &&
    events.includes("MAX_EVENT_PENDING"),
  "scheduler de eventos clínicos incompleto"
);

ok(
  events.includes('event.status === "agendada"') &&
    !events.includes('kind: "sos"'),
  "contrato de status/SOS inválido"
);

ok(
  reconciler.includes("db.consultas") &&
    reconciler.includes("db.exames") &&
    reconciler.includes("db.retiradas") &&
    reconciler.includes("changePerson(extra.personId)") &&
    reconciler.includes('extra.targetRoute?.startsWith("/saude/")'),
  "reconciler clínico/deep-link incompleto"
);

ok(
  page.includes("setNotificationPreferenceEnabled(true)") &&
    page.includes("HEALTH_REMINDERS_RECONCILE_EVENT"),
  "central não ativa/reconcilia preferência local"
);

ok(
  dose.includes('"dose_reminder"') &&
    dose.includes("actionTypeId") &&
    dose.includes("personId"),
  "motor especializado de doses foi regredido"
);

ok(
  providers.includes("HealthReminderReconciler"),
  "Providers perdeu reconciler"
);

ok(
  workflow.includes("patch-android-edge-to-edge-v28.mjs") &&
    workflow.includes("ic_stat_vault.xml"),
  "workflow Android perdeu contratos nativos"
);

console.log("V36 NOTIFICATIONS CONTRACT: OK");
