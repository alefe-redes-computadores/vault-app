import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

const ok = (value, message) => {
  if (!value) throw new Error(`V69 FINAL RELEASE: ${message}`);
  console.log(`OK: ${message}`);
};

const pull = read("lib/sync/pull.ts");
const recovery = read("app/recuperacao/page.tsx");
const timeline = read("app/saude/timeline/page.tsx");
const diagnostics = read("lib/sync/diagnostics.ts");
const gate = read("scripts/test-v63-release-gate.mjs");

ok(
  pull.includes("VAULT_FINAL_RELEASE_V69_QUERY_ERROR") &&
    /if \(error\) \{[\s\S]{0,260}tableOk = false;[\s\S]{0,260}return;/.test(pull),
  "erro retornado pela consulta marca diagnóstico da tabela como falha"
);

ok(
  pull.includes("finishPullDiagnostics();") &&
    /finally \{\s*finishPullDiagnostics\(\);\s*isPullingGlobal = false;\s*\}/.test(pull),
  "diagnóstico finaliza e trava global é liberada"
);

ok(
  recovery.includes("VAULT_FINAL_RELEASE_V69_RECOVERY_TRUTH") &&
    recovery.includes("failedPullTables") &&
    recovery.includes("hasPullFailures"),
  "Central de Recuperação reflete falhas parciais do pull"
);

ok(
  recovery.includes("Nenhum dado local foi apagado") &&
    recovery.includes("não executa limpeza"),
  "recuperação mantém linguagem não destrutiva"
);

ok(
  diagnostics.includes("table: string") &&
    diagnostics.includes("durationMs") &&
    diagnostics.includes("ok: boolean") &&
    !diagnostics.includes("payload:"),
  "diagnóstico permanece sem payload clínico"
);

ok(
  timeline.includes('if (period === 3650) return true;') &&
    timeline.includes('"Todo histórico"'),
  "Timeline trata Todo histórico como recorte sem limite"
);

ok(
  gate.includes("scripts/test-v69-final-release-contract.mjs"),
  "release gate inclui contrato V69"
);

console.log("VAULT V69 FINAL RELEASE: CONTRATOS OK");
