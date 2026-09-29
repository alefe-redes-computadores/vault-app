import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V76: ${message}`);
  console.log(`OK: ${message}`);
};

const details = read("app/saude/medicamentos/detalhes/page.tsx");
const list = read("app/saude/medicamentos/page.tsx");
const more = read("app/mais/page.tsx");
const selector = read("components/PersonSelector.tsx");
const treatment = read("app/saude/tratamentos/detalhes/page.tsx");

ok(details.includes('id: "editar-medicamento"'), "edição permanece no menu principal");
ok(!details.includes(">\n                      Editar Medicamento\n"), "edição móvel duplicada removida");
ok(
  details.indexOf("Excluir medicamento</span>") > details.indexOf("menuOptions.map"),
  "exclusão fica depois das ações comuns"
);
ok(
  details.indexOf("Excluir medicamento</span>") < details.indexOf("</motion.div>", details.indexOf("Excluir medicamento</span>")),
  "exclusão encerra o menu de ações"
);

ok(more.includes("personCount > 1"), "troca de pessoa só aparece com múltiplos perfis");
ok(more.includes('mode="action"'), "seletor não repete identidade no cartão da conta");
ok(selector.includes('mode === "action" ? "Trocar pessoa"'), "ação de troca possui semântica explícita");

ok(list.includes('title="Classificação da receita"'), "classificação regulatória abre bottom sheet");
ok(list.includes("setSelectedRegulatory(regulatoryProfile)"), "badge regulatório aciona explicação");
ok(list.includes("selectedRegulatory.sourceLabel"), "explicação informa a origem regulatória");
ok(list.includes("selectedRegulatory.verified"), "explicação diferencia dado confirmado e cadastro");
ok(!list.includes("expandedRegulatoryMedId"), "explicação antiga dentro do card foi removida");

ok(treatment.includes("<MedicationFormatIcon"), "tratamento herda o formato visual do medicamento");
ok(treatment.includes("cores={medicamento.cores}"), "tratamento herda as cores do medicamento");

console.log("V76 EXPERIENCE CLOSURE — CONTRATO OK");
