const assert=require("node:assert/strict");
const fs=require("node:fs");
const arrivals=fs.readFileSync("lib/health-profile/new-data-summary.ts","utf8");
const summary=fs.readFileSync("components/saude/NewHealthDataSummary.tsx","utf8");
const sheet=fs.readFileSync("components/vault-intelligence/HealthInsightSheet.tsx","utf8");

assert(arrivals.includes("record.person_id!==scope.personId||record.user_id!==scope.userId"));
assert(arrivals.includes("source_record_id"));
assert(summary.includes("Isso não representa uma nova conclusão clínica"));
assert(summary.includes("healthReadingValue(group.latest)"));
assert(summary.includes("healthReadingSource(group.latest.source)"));
assert(summary.includes("memo(function NewHealthDataSummary"));
for(const label of ["Orientação segura","Limitações e segurança","Fontes internas","Fontes regulatórias","Por que o Vault mostrou isso?"])assert(sheet.includes(label),`hierarquia ausente: ${label}`);
assert(sheet.includes('target="_blank" rel="noreferrer"'));
assert(sheet.includes("urgent&&insight.acaoSegura"));

console.log("V174 health arrivals + insight hierarchy contract: OK");
