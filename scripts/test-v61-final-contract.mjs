import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V61-FINAL: ${message}`);
  console.log(`OK: ${message}`);
};

const memoryPath = "lib/health-intelligence/insight-memory.ts";
ok(fs.existsSync(memoryPath), "insight-memory existe");

const memory = read(memoryPath);
const policy = read("lib/health-intelligence/notification-policy.ts");
const reconciler = read("components/InsightNotificationReconciler.tsx");
const longitudinal = read("lib/health-intelligence/longitudinal-insights.ts");

ok(/export function getHealthInsightSemanticKey\s*\(/.test(memory), "semantic key estável exportada");
ok(/export function getHealthInsightStateSignature\s*\(/.test(memory), "state signature exportada");
ok(/state_escalated/.test(memory) && /didEscalate\s*\(/.test(memory), "escalada de estado implementada");
ok(/state_changed/.test(memory) && /didChangeSubstantially\s*\(/.test(memory), "mudança substantiva implementada");
ok(/12 \* 60 \* 60 \* 1000/.test(memory) && /36 \* 60 \* 60 \* 1000/.test(memory) && /72 \* 60 \* 60 \* 1000/.test(memory), "cooldown adaptativo 12h/36h/72h");
ok(/storageKey\(personId, semanticKey\)/.test(memory), "memória é person-scoped");
ok(/catch\s*\{[\s\S]*?return null;[\s\S]*?\}/.test(memory) && /localStorage\.setItem/.test(memory), "falha de storage é tolerada");

ok(/export function rankHealthInsightNotificationCandidates\s*\(/.test(policy), "policy ranqueia múltiplos candidatos");
ok(/categoria === ["']agenda["']/.test(policy) && /return false/.test(policy), "agenda excluída do push comportamental");
ok(/gravidadeSeguranca/.test(policy) && /urgencia/.test(policy) && /confianca/.test(policy) && /amostra/.test(policy), "ranking usa gravidade, urgência, confiança e amostra");
ok(/export function selectHealthInsightNotificationCandidate\s*\(/.test(policy), "compatibilidade antiga preservada");
ok(/export function getHealthInsightNotificationRoute\s*\(/.test(policy), "helper de rota contextual existe");
ok(/insight\.link\?\.trim\(\)/.test(policy) && /return ["']\/inteligencia["']/.test(policy), "helper preserva rota contextual e fallback Central");

ok(/rankHealthInsightNotificationCandidates\(insights\)/.test(reconciler), "reconciliador usa ranking múltiplo");
ok(/shouldDeliverHealthInsight\(activePersonId, candidate\)/.test(reconciler), "memória é consultada por candidato antes da seleção");
ok(/eligible\.find\(\(item\) => item\.decision\.deliver\)/.test(reconciler), "primeiro candidato realmente elegível é escolhido");
ok(/notifications:\s*\[\s*\{/.test(reconciler), "ciclo agenda uma única notificação");
ok(/getHealthInsightNotificationRoute\(\s*candidate\s*\)/.test(reconciler), "reconciliador usa helper de rota");

const asyncFlow = reconciler.match(/void \(async \(\) => \{([\s\S]*?)\}\)\(\)\.catch/);
ok(Boolean(asyncFlow), "fluxo assíncrono de entrega identificado");
const flow = asyncFlow?.[1] ?? "";
const schedule = flow.indexOf("await LocalNotifications.schedule(");
const record = flow.indexOf("recordHealthInsightDelivery(");
ok(schedule >= 0 && record > schedule, "memória é gravada somente após await schedule");

ok(/retiradas:\s*context\.retiradas\.filter\(\(item\) => item\.person_id === context\.personId\)/.test(longitudinal), "retiradas são person-scoped no longitudinal");

console.log("VAULT V61-FINAL — CONTRATO OK");
