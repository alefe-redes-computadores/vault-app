const assert = require("node:assert/strict");
const fs = require("node:fs");

const treatments = fs.readFileSync("app/saude/tratamentos/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

for (const marker of [
  "ClinicalListSummary",
  'badgeLabel="CUIDADO CONECTADO"',
  "treatmentCommand",
  "TreatmentIdentityIconR03",
  "treatmentColor",
  "withReturnTarget",
  "content-visibility:auto",
]) assert(treatments.includes(marker), `V190 treatment command missing: ${marker}`);

assert(treatments.includes("<TreatmentIdentityIconR03 entity={tratamento}"), "rendered treatment identity must use canonical owned entity");
assert.equal((treatments.match(/useMedicamentos\(\)/g) || []).length, 1, "treatment list must have one medication subscription");
assert(treatments.includes("analisarTratamento"), "treatment insight must remain");
assert(treatments.includes("gastoPorMedicamento"), "acquisition history must remain");
assert(treatments.includes("tratamento.medicamentosResumo.map(m=>m.nome).join(' · ')"), "medication identity must remain");

for (const marker of [
  "V190: coxa, joelho e panturrilha",
  "const thighPlane=",
  "const kneeBridge=",
  "const calfPlane=",
]) assert(avatar.includes(marker), `V190 avatar legs missing: ${marker}`);

assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V190 — TREATMENT COMMAND + AVATAR LEGS CONTRACT OK");
