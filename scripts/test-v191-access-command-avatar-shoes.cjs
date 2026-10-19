const assert = require("node:assert/strict");
const fs = require("node:fs");

const access = fs.readFileSync("app/saude/renovacao/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

for (const marker of [
  "ClinicalListSummary",
  "Receita ≠ aquisição",
  "renewalSearchIndex",
  "createLocalSearchIndex",
  "filterLocalSearchIndex",
  "activeFilterCount",
  'setSearch("")',
  "content-visibility:auto",
]) assert(access.includes(marker), `V191 access command missing: ${marker}`);

for (const preserved of [
  "isPrescriptionOnly",
  "comprasComValor",
  "totalCompras",
  "analisarValidadeReceita",
  "getEffectiveAcquisitionDate",
  "withReturnTarget",
]) assert(access.includes(preserved), `access integrity contract lost: ${preserved}`);

for (const marker of [
  "V191: linhas de construção",
  "const toeSeam=",
  "const heelStabilizer=",
  "const sidePanel=",
]) assert(avatar.includes(marker), `V191 avatar footwear missing: ${marker}`);

assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V191 — ACCESS COMMAND + AVATAR FOOTWEAR CONTRACT OK");
