import fs from "node:fs";
const read = file => fs.readFileSync(file, "utf8");
const page = read("app/saude/registros/page.tsx");
const timeline = read("lib/clinical-record-timeline.ts");
const tests = [
  ["hierarquia inclui semana e dia", page.includes("buildClinicalDays") && timeline.includes("ClinicalDay")],
  ["hoje abre por padrão", page.includes('date===localDateKey()')],
  ["semanas antigas podem permanecer recolhidas", page.includes("isCurrentWeek")],
  ["dias resumem registros e doses", page.includes("registro${records.length") && page.includes("dose${doses.length")],
  ["doses são agregadas por medicamento e origem", page.includes("medicamento_id||dose.title") && page.includes("dose_kind")],
  ["eventos brutos continuam acessíveis", page.includes("group/dose") && page.includes("event.subtitle")],
  ["medicamentos herdam avatar canônico", page.includes("AvatarMedicamento") && page.includes("medication.formato")],
  ["cor principal possui fallback compatível", page.includes("medication.cor_principal") && page.includes("medication.cores")],
  ["medicamento removido possui fallback neutro", page.includes("border-surface-border bg-surface")],
  ["busca e filtros abrem resultados", page.includes('Boolean(search.trim())||filter!=="todos"')],
  ["registros clínicos permanecem individuais", page.includes("records.map(event=><EventRow")],
  ["sem migration ou alteração de persistência", !page.includes("db.version") && !timeline.includes("db.version")],
];
for (const [name, ok] of tests) { if (!ok) { console.error(`FALHA: ${name}`); process.exit(1); } console.log(`OK: ${name}`); }
console.log(`CONTRATOS PRONTUÁRIO V10.1: OK (${tests.length})`);
