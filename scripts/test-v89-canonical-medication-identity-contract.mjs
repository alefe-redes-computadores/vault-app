import fs from "node:fs";
const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => { if (!value) throw new Error(`V89: ${message}`); console.log(`OK: ${message}`); };

const quick = read("components/saude/QuickDoseModal.tsx");
const sos = read("components/saude/SOSDoseModal.tsx");
const today = read("app/hoje/page.tsx");
const home = read("app/page.tsx");
const opportunities = read("lib/health-intelligence/medication-care-opportunities.ts");
const renewals = read("lib/repositories/renovacoes.ts");
const withdrawals = read("app/saude/retiradas/nova/page.tsx");

ok(quick.includes("MedicationFormatIcon") && !quick.includes("getMedicineIcon") && !quick.includes("SplitPillIcon"), "dose rápida usa identidade canônica");
ok(sos.includes("MedicationFormatIcon") && !sos.includes("getMedicamentoIcon"), "dose SOS usa identidade canônica");
ok(today.includes("formato: med.formato") && today.includes("cores: med.cores") && today.includes("formato={item.formato}"), "Hoje preserva formato e cores relacionados");
ok(opportunities.includes("formato:") && opportunities.includes("medicamento.formato") && opportunities.includes("return_to="), "inteligência preserva identidade e origem");
ok(home.includes("primaryMedicationCareOpportunity.formato") && home.includes("Registrar aquisição"), "Home apresenta identidade e semântica corretas");
ok(renewals.includes("medicamentoNomeSnapshot") && renewals.includes("medicamentoDosagemSnapshot"), "snapshots históricos de aquisição permanecem preservados");
ok(withdrawals.includes("medicamento_nome:") && withdrawals.includes("medicamento_dosagem:"), "snapshots históricos de retirada permanecem preservados");

console.log("V89 CANONICAL MEDICATION IDENTITY — CONTRATO OK");
