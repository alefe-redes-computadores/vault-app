import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V88: ${message}`);
  console.log(`OK: ${message}`);
};

const modal = read("components/PendingDosesModal.tsx");
const home = read("app/page.tsx");
const details = read("app/saude/medicamentos/detalhes/page.tsx");
const acquisition = read("app/saude/renovacao/nova/page.tsx");
const withdrawal = read("app/saude/retiradas/detalhes/page.tsx");
const history = read("app/saude/renovacao/detalhes/page.tsx");
const editor = read("app/saude/medicamentos/editar/page.tsx");

ok(modal.includes("MedicationFormatIcon") && !modal.includes("<Pill"), "modal usa formato real do medicamento");
ok(modal.includes("formato?: string") && modal.includes("cores?: string[]"), "contrato da dose carrega identidade visual");
ok(home.includes("formato:\n                    med.formato") && home.includes("cores:\n                    med.cores"), "Home entrega formato e cores ao modal");
ok(details.includes('"Registrar aquisição"'), "detalhes usa semântica de aquisição");
ok((details.match(/return_to=/g) || []).length >= 3, "todos os atalhos de aquisição nos detalhes possuem retorno");
ok(acquisition.includes("successUrl:\n            returnTo") && !acquisition.includes("goBackOnSuccess:\n            true"), "salvamento usa retorno determinístico");
ok(acquisition.includes("medicationReturnTo") && acquisition.includes("encodeURIComponent(autoSelectMedId)"), "acesso direto retorna ao medicamento selecionado");
ok(withdrawal.includes("return_to=") && history.includes("return_to=") && editor.includes("return_to="), "atalhos relacionados preservam a tela de origem");
ok(acquisition.includes('"Erro ao registrar aquisição"'), "mensagens distinguem aquisição de renovação");

console.log("V88 DOSE IDENTITY & ACQUISITION NAVIGATION — CONTRATO OK");
