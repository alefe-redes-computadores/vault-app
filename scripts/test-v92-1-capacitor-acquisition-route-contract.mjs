import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92.1: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const config = read("next.config.js");

ok(config.includes('trailingSlash: true'), "export Android exige barra final");
ok(detail.includes("VAULT_CAPACITOR_STATIC_ROUTE_V92_1"), "contrato nativo instalado");
ok(detail.includes("isVaultNative()"), "APK e PWA possuem estratégias separadas");
ok(detail.includes('target.pathname.endsWith("/")'), "rota nativa recebe barra final canônica");
ok(detail.includes("window.location.assign(nativePath)"), "APK abre o arquivo estático correto");
ok(detail.includes("router.push(path)"), "PWA continua client-side");
ok(!detail.includes("setTimeout(() =>") || !detail.includes("current === initial"), "navegação de aquisição não depende de cronômetro");
ok(detail.includes("/saude/renovacao/nova?medicamento_id=${id}"), "medicamento continua no destino");

console.log("V92.1 CAPACITOR ACQUISITION ROUTE — CONTRATO OK");
