import fs from "node:fs";
const read = (file) => fs.readFileSync(file, "utf8");
const report = read("lib/clinical-report.ts");
const reportPage = read("app/saude/registros/relatorio/page.tsx");
const records = read("app/saude/registros/page.tsx");
const treatment = read("app/saude/tratamentos/novo/page.tsx");
const checks = [
  ["relatório possui rota própria", records.includes('/saude/registros/relatorio') && reportPage.includes("ClinicalReportPage")],
  ["resumo antigo não corta 30 eventos", !records.includes("month.events.slice(0,30)")],
  ["períodos 7 30 e 90 estão disponíveis", reportPage.includes("[7, 30, 90]")],
  ["comparação usa janela anterior equivalente", report.includes("previousStart") && report.includes("previousEnd")],
  ["ausência de registro não vira zero clínico", reportPage.includes("Ausência de registro não é interpretada como zero")],
  ["programadas contam somente tomadas", report.includes("scheduledTaken") && report.includes("isTaken(item)")],
  ["SOS e extra possuem contagem separada", report.includes("sosTaken") && report.includes("extraTaken")],
  ["ignoradas não são chamadas de tomadas", report.includes("ignorado_em")],
  ["relatório agrega por sintoma e medicamento", report.includes("symptomGroups") && report.includes("medicationGroups")],
  ["padrões V11 entram no relatório", report.includes('item.kind === "pattern"') && reportPage.includes("Padrões percebidos")],
  ["relatório é imprimível e explicável", reportPage.includes("window.print()") && reportPage.includes("não recomenda alteração")],
  ["novo tratamento possui data de início", treatment.includes("data_inicio:") && treatment.includes('label="Data de início"')],
  ["novo tratamento retorna ao detalhe canônico", treatment.includes("/saude/tratamentos/detalhes?id=")],
  ["novo tratamento não depende de router.back", !treatment.includes("router.back();")],
  ["seleção de CID não abre confirmação redundante", !treatment.includes("setShowAddCidPrompt(\n        true")],
  ["sem migration ou alteração de persistência", !report.includes("db.version") && !report.includes("supabase")],
];
console.log("== CONTRATOS FECHAMENTO CLÍNICO V12 ==");
let failed = false;
for (const [label, ok] of checks) { console.log(`${ok ? "OK" : "FALTA"}: ${label}`); failed ||= !ok; }
if (failed) process.exit(1);
console.log(`CONTRATOS FECHAMENTO CLÍNICO V12: OK (${checks.length})`);
