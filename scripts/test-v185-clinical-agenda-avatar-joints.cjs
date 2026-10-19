const assert = require("node:assert/strict");
const fs = require("node:fs");

const consultations = fs.readFileSync("app/saude/consultas/page.tsx", "utf8");
const exams = fs.readFileSync("app/saude/exames/page.tsx", "utf8");
const surgeries = fs.readFileSync("app/saude/cirurgias/page.tsx", "utf8");
const summary = fs.readFileSync("components/saude/ClinicalListSummary.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

for (const [name, source, route] of [
  ["consultas", consultations, "/saude/consultas/detalhes"],
  ["exames", exams, "/saude/exames/detalhes"],
  ["cirurgias", surgeries, "/saude/cirurgias/detalhes"],
]) {
  assert(source.includes("ClinicalListSummary"), `${name}: compact summary missing`);
  assert(source.includes('density="compact"'), `${name}: compact list density missing`);
  assert(source.includes("preserveReturn("), `${name}: contextual return missing`);
  assert(source.includes(route), `${name}: detail route missing`);
}

assert(consultations.includes("consulta.person_id ===") && consultations.includes("activePersonId"));
assert(exams.includes("exame.person_id === activePersonId"));
assert(surgeries.includes("cirurgia.person_id === activePersonId"));
assert(summary.includes('grid-cols-3') && summary.includes('rounded-[18px]'));
assert(summary.includes("Situação") === false, "shared summary must remain domain-neutral");

for (const marker of ["articulações facetadas", "const elbowContour=", "const patella=", "taperedBox(.162,.178,.155,.145)"]) {
  assert(avatar.includes(marker), `V185 avatar joint missing: ${marker}`);
}
assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V185 — CLINICAL AGENDA + AVATAR JOINTS CONTRACT OK");
