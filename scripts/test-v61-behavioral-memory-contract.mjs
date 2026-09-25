import fs from "node:fs";

const r = (f) => fs.readFileSync(f, "utf8");
const ok = (v, m) => {
  if (!v) throw new Error(`V61: ${m}`);
  console.log(`OK: ${m}`);
};

const memory = r("lib/health-intelligence/insight-memory.ts");
const policy = r("lib/health-intelligence/notification-policy.ts");
const reconciler = r("components/InsightNotificationReconciler.tsx");
const longitudinal = r("lib/health-intelligence/longitudinal-insights.ts");

ok(memory.includes("VAULT_INSIGHT_MEMORY_V61"), "memória comportamental existe");
ok(memory.includes("getHealthInsightSemanticKey"), "identidade semântica estável");
ok(memory.includes("state_escalated"), "escalada pode furar cooldown");
ok(memory.includes("36 * 60 * 60 * 1000"), "cooldown adaptativo para importante");

ok(policy.includes("rankHealthInsightNotificationCandidates"), "política ranqueia múltiplos candidatos");
ok(policy.includes('item.categoria !== "agenda"'), "agenda não duplica push");

ok(reconciler.includes("shouldDeliverHealthInsight"), "reconciliador usa memória semântica");
ok(reconciler.includes("eligible.find"), "candidato em cooldown não bloqueia o próximo");
ok(reconciler.includes("recordHealthInsightDelivery"), "entrega é memorizada");

const scheduleAt = reconciler.indexOf("await LocalNotifications.schedule");
const recordAt = reconciler.lastIndexOf("recordHealthInsightDelivery(");

ok(scheduleAt >= 0, "agendamento nativo existe");
ok(recordAt >= 0, "gravação de memória existe");
ok(
  recordAt > scheduleAt,
  "memória só é gravada após agendamento aceito"
);

ok(policy.includes('return "/inteligencia"'), "fallback abre inteligência");

ok(
  longitudinal.includes("retiradas: context.retiradas.filter"),
  "retiradas person-scoped no longitudinal"
);

console.log("VAULT SUPER V61 — CONTRATO OK");
