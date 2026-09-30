import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V77: ${message}`);
  console.log(`OK: ${message}`);
};

const health = read("lib/health-insights.ts");
const contextual = read("lib/health-intelligence/contextual.ts");
const safety = read("lib/health-intelligence/medication-safety.ts");
const carousel = read("components/vault-intelligence/ContextualHealthIntelligence.tsx");
const syncAlert = read("components/GlobalSyncIssueAlert.tsx");
const providers = read("components/Providers.tsx");
const more = read("app/mais/page.tsx");
const brain = read("app/inteligencia/saude/page.tsx");
const medications = read("app/saude/medicamentos/page.tsx");

ok(health.includes("entidadeIds?:"), "insight suporta múltiplas entidades relacionadas");
ok(contextual.includes("item.entidadeIds?.includes(id)"), "contexto encontra interação em qualquer medicamento envolvido");
ok((safety.match(/entidadeIds:/g) || []).length >= 3, "combinações farmacológicas publicam todos os vínculos");
ok(carousel.includes("carousel.scrollTo"), "paginação desloca o carrossel visualmente");
ok(carousel.includes("activeIndex + 1"), "carrossel informa posição atual");
ok(!carousel.includes("max-w-2xl px-5"), "card contextual não recebe margem dupla");
ok(syncAlert.includes("VAULT_GLOBAL_SYNC_FAILURE_V77"), "falha real de sincronização possui aviso global");
ok(providers.includes("<GlobalSyncIssueAlert />"), "aviso global está montado no aplicativo");
ok(syncAlert.includes('runtime.phase !== "error"'), "sincronização normal permanece silenciosa");
ok(more.includes('PersonSelector mode="identity"'), "troca de pessoa mostra a identidade ativa");
ok(more.includes("grid grid-cols-2 gap-2"), "preferências do perfil foram compactadas");
ok(brain.includes("Histórico e ferramentas"), "áreas avançadas do Brain usam expansão progressiva");
ok(brain.includes("daily.items.slice(0, 2)"), "briefing começa resumido");
ok(medications.includes("absolute bottom-2"), "ícone regulatório respeita a curva do card");

console.log("V77 INTELLIGENCE EXPERIENCE — CONTRATO OK");
