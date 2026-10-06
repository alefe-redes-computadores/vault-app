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

const requiredRoutes = [
  "/saude/medicamentos/editar?id=${id}",
  "/saude/renovacao/nova?medicamento_id=${id}",
  "/saude/renovacao/nova-receita?medicamento_id=${id}",
  "/saude/medicamentos/historico?id=${id}",
  "/saude/medicos/detalhes?id=${medico.id}",
  "/saude/hospitais/detalhes?id=${hospital.id}",
  "/saude/locais/detalhes?id=${local.id}",
  "/saude/farmacias/detalhes?id=${farmacia.id}",
  "/saude/medicamentos/editar?id=${id}&intent=rede",
  "/saude/renovacao/detalhes?id=${renovacao.id}",
];

for (const route of requiredRoutes) {
  ok(detail.includes(route), `rota preservada: ${route}`);
}

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
