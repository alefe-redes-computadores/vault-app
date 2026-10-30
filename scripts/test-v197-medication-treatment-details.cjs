const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const medications = read("app/saude/medicamentos/page.tsx");
const medicationDetail = read("app/saude/medicamentos/detalhes/page.tsx");
const treatments = read("app/saude/tratamentos/page.tsx");
const treatmentDetail = read("app/saude/tratamentos/detalhes/page.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

assert(medications.includes("V197: uma única passagem alimenta resumo"));
assert(medications.includes("const totalAtivos = statsProgresso.ativos"));
assert(!medications.includes("const continuos =\n          listaBase.filter"));
assert(medications.includes("V334_VISIBLE_MEDICATION_FILTERS") && medications.includes("grid grid-cols-3 gap-1.5 min-[430px]:grid-cols-4") && medications.includes("aria-pressed={medicationFilter === value}") && medications.includes("selectMedicationFilter(value)"), "V197: filtros de medicamentos visíveis, com seleção e navegação preservadas");

assert(treatments.includes("V197: o comando clínico é calculado em uma única passagem"));
assert(!treatments.includes("listaEnriquecida.reduce((total, item)"));
assert((treatments.match(/rounded-lg border px-3 py-1.5/g) || []).length >= 3);

assert(treatmentDetail.includes("const linkedMedicamentosById = useMemo"));
assert(treatmentDetail.includes("const linkedRenovacoesByMedication = useMemo"));
assert(treatmentDetail.includes("linkedRenovacoesByMedication.get(medicamento.id)"));
assert(treatmentDetail.includes("linkedMedicamentosById.get(renovacao.medicamento_id)"));
assert(!treatmentDetail.includes("const medicamento = linkedMedicamentos.find"));
assert((treatmentDetail.match(/vault-deferred/g) || []).length >= 8);

assert((medicationDetail.match(/vault-deferred/g) || []).length >= 7);
assert(medicationDetail.includes('space-y-3 px-4 pt-3 sm:px-5'));
assert(medicationDetail.includes('rounded-[18px] border border-surface-border/70'));
assert(medicationDetail.includes("temEstoque"));
assert(medicationDetail.includes("estoqueStatus"));

assert(avatar.includes("V197: copa e aba continuam legíveis de frente"));
assert(avatar.includes('appearance.hat==="flat"?.258:.246'));
assert(avatar.includes("new THREE.TorusGeometry(.085,.0014,4,24,Math.PI)"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

console.log("VAULT V197 — MEDICATION + TREATMENT DETAILS + AVATAR CAP CONTRACT OK");
