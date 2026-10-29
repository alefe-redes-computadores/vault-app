const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const doctors = read("app/saude/medicos/page.tsx");
const hospitals = read("app/saude/hospitais/page.tsx");
const locations = read("app/saude/locais/page.tsx");
const doctorDetail = read("app/saude/medicos/detalhes/page.tsx");
const hospitalDetail = read("app/saude/hospitais/detalhes/page.tsx");
const locationDetail = read("app/saude/locais/detalhes/page.tsx");
const listCard = read("components/list/ListCard.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

for (const page of [doctors, hospitals, locations]) {
  assert(page.includes("createLocalSearchIndex"));
  assert(page.includes("filterLocalSearchIndex"));
  assert(page.includes("ClinicalListSummary"));
  assert(page.includes("withReturnTarget"));
  assert(page.includes("navigateFromList"));
}
assert(doctors.includes("...medico.tratamentos.map"));
assert(doctors.includes("...medico.hospitais.map"));
assert(doctors.includes("activeCount={activeFilterCount}"));
assert(hospitals.includes("Sem histórico para a pessoa ativa"));
assert(!hospitals.includes('className="mt-3 grid grid-cols-2 gap-2 border-t'));
assert(locations.includes("proximasConsultas"));
assert(locations.includes("activeCount={activeFilterCount}"));

for (const [detail, fallback] of [
  [doctorDetail, "/saude/medicos"],
  [hospitalDetail, "/saude/hospitais"],
  [locationDetail, "/saude/locais"],
]) {
  assert(detail.includes(`useReturnContext("${fallback}")`));
  assert(detail.includes("router.replace(backTarget)"));
}

assert(listCard.includes('isCompact ? "rounded-[20px]" : "rounded-[24px]"'));
assert(listCard.includes('contentVisibility: "auto"'));
assert(listCard.includes('containIntrinsicSize: isTight ? "116px" : isCompact ? "148px" : "190px"'));
assert(listCard.includes("const isTight = isCompact && compactTight;"));

assert(avatar.includes("V195: postura assimétrica discreta"));
assert(avatar.includes("holdsPhone?.11:.08"));
assert(avatar.includes("holdsPhone?sign*.115:0"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

console.log("VAULT V195 — CARE NETWORK + AVATAR POSTURE CONTRACT OK");
