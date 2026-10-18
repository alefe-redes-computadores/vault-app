const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("app/saude/minha-saude/page.tsx", "utf8");
const readings = fs.readFileSync("components/saude/AvatarReadings.tsx", "utf8");

assert(readings.includes('aria-label="Sinais recentes representados no avatar"'));
assert(readings.includes("Última medição válida por categoria"));
assert(!readings.includes("return <details"), "AvatarReadings não deve criar expansão aninhada");
assert(readings.includes("memo(function AvatarReadings"), "resumo precisa evitar renderizações sem mudança");
assert(readings.includes("Ausência de dado não significa valor zero"));
assert(page.includes("Valores recentes e acesso ao histórico"));
assert(page.includes("goFromHealth('/saude/registros')"));
assert(page.includes("Minha rede de dados"));
assert(page.includes("Gerenciar"));
assert(!page.includes("<HealthMetricTrend"), "tendências pesadas pertencem ao detalhe, não ao resumo");
assert(!page.includes("Abdômen · peso"), "peso duplicado deve permanecer no sinal e no detalhe");

console.log("VAULT V172 — HEALTH OVERVIEW CONTRACT OK");
