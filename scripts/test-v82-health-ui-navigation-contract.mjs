import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V82: ${message}`);
  console.log(`OK: ${message}`);
};

const header = read("components/list/ListPageHeader.tsx");
const sort = read("components/list/ListSort.tsx");
const records = read("app/saude/registros/page.tsx");
const docs = read("app/saude/documentos/page.tsx");
const treatments = read("app/saude/tratamentos/page.tsx");
const doctors = read("app/saude/medicos/page.tsx");
const consultations = read("app/saude/consultas/page.tsx");
const surgeries = read("app/saude/cirurgias/page.tsx");
const bottomNav = read("components/BottomNav.tsx");

ok(header.includes('return "/saude/rede"'), "listas de saúde retornam à Central de Saúde");
ok(header.includes("flex min-w-0 flex-wrap items-center gap-2"), "ferramentas não reservam faixas verticais vazias");
ok(sort.includes("z-[101]") && sort.includes("fixed inset-x-4"), "ordenação não escapa da viewport");
ok(records.includes("ListSearch") && records.includes("ListFilters"), "Linha de cuidado usa busca e filtros modernos");
ok(docs.includes("ListSearch") && docs.includes('router.replace("/saude/rede")'), "Documentos de saúde usa busca moderna e retorno correto");
ok(treatments.includes('placeholder="Buscar tratamento..."') && !treatments.includes('<section className="px-5 pt-3">'), "Tratamentos não mantém faixa de busca órfã");
ok(doctors.includes("Ordenar:") && doctors.includes('density="compact"'), "Médicos tem ordenação contida e cards compactos");
ok(consultations.includes('placeholder="Buscar médico, local ou motivo..."'), "Consultas possui pesquisa contextual");
ok(surgeries.includes('placeholder="Buscar cirurgia, médico ou hospital..."'), "Cirurgias possui pesquisa contextual");
ok(bottomNav.includes("bg-emerald-400 text-void"), "FAB contextual permanece verde");

console.log("V82 HEALTH UI & NAVIGATION — CONTRATO OK");
