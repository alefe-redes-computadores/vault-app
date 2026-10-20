const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const read = (file) => fs.readFileSync(file, "utf8");
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (name) => name.startsWith("@/") ? load(`${name.slice(2)}.ts`) : require(name);
  mod._compile(ts.transpileModule(read(filename), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return mod.exports;
}

const relation = load("lib/health-profile/relation-context.ts");
const rows = {
  doctors: [
    { id: "d-reverse", user_id: "u", nome: "Dra. Ligada", hospital_ids: ["h-forward"] },
    { id: "d-forward", user_id: "u", nome: "Dr. Direto" },
    { id: "foreign-doctor", user_id: "other", nome: "Não pertence" },
  ],
  hospitals: [
    { id: "h-reverse", user_id: "u", nome: "Hospital Reverso", medico_ids: ["d-forward"], tratamento_ids: ["t-forward"] },
    { id: "h-forward", user_id: "u", nome: "Hospital Direto" },
  ],
  places: [{ id: "l", user_id: "u", nome: "Clínica", medico_ids: ["d-forward"] }],
  pharmacies: [],
  treatments: [
    { id: "t-forward", user_id: "u", person_id: "p", nome: "Respiratório", status: "ativo", cor: "#22C55E" },
    { id: "t-reverse", user_id: "u", person_id: "p", nome: "Cardíaco", status: "ativo", cor: "#EF4444", hospital_ids: ["h-forward"], local_ids: ["l"] },
    { id: "foreign-treatment", user_id: "other", person_id: "p", nome: "Segredo", status: "ativo", hospital_ids: ["h-forward"] },
  ],
};
const hospital = relation.buildRelationMetadata("hospital", "u", "p", rows);
assert.match(hospital["h-reverse"].detail, /Dr\. Direto/);
assert.match(hospital["h-reverse"].detail, /Respiratório/);
assert.match(hospital["h-forward"].detail, /Dra\. Ligada/);
assert.match(hospital["h-forward"].detail, /Cardíaco/);
assert(!hospital["h-forward"].detail.includes("Segredo"));
assert.equal(hospital["h-forward"].color, "#EF4444");
const place = relation.buildRelationMetadata("place", "u", "p", rows);
assert.match(place.l.detail, /Dr\. Direto/);
assert.match(place.l.detail, /Cardíaco/);

const picker = read("components/saude/HealthRelationPicker.tsx");
assert(picker.includes('data-care-network="bidirectional"'));
assert(picker.includes('kind==="doctor"||kind==="hospital"||kind==="place"'));
assert(picker.includes("border-rose-400/25 bg-rose-400/10"));

const metrics = read("components/saude/HealthMetricDetails.tsx");
assert(metrics.includes("devicesByOwnerAndId"));
assert(metrics.includes("groupedRows"));
assert(!metrics.includes("rows.filter(r=>r.data===day)"));
assert(!metrics.includes("devices.find(d=>d.id===r.device_id"));
const supply = read("components/saude/SupplyPreparation.tsx");
assert(supply.includes("const medsById=useMemo"));
assert(!supply.includes("meds.find((m) => m.id === i.medicamento_id)"));
const pharmacyDetails = read("app/saude/farmacias/detalhes/page.tsx");
assert(pharmacyDetails.includes("const medicamentosById = useMemo"));
assert(!pharmacyDetails.includes("medicamentos.find("));

const doctors = read("app/saude/medicos/page.tsx");
const hospitals = read("app/saude/hospitais/page.tsx");
const places = read("app/saude/locais/page.tsx");
const pharmacies = read("app/saude/farmacias/page.tsx");
assert(doctors.includes('badgeColor="text-violet-300"'));
assert(hospitals.includes('badgeColor="text-rose-300"'));
assert(places.includes('badgeColor="text-cyan-300"'));
for (const page of [doctors, places, pharmacies]) assert(page.includes("min-h-9 shrink-0 rounded-xl border"));

const avatar = read("components/saude/HealthAvatar3D.tsx");
assert(avatar.includes("V200: o centro facial"));
assert(avatar.includes("const philtrum=mesh(taperedBox("));
assert(avatar.includes("const lowerLip=mesh(taperedBox("));
assert(!avatar.includes("requestAnimationFrame(animate)"));

console.log("VAULT V200 — BIDIRECTIONAL CARE + LIST PERFORMANCE + SEMANTIC VISUAL + AVATAR CONTRACT OK");
