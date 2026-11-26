const fs = require("node:fs");
const assert = require("node:assert/strict");

const read = path => fs.readFileSync(path, "utf8");
const list = read("app/saude/medicamentos/page.tsx");
const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const knowledge = read("components/saude/MedicationKnowledgePanelM153P4.tsx");
const careHub = read("components/saude/MedicationDetailCareHubM148.tsx");
const network = read("components/saude/MedicationCareNetworkDetails.tsx");
const agenda = read("components/saude/CourseAgendaPreviewD4.tsx");
const supply = read("components/saude/HealthSupplyEntry.tsx");
const pharma = read("components/saude/PharmaLensMedicationEntryV7.tsx");
const rhythm = read("components/saude/MedicationPurchaseRhythmBrief.tsx");

function ok(condition, message) {
  assert.ok(condition, `V28: ${message}`);
  console.log(`✓ ${message}`);
}

ok(list.includes("data-vault-compact-medication-meta") && list.includes("{activeIngredient}"), "Compacto preserva princípio ativo sem acrescentar fabricante visível");
ok(list.includes("!compactCards") && list.includes("laboratorio_etiqueta"), "fabricante permanece exclusivo do modo Conforto");
ok(!list.includes("<h2 className=\"text-sm font-bold tracking-tight text-ink-primary\">Seus medicamentos</h2>"), "cabeçalho intermediário redundante removido");
ok(detail.indexOf('id="medicamento-rotina"') < detail.indexOf('id="medicamento-estoque"') && detail.indexOf('id="medicamento-estoque"') < detail.indexOf('id="medicamento-receita"'), "ordem canônica Rotina, Estoque e Receita preservada");
ok(detail.includes("shortPrescriptionKnowledgeLabel") && detail.includes("stableIngredientKnowledge"), "identidade confirmada reaproveita fatos técnicos estáveis");
ok(knowledge.includes("humanizeOfficialPresentation") && knowledge.includes("Ver descrição técnica original"), "apresentação oficial ganha leitura humana sem apagar o texto original");
ok(careHub.includes("<TreatmentIdentityIconR03 entity={treatment}") && careHub.includes("safeTreatmentColorP7"), "tratamento vinculado usa nome, ícone e cor relacionais");
ok(network.includes("humanizeCareLocationKind"), "enum de local de cuidado é traduzido na apresentação");
ok(!detail.includes("Supply Shield · ver planejamento"), "rótulo técnico Supply Shield não vaza na interface");
ok(agenda.includes("ChevronDown") && agenda.includes("min-h-11"), "agenda comunica expansão e preserva alvo tátil");
ok(detail.includes("LayoutGrid") && detail.includes("Explorar todas as áreas do medicamento"), "explorador de áreas recupera ícone relacional");
ok(supply.includes("completedAcquisitions") && supply.includes("Processos de fornecimento"), "fornecimento distingue processo ativo de aquisição concluída");
ok(pharma.includes("referenceManufacturer") && pharma.includes("nas aquisições"), "PharmaLens distingue fabricante de referência dos fabricantes das compras");
ok(rhythm.includes("Ainda não há histórico realizado suficiente"), "painel financeiro não expande vazio");
ok(!detail.includes('"unidade(s)"'), "detalhes não exibem plural mecânico de unidade");
ok([list, detail, knowledge, careHub, network, agenda, supply, pharma, rhythm].every(source => !source.includes("overflow-x-visible")), "componentes críticos não forçam overflow horizontal");

console.log("VAULT V28 MEDICAMENTOS VISUAL: 16 verificações aprovadas");
