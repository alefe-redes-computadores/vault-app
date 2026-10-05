import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");

ok(detail.includes("VAULT_NAVIGATION_FAILSAFE_V92"), "failsafe V92 instalado");
ok(detail.includes("current === initial"), "retry ocorre somente se a rota não iniciou");
ok(detail.includes("router.push(path)"), "retry preserva navegação client-side");
ok(!detail.includes("window.location.assign(expected)"), "aquisição não recarrega o shell raiz do APK");
ok(detail.includes('"Registrar aquisição"'), "atalho de aquisição preservado");
ok(detail.includes("/saude/renovacao/nova?medicamento_id=${id}"), "destino da aquisição preservado");

console.log("V92 NATIVE ACQUISITION NAVIGATION — CONTRATO OK");
