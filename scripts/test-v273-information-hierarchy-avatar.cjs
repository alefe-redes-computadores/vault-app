const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, label) => {
  if (!value) throw new Error(`V273: ${label}`);
  console.log("OK:", label);
};

const central = read("app/inteligencia/alertas/page.tsx");
const insight = read("app/inteligencia/page.tsx");
const today = read("app/hoje/page.tsx");
const forecast = read("components/saude/CareForecastAgenda.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

ok(central.includes("Cobertura e qualidade") && central.includes("<details"), "Central consolida qualidade, cobertura e trilhas");
ok(!central.includes('aria-label="Resumo da inteligência"'), "Central remove contadores duplicados");
ok(insight.includes("health.experienceHighlights.slice(0, 2)"), "Vault Insight limita destaques antes da Central");
ok(insight.includes("itens analisados sem abrir dados sensíveis"), "inventário sensível usa resumo progressivo");
ok(today.includes("!healthIntelligence.careCommand?.decision"), "Hoje não duplica comando e briefing");
ok(today.includes('aria-label="Diário rápido do dia"') && today.includes("<details"), "diário rápido permanece acessível e recolhível");
ok(forecast.includes("agenda.slice(0, 2)") && forecast.includes("Ver próximas"), "previsão mostra foco antes da cauda");
ok(avatar.includes("opacity: .42") && avatar.includes("opacity:.075"), "Avatar suaviza brilho ocular e reflexo das lentes");
ok(central.includes('contentVisibility:"auto"'), "lista longa preserva renderização progressiva");

console.log("\nVAULT V273 — HIERARQUIA GLOBAL + AVATAR: OK");
