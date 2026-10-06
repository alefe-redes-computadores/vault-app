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

ok(
  quick.includes('doseKind:') &&
  quick.includes('selectedMed.tipo_uso === "continuo"') &&
  quick.includes('? "extra"') &&
  quick.includes(': "sos"'),
  "tomada avulsa de SOS persiste como dose_kind=sos"
);

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
