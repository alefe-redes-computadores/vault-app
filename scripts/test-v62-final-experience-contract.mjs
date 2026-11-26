import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V62 FINAL: ${message}`);
  console.log(`OK: ${message}`);
};

const today = read("app/hoje/page.tsx");
const hydration = read("components/saude/HydrationPanel.tsx");
const reminders = read("app/saude/lembretes/page.tsx");
const reconciler = read("components/InsightNotificationReconciler.tsx");

ok(today.includes("batchOperationLock.current"), "lote possui mutex síncrono");
ok(today.includes("const entries=[...frozenEntries]")&&today.includes("setBatchFrozen({context:doseIdentityContext,entries})"), "lote opera sobre fotografia estável");
ok(today.includes("civilDoseInstant(dataSelecionada,hour,startedAt)")&&today.includes("tomadoEm:takenAt"), "lote preserva horário real");
ok(today.includes("confirmDoseCorrection")&&today.includes("id:expected.id,expected,adjustStock:target.action"), "correção individual exige ID, snapshot e recibo");

ok(hydration.includes("operationLock.current"), "hidratação bloqueia toque duplicado");
ok(hydration.includes("Desfazer último registro"), "hidratação oferece desfazer imediato");
ok(hydration.includes("Dias sem registro não são tratados como consumo zero"), "ausência não vira zero");
ok(hydration.includes("Meta diária opcional"), "meta continua explicitamente opcional");

ok(reminders.includes("formOpen"), "formulário de lembrete usa abertura progressiva");
ok(reminders.includes("advancedOpen"), "configuração avançada fica recolhida");
ok(reminders.includes("NotificationPreferencesPanel"), "preferências continuam acessíveis");
ok(reminders.includes("NotificationBrainPanel"), "cérebro de notificações continua acessível");

ok(reconciler.includes("insight-memory"), "reconciliador usa memória semântica única");
ok(!reconciler.includes("notification-memory"), "memória órfã não é consumida");

console.log("VAULT V62 · EXPERIÊNCIA FINAL — CONTRATO OK");
