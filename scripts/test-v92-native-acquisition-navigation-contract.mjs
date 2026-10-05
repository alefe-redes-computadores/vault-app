import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");

ok(detail.includes("VAULT_CAPACITOR_STATIC_ROUTE_V92_1"), "rota nativa V92.1 instalada");
ok(detail.includes("canonicalPath"), "APK normaliza a barra final do export estático");
ok(detail.includes("router.push(path)"), "PWA preserva navegação client-side");
ok(!detail.includes("window.location.assign(expected)"), "fallback nativo antigo permanece removido");
ok(detail.includes('"Registrar aquisição"'), "atalho de aquisição preservado");
ok(detail.includes("/saude/renovacao/nova?medicamento_id=${id}"), "destino da aquisição preservado");

console.log("V92 NATIVE ACQUISITION NAVIGATION — CONTRATO OK");
