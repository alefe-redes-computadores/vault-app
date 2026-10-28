const fs = require("node:fs");
const assert = require("node:assert/strict");

const page = fs.readFileSync("app/saude/medicamentos/page.tsx", "utf8");
const withdrawals = fs.readFileSync("hooks/useRetiradas.ts", "utf8");
const renewals = fs.readFileSync("hooks/useRenovacoes.ts", "utf8");

assert.match(withdrawals, /retiradas === undefined/, "withdrawals must expose first-query loading");
assert.doesNotMatch(withdrawals, /medicamentoId\],\s*\[\]/, "withdrawals must not hide loading with a default array");
assert.match(renewals, /renovacoes === undefined/, "acquisitions must expose first-query loading");
assert.doesNotMatch(renewals, /medicamentoId,\s*\],\s*\[\]/, "acquisitions must not hide loading with a default array");
assert.match(page, /medicationsLoading\s*\|\|\s*doseLogsLoading\s*\|\|\s*withdrawalsLoading\s*\|\|\s*renewalsLoading/, "the medication command must wait for all canonical inputs");
assert.match(page, /aria-label="Carregando medicamentos"/, "loading must be announced accessibly");
assert.doesNotMatch(page, /medicamentosTodas ===\s*undefined/, "the dead legacy loading check must be removed");
assert.doesNotMatch(page, /doseLogs ===\s*undefined/, "the page must consume the hook loading contract");

console.log("V292 medication context loading contract passed");
