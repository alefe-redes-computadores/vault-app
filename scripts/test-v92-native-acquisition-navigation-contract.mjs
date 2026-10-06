import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");

ok(detail.includes("VAULT_MEDICATION_DETAIL_DIRECT_NAVIGATION_V92_3"), "V92 evoluída para navegação direta V92.3");
ok(!detail.includes("canonicalPath"), "barra final artificial removida");
ok(detail.includes("router.push(") && !detail.includes("navigateReliably"), "APK e PWA usam App Router direto");
ok(!detail.includes("window.location.assign(expected)"), "fallback nativo antigo permanece removido");
ok(detail.includes('"Registrar aquisição"'), "atalho de aquisição preservado");
ok(detail.includes("/saude/renovacao/nova?medicamento_id=${id}"), "destino da aquisição preservado");

console.log("V92 NATIVE ACQUISITION NAVIGATION — CONTRATO OK");
