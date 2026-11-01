const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const medications = read("app/saude/medicamentos/page.tsx");
const medicationDetail = read("app/saude/medicamentos/detalhes/page.tsx");
const treatments = read("app/saude/tratamentos/page.tsx");
const treatmentDetail = read("app/saude/tratamentos/detalhes/page.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");
const clinicalDisclosure = read("components/saude/ClinicalDisclosure.tsx");

assert(medications.includes("V197: uma única passagem alimenta resumo"));
assert(medications.includes("const totalAtivos = statsProgresso.ativos"));
assert(!medications.includes("const continuos =\n          listaBase.filter"));
const medFilter = read("components/saude/MedicationFilterBar.tsx");
assert(medications.includes('<MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>')
  && medFilter.includes('aria-pressed={value === key}')
  && medFilter.includes('aria-expanded={expanded}')
  && medFilter.includes('onClick={() => choose(key)}')
  && medFilter.includes('event.key === "Escape"')
  && medFilter.includes('ADDITIONAL.map')
  && ["Todos", "Atenção", "Contínuos", "Por período", "SOS", "Controlados", "Encerrados"].every(label => medFilter.includes('"'+label+'"')),
  "V197: sete filtros acessíveis no componente extraído, seleção e navegação preservadas");

assert(treatments.includes("V197: o comando clínico é calculado em uma única passagem"));
assert(!treatments.includes("listaEnriquecida.reduce((total, item)"));
assert((treatments.match(/rounded-lg border px-3 py-1.5/g) || []).length >= 3);

assert(treatmentDetail.includes("const linkedMedicamentosById = useMemo"));
assert(treatmentDetail.includes("const linkedRenovacoesByMedication = useMemo"));
assert(treatmentDetail.includes("linkedRenovacoesByMedication.get(medicamento.id)"));
assert(treatmentDetail.includes("linkedMedicamentosById.get(renovacao.medicamento_id)"));
assert(!treatmentDetail.includes("const medicamento = linkedMedicamentos.find"));
assert((treatmentDetail.match(/vault-deferred/g) || []).length >= 8);

assert((medicationDetail.match(/vault-deferred/g) || []).length >= 5);
assert(medicationDetail.includes('<ClinicalDisclosure id="medicamento-financeiro"') && medicationDetail.includes('<ClinicalDisclosure id="medicamento-rede"'), "V197: seções secundárias permanecem progressivas");
assert(clinicalDisclosure.includes('typeof children === "function" ? children() : children') && clinicalDisclosure.includes('if (hash === id) setOpen(true)'), "V197: divulgação progressiva desmonta conteúdo fechado e preserva deep-link");
assert(medicationDetail.includes('space-y-3 px-4 pt-3 sm:px-5'));
assert(medicationDetail.includes('rounded-[18px] border border-surface-border/70'));
assert(medicationDetail.includes("temEstoque"));
assert(medicationDetail.includes("estoqueStatus"));

assert(avatar.includes("V197: copa e aba continuam legíveis de frente"));
assert(avatar.includes('appearance.hat==="flat"?.258:.246'));
assert(avatar.includes("new THREE.TorusGeometry(.085,.0014,4,24,Math.PI)"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

console.log("VAULT V197 — MEDICATION + TREATMENT DETAILS + AVATAR CAP CONTRACT OK");
