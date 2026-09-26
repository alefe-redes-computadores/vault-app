import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`VAULT SUPER FINAL: ${message}`);
  console.log(`OK: ${message}`);
};

const contextual = read("components/vault-intelligence/ContextualHealthIntelligence.tsx");
const renewal = read("app/saude/renovacao/detalhes/page.tsx");
const record = read("app/saude/registros/detalhes/page.tsx");
const releaseGate = read("scripts/test-v63-release-gate.mjs");
const policy = read("lib/health-intelligence/notification-policy.ts");
const memory = read("lib/health-intelligence/insight-memory.ts");
const longitudinal = read("lib/health-intelligence/longitudinal-insights.ts");

ok(contextual.includes("relatedEntityType") && contextual.includes("relatedEntityId"), "Vault Insight aceita contexto relacionado sem duplicar o cérebro");
ok(contextual.includes("new Set<string>()") && contextual.includes(".slice(0, 3)"), "contexto relacionado é deduplicado e limitado");
ok(!contextual.includes("VAULT INSIGHT · V60"), "superfície contextual não exibe versão técnica obsoleta");
ok(renewal.includes('entityType="renovacao"') && renewal.includes('relatedEntityType="medicamento"'), "Renovação recebeu Vault Insight contextual ligado ao medicamento");
ok(record.includes('entityType="registro"') && record.includes('registro.medicamento_id ? "medicamento" : undefined'), "Registro de saúde recebeu Vault Insight sem inventar vínculo medicamentoso");
ok(policy.includes("rankHealthInsightNotificationCandidates") && policy.includes('insight.categoria === "agenda"'), "push comportamental preserva ranking múltiplo e exclui agenda");
ok(memory.includes("getHealthInsightSemanticKey") && memory.includes("recordHealthInsightDelivery"), "memória semântica V61-FINAL permanece canônica");
ok(longitudinal.includes("context.personId") && longitudinal.includes("retiradas"), "longitudinal preserva retiradas person-scoped");
ok(releaseGate.includes("test-v61-final-contract.mjs"), "release gate inclui contrato final da memória comportamental");
ok(releaseGate.includes("test-v64-super-final-contract.mjs"), "release gate inclui contrato da SUPER FINAL");

console.log("VAULT SUPER FINAL · FREEZE CONTRACT OK");
