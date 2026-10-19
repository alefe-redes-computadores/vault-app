const assert=require("node:assert/strict");
const fs=require("node:fs");

const list=fs.readFileSync("app/saude/tratamentos/page.tsx","utf8");
const detail=fs.readFileSync("app/saude/tratamentos/detalhes/page.tsx","utf8");
const care=fs.readFileSync("components/saude/TreatmentCareLinks.tsx","utf8");
const projection=fs.readFileSync("lib/treatment-care-context.ts","utf8");
const avatar=fs.readFileSync("components/saude/HealthAvatar3D.tsx","utf8");

assert(list.includes('medicamentosResumo: Medicamento[]'));
assert(list.includes('<MedicationFormatIcon formato={medicamento.formato} cores={medicamento.cores}'));
assert(list.includes("tratamento.medicamentosResumo.map(m=>m.nome).join(' · ')"));
assert(list.includes("a.status==='descontinuado'"),"active medicines stay ahead of discontinued snapshots");
assert(care.includes('Cuidado conectado do tratamento'));
for(const label of ["Processos","Retiradas","Aquisições","Documentos"])assert(care.includes(label),`missing relation summary: ${label}`);
assert(care.includes('SUPPLY_ORIGIN_LABELS[process.origem]'));
assert(care.includes('Histórico de retiradas'));
assert(care.includes('encodeURIComponent(process.id)'));
assert(care.includes('encodeURIComponent(withdrawal.id!)'));
assert(projection.includes("medIds.has(i.medicamento_id)"));
assert(projection.includes("cycles.get(i.ciclo_id)?.processo_id===i.processo_id"));
assert(projection.includes("treatment.user_id!==userId||treatment.person_id!==personId"));
assert(detail.includes('rounded-[24px] border bg-surface p-4'));
assert(detail.includes('border-emerald-400/15 bg-emerald-400/[0.055]'));
assert(avatar.includes("shirtDetail"));
assert(avatar.includes("multiplyScalar(.55)"));

console.log("V180 treatment medication identity, relational care summary, density and avatar collar: OK");
