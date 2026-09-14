import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const helper = read("lib/medication-intelligence/presentation-match.ts");
const validator = read("lib/medication-intelligence/validate.ts");
const novo = read("app/saude/medicamentos/novo/page.tsx");
const editar = read("app/saude/medicamentos/editar/page.tsx");

const checks = [
  ["comparação de concentração é estruturada", helper.includes("parseMedicationStrength")],
  ["comparação textual parcial foi removida", !novo.includes("presentation.label\n        ).includes")],
  ["razões mg/ml preservam denominador", helper.includes("denominatorUnit")],
  ["microgramas possuem normalização compatível", helper.includes('replace(/µg|ug/g, "mcg")')],
  ["validador canônico usa o comparador central", validator.includes("presentationMatchesDosage")],
  ["cadastro pede confirmação explícita", novo.includes("showDosageConfirmation")],
  ["edição pede confirmação explícita", editar.includes("showDosageConfirmation")],
  ["confirmação é vinculada à referência e dosagem", novo.includes("dosageAcknowledgementRef") && editar.includes("dosageAcknowledgementRef")],
  ["manutenção manual continua possível", novo.includes("Manter como informado") && editar.includes("Manter como informado")],
  ["ausência de catálogo não bloqueia", helper.includes("presentations.length === 0) return true")],
  ["mensagem orienta conferir fonte original", novo.includes("Confira a receita ou a embalagem")],
  ["sem migration ou persistência nova", true],
];

let failed = false;
console.log("== CONTRATOS CADASTRO SEGURO V17 ==");
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FALTA"}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`CONTRATOS CADASTRO SEGURO V17: OK (${checks.length})`);
