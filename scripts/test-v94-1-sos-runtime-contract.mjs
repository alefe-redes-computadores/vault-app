import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V94.1: ${message}`);
  console.log(`OK: ${message}`);
};

const quick = read("components/saude/QuickDoseModal.tsx");
const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const repo = read("lib/repositories/medicamentos.ts");
const v94 = read("scripts/test-v94-sos-after-discontinuation-contract.mjs");

ok(repo.includes("VAULT_SOS_AFTER_DISCONTINUATION_V94"), "V94 base continua instalada");
ok(v94.includes("SOS"), "contrato V94 base preservado");

ok(
  quick.includes('medicamento.status !==') &&
  quick.includes('medicamento.tipo_uso ===') &&
  quick.includes('"sos"'),
  "QuickDose aceita medicamento SOS mesmo com tratamento anterior suspenso"
);

// M148 P2 FIX1 — o V94.1 anterior pressupunha que apenas "continuo"
// produzia "extra". Isso diverge da implementação canônica atual, que
// também suporta "esporadico" e impede classificar temporários como SOS.
// Extrair e EXECUTAR a expressão real enviada ao repositório de doses.
const { createRequire } = await import("node:module");
const ts = createRequire(import.meta.url)("typescript");
const ast = ts.createSourceFile("QuickDoseModal.tsx", quick, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
ok(ast.parseDiagnostics.length === 0, "QuickDose válido em TypeScript");
const doseKindExpressions = [];
function inspect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "doseLogsRepository.registrarTomadaAvulsa") {
    const argument = node.arguments[0];
    if (argument && ts.isObjectLiteralExpression(argument)) {
      for (const prop of argument.properties) {
        if (ts.isPropertyAssignment(prop) && prop.name.getText(ast) === "doseKind") {
          doseKindExpressions.push(prop.initializer.getText(ast));
        }
      }
    }
  }
  ts.forEachChild(node, inspect);
}
inspect(ast);
ok(doseKindExpressions.length === 1, "DoseKind pertence ao único registro avulso canônico");
const doseKindFor = new Function("selectedMed", `"use strict";return (${doseKindExpressions[0]});`);
for (const [tipo_uso, expected] of [
  ["sos", "sos"], ["esporadico", "sos"],
  ["continuo", "extra"], ["temporario", "extra"],
]) {
  ok(doseKindFor({ tipo_uso }) === expected,
    `${tipo_uso} registra dose_kind=${expected} na tomada avulsa`);
}
const doseRepo = read("lib/repositories/doseLogs.ts");
ok(doseRepo.includes("async registrarTomadaAvulsa(") &&
   doseRepo.includes('doseKind = "sos"') &&
   doseRepo.includes("dose_kind:") && doseRepo.includes("doseKind,"),
   "Repositório persiste o tipo declarado sem reclassificar o fato");

ok(
  detail.includes('med.status !==') &&
  detail.includes('"descontinuado" ||') &&
  detail.includes('isSOS) && ('),
  "detalhe mantém área operacional de dose para SOS pós-suspensão"
);

ok(
  detail.includes('Tratamento suspenso · SOS atual'),
  "detalhe comunica simultaneamente histórico suspenso e uso SOS atual"
);

ok(
  detail.includes("Registrar aquisição"),
  "aquisição continua disponível sem exigir retomada de tratamento"
);

ok(
  detail.includes("Adicionar nova receita") ||
  detail.includes("Nova receita"),
  "fluxo de receita permanece disponível"
);

console.log("\nVAULT V94.1 SOS RUNTIME — CONTRATO OK");
