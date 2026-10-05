import fs from "node:fs";
const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, label) => {
  if (!value) throw new Error(`V90: ${label}`);
  console.log(`OK: ${label}`);
};

const repo = read("lib/repositories/medicamentos.ts");
const integrity = read("lib/integridadeReferencial.ts");
const details = read("app/saude/medicamentos/detalhes/page.tsx");

ok(repo.includes("withCanonicalVisualIdentity"), "identidade antiga possui fallback canônico");
ok(repo.includes('medicamento.status !==\n            "descontinuado"'), "rotina oculta apenas descontinuados");
ok(repo.includes('"Removido da rotina pelo usuário"'), "remoção vira descontinuação clínica");
ok(repo.includes('enfileirarOperacao(\n      "medicamentos",\n      "update"'), "descontinuação sincroniza como atualização");

const safeDelete = repo.slice(repo.indexOf("  async deleteSafe("));
ok(!safeDelete.includes("db.doseLogs.delete"), "remoção não apaga doses");
ok(!safeDelete.includes('"doseLogs",\n            "delete"'), "remoção não enfileira exclusão de doses");
ok(!safeDelete.includes('"medicamentos",\n          "delete"'), "cadastro histórico não é excluído remotamente");

const orphanBlock = integrity.slice(
  integrity.indexOf("if (!medicamentoIds.has(log.medicamento_id))"),
  integrity.indexOf("if (!medicamentoIds.has(log.medicamento_id))") + 500
);
ok(orphanBlock.includes("Dose histórica preservada"), "órfão vira diagnóstico");
ok(!orphanBlock.includes("db.doseLogs.delete"), "verificador não destrói prontuário");
ok(details.includes("histórico preservado"), "confirmação explica preservação");

console.log("V90 MEDICATION HISTORY INTEGRITY — CONTRATO OK");
