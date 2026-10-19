const assert = require("node:assert/strict");
const fs = require("node:fs");

const access = fs.readFileSync("app/saude/renovacao/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

assert(access.includes('title="Receitas e aquisições"'));
assert(access.includes("MedicationFormatIcon"), "medication identity must be preserved in history");
assert(access.includes('density="compact"'), "history cards must use compact density");
assert(access.includes("withReturnTarget"), "create/detail flows need contextual return");
assert(access.includes('filtroAquisicao === "receita"'), "prescription-only events must be filterable");
assert(access.includes("comprasComValor"), "financial summary must distinguish missing prices from zero");
assert(access.includes("localDateISO()"), "future-date warning must follow local day");
assert(!access.includes('title="Histórico de Renovações"'));

for (const marker of ["V186: a transição pélvica", "const waist=", "const waistSeam=", "const ankleContour=", "const vamp=", "const heelCounter="]) {
  assert(avatar.includes(marker), `V186 avatar continuity missing: ${marker}`);
}
assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V186 — MEDICATION ACCESS + AVATAR CONTINUITY CONTRACT OK");
