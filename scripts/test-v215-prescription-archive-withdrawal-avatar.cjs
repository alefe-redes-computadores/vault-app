const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const code = ts.transpileModule(read("lib/medication-access-action.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const box = { exports: {} };
new Function("exports", "module", "require", code)(box.exports, box, require);
const { indexScheduledWithdrawals, scheduledWithdrawalForMedication, medicationAccessAction } = box.exports;
const insightsSource = ts.createSourceFile("health-insights.ts", read("lib/health-insights.ts"), ts.ScriptTarget.Latest, true);
const policy = insightsSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "sugerirRenovacao");
const policyCode = ts.transpileModule(policy.getText(insightsSource), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const policyBox = { exports: {} };
new Function("exports", "sugerirRenovacaoBase", "getDaysUntil", "analisarValidadeReceita", policyCode)(
  policyBox.exports,
  () => ({ deveRenovar: true, motivo: "receita", urgencia: "alta", mensagem: "Receita" }),
  () => -1,
  () => ({ diasRestantes: 25 })
);
const medicine = { nome: "Teste", tipo_uso: "continuo", tipo_receita: "comum", data_receita: "2026-10-01", estoque_quantidade: 70 };
assert.equal(policyBox.exports.sugerirRenovacao(medicine).deveRenovar, false, "current prescription with stock is not requested again");
assert.equal(policyBox.exports.sugerirRenovacao({ ...medicine, estoque_quantidade: 0 }).motivo, "estoque", "replenishment is distinct from prescription");
assert.equal(policyBox.exports.sugerirRenovacao({ ...medicine, lembrete_receita_modo: "data_personalizada" }).motivo, "receita", "explicit reminder remains authoritative");
const rows = [
  { id: "future", medicamento_id: "m1", status: "agendada", data: "2099-01-01" },
  { id: "overdue", medicamento_id: "m1", status: "agendada", data: "2020-01-01" },
  { id: "done", medicamento_id: "m1", status: "concluida", data: "2019-01-01" },
];
assert.equal(indexScheduledWithdrawals(rows).get("m1")?.id, "overdue");
assert.equal(scheduledWithdrawalForMedication(rows, "m1")?.id, "overdue");
assert.equal(medicationAccessAction({ deveRenovar: true, motivo: "estoque" }, "m1", "/", { scheduledWithdrawalId: "overdue" }).href, "/saude/retiradas/detalhes?id=overdue&return_to=%2F");
assert.match(medicationAccessAction({ deveRenovar: true, motivo: "receita" }, "m1", "/", { scheduledWithdrawalId: "overdue" }).href, /nova-receita/);
const form = read("app/saude/renovacao/nova-receita/page.tsx");
assert.match(form, /createdDocumentId = await createDocument\(/);
assert.match(form, /category_id: "saude",\s*type: "receita"/);
assert.match(form, /document_id: createdDocumentId/);
assert.match(form, /attachments: uploadedStorageUrl && localFile/);
assert.match(form, /await deleteDocument\(createdDocumentId\)/);
for (const page of ["app/saude/medicamentos/page.tsx", "app/saude/medicamentos/detalhes/page.tsx", "components/MedicamentosNotifications.tsx", "lib/health-intelligence/medication-care-opportunities.ts"]) {
  assert.match(read(page), /scheduledWithdrawalId:/, page);
}
const avatar = read("components/saude/HealthAvatar3D.tsx");
assert.match(avatar, /const roundFace=shape==='round';/);
assert.match(avatar, /if\(roundFace\)\{/);
console.log("V215 prescription archive, pending withdrawal, avatar contracts passed");
