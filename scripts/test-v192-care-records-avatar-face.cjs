const assert = require("node:assert/strict");
const fs = require("node:fs");

const records = fs.readFileSync("app/saude/registros/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

for (const marker of [
  "ListPageHeader",
  "ClinicalListSummary",
  "eventSearchIndex",
  "createLocalSearchIndex",
  "filterLocalSearchIndex",
  'preserveReturn("/saude/registros/evolucao")',
  'preserveReturn("/saude/registros/relatorio")',
  "content-visibility:auto",
]) assert(records.includes(marker), `V192 care record command missing: ${marker}`);

assert(!records.includes("useTratamentos"), "unused treatment subscription must not return");
assert(records.includes('insight&&insight.status!=="normal"'), "missing insight must remain neutral");
assert(records.includes("buildClinicalEvents(registros, allDoseLogs, medicamentos)"), "canonical record+dose timeline must remain");
assert(records.includes("O Vault não diagnostica, não prescreve"), "clinical safety language must remain");

for (const marker of [
  "V192: planos supraorbitais",
  "const browPlane=",
  "const nosePlane=",
]) assert(avatar.includes(marker), `V192 avatar face plane missing: ${marker}`);

assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V192 — CARE RECORDS + AVATAR FACE PLANES CONTRACT OK");
