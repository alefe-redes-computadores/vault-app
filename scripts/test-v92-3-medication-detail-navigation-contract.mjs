import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92.3: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const consultation = read("app/saude/consultas/detalhes/page.tsx");

ok(
  detail.includes("VAULT_MEDICATION_DETAIL_DIRECT_NAVIGATION_V92_3"),
  "contrato transversal V92.3 instalado"
);

ok(
  !detail.includes("navigateReliably"),
  "helper exclusivo de Medicamento Detalhes removido"
);

ok(
  !detail.includes("window.location.assign(") &&
    !detail.includes("current === initial") &&
    !detail.includes("canonicalPath"),
  "reload, retry e canonicalização V78–V92.1 continuam removidos"
);

ok(
  consultation.includes("router.push(") &&
    detail.includes("router.push("),
  "Medicamento Detalhes segue o padrão funcional de Consulta Detalhes"
);

ok(
  /handleMenuOptionClick[\s\S]*?setIsMenuFlutuanteOpen\([\s\S]*?false[\s\S]*?\)[\s\S]*?router\.push\(path\)/.test(detail),
  "menu fecha explicitamente e navega diretamente"
);

// FIX2: direct routes remain on the page; the four care-network routes
// are delegated to the existing (authorized) component and opened via router.
const requiredDirectRoutes = [
  "/saude/medicamentos/editar?id=${id}",
  "/saude/renovacao/nova?medicamento_id=${id}",
  "/saude/renovacao/nova-receita?medicamento_id=${id}",
  "/saude/medicamentos/historico?id=${id}",
  "/saude/medicamentos/editar?id=${id}&intent=rede",
];
for (const route of requiredDirectRoutes) {
  ok(detail.includes(route), `rota preservada: ${route}`);
}

const network = read("components/saude/MedicationCareNetworkDetails.tsx");
ok(detail.includes("<MedicationCareNetworkDetails") &&
   detail.includes("onNavigate={href=>router.push(href)}"),
   "rede de cuidado navega pelo App Router da página autorizadora");
ok(network.includes("if (id?.trim())") &&
   network.includes('type: "medicos" | "hospitais" | "locais" | "farmacias"'),
   "rede valida ID e limita o tipo de destino");

// Extract the actual route template from the presentational component,
// execute it with synthetic IDs, and check encoded paths (not mock URLs).
const template = network.match(/onNavigate\(`(\/saude\/\$\{type\}\/detalhes\?id=\$\{encodeURIComponent\(id\)\})`\)/);
ok(Boolean(template), "rede mantém template protegido por encodeURIComponent");
const routeFor = new Function("type", "id", `"use strict"; return \`${template[1]}\`;`);
for (const [type, action] of [
  ["medicos", 'navigate("medicos",doctor.id)'],
  ["hospitais", 'nodeActions("hospitais",hospital)'],
  ["locais", 'nodeActions("locais",location)'],
  ["farmacias", 'nodeActions("farmacias",pharmacy)'],
]) {
  ok(network.includes(action), `${type}: ação real preservada`);
  ok(routeFor(type, "id 1/2&3") === `/saude/${type}/detalhes?id=id%201%2F2%263`,
    `${type}: rota codificada preservada`);
}
// A purchase ID may contain reserved characters; its navigation is now
// explicitly encoded and returns to the medication details page.
ok(detail.includes('onOpen={() => renovacao.id && router.push(`/saude/renovacao/detalhes?id=${encodeURIComponent(renovacao.id)}&return_to=') &&
   detail.includes('encodeURIComponent(`/saude/medicamentos/detalhes?id=${id}`)'),
   "aquisição abre detalhe com ID codificado e retorno contextual");

ok(
  detail.includes('"Registrar aquisição"') &&
    detail.includes('"Adicionar nova receita"'),
  "V93 mantém aquisição e nova receita como ações distintas"
);

ok(
  detail.includes("return_to=${encodeURIComponent(`/saude/medicamentos/detalhes?id=${id}`)}"),
  "retorno ao medicamento de origem preservado"
);

console.log("V92.3 MEDICATION DETAIL DIRECT NAVIGATION — CONTRATO OK");
