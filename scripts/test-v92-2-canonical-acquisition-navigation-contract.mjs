import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92.2: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const intelligence = read("components/vault-intelligence/ContextualHealthIntelligence.tsx");

ok(detail.includes("VAULT_MEDICATION_DETAIL_DIRECT_NAVIGATION_V92_3"), "V92.2 evoluída para V92.3");
ok(intelligence.includes("router.push(href)"), "referência funcional da Home permanece client-side");
ok(detail.includes("router.push(") && !detail.includes("navigateReliably"), "detalhes usa App Router diretamente como as demais telas");
ok(!detail.includes("window.location.assign(nativePath)"), "reload nativo removido");
ok(!detail.includes("current === initial"), "retry V92 removido");
ok(!detail.includes("canonicalPath"), "barra final V92.1 removida");
ok(detail.includes('label:\n        "Registrar aquisição"'), "menu distingue aquisição de receita");
ok(detail.includes('"Adicionar nova receita"'), "ação de receita continua separada");
ok(detail.includes("/saude/renovacao/nova?medicamento_id=${id}"), "destino e medicamento preservados");

console.log("V92.2 CANONICAL ACQUISITION NAVIGATION — CONTRATO OK");
