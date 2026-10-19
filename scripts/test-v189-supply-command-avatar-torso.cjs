const assert = require("node:assert/strict");
const fs = require("node:fs");

const supply = fs.readFileSync("app/saude/fornecimento/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

for (const marker of [
  "ListPageHeader",
  "ClinicalListSummary",
  "useReturnContext",
  "activeProcesses",
  "cyclesInProgress",
  "overflow-x-auto",
  "Consultar cobertura e catálogo SUS",
  "<SusCatalogBrowser compact />",
]) assert(supply.includes(marker), `V189 supply command missing: ${marker}`);

for (const preserved of [
  "ProcessForm",
  "SupplyCycleSummary",
  "ContextualHealthIntelligence",
  "repo.create",
  "repo.newCycle",
]) assert(supply.includes(preserved), `supply clinical contract lost: ${preserved}`);

for (const marker of [
  "V189: planos peitorais",
  "const chestPlane=",
  "const sideSeam=",
  "const backSpineSeam=",
  "const lowerBackPlane=",
]) assert(avatar.includes(marker), `V189 avatar torso missing: ${marker}`);

assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V189 — SUPPLY COMMAND + AVATAR TORSO CONTRACT OK");
