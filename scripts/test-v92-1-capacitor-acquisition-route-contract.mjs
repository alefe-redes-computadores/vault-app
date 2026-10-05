import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V92.1: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const config = read("next.config.js");

ok(config.includes('trailingSlash: true'), "export Android exige barra final");
ok(detail.includes("VAULT_CANONICAL_ACQUISITION_NAVIGATION_V92_2"), "V92.1 superada pela navegação canônica");
ok(!detail.includes("if (isVaultNative())"), "APK e PWA não divergem nesta rota");
ok(!detail.includes('target.pathname.endsWith("/")'), "barra final nativa removida");
ok(!detail.includes("window.location.assign(nativePath)"), "reload que retornava à Home removido");
ok(detail.includes("router.push(path)"), "APK e PWA continuam client-side");
ok(!detail.includes("setTimeout(() =>") || !detail.includes("current === initial"), "navegação de aquisição não depende de cronômetro");
ok(detail.includes("/saude/renovacao/nova?medicamento_id=${id}"), "medicamento continua no destino");

console.log("V92.1 CAPACITOR ACQUISITION ROUTE — CONTRATO OK");
