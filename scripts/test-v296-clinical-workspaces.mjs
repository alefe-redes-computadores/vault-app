import fs from "node:fs";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const hoje = read("app/hoje/page.tsx");
const health = read("app/saude/minha-saude/page.tsx");
const documents = read("app/saude/documentos/page.tsx");
const records = read("app/saude/registros/page.tsx");
const medication = read("app/saude/medicamentos/detalhes/page.tsx");
const supply = read("app/saude/fornecimento/page.tsx");
const nav = read("components/saude/ClinicalSectionNav.tsx");

for (const id of ["hoje-agora", "hoje-agenda", "hoje-doses", "hoje-diario"]) expect(hoje.includes(id), `Hoje sem âncora ${id}`);
expect(health.includes("<ClinicalSectionNav") && !health.includes("<nav aria-label=\"Áreas de Minha Saúde\""), "Minha Saúde não usa a navegação clínica compartilhada");
expect(documents.includes("documentNavItems") && documents.includes("document-domain-${domain.id}"), "Acervo sem navegação dinâmica por domínio");
expect(records.includes("medicationsLoading") && records.includes("isLoading || dosesLoading || medicationsLoading"), "Linha clínica pode projetar medicamentos antes do carregamento completo");
for (const id of ["registros-agora", "registros-resumo", "registros-linha"]) expect(records.includes(id), `Linha clínica sem âncora ${id}`);
for (const id of ["medicamento-agora", "medicamento-rotina", "medicamento-fornecimento", "medicamento-financeiro", "medicamento-receita", "historico-aquisicoes"]) expect(medication.includes(id), `Medicamento sem área ${id}`);
for (const id of ["fornecimento-agora", "processos", "processo-atual", "ciclo-atual"]) expect(supply.includes(id), `Fornecimento sem área ${id}`);
expect(nav.includes("IntersectionObserver") && nav.includes("aria-current"), "Navegação clínica não acompanha a seção ativa");

console.log("V296 clinical workspace contract: ok");
