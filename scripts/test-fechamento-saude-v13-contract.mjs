import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const expect = (condition, label) => {
  if (!condition) throw new Error(`FALHA: ${label}`);
  checks.push(label);
  console.log(`OK: ${label}`);
};

const home = read("app/page.tsx");
const report = read("lib/clinical-report.ts");
const reportPage = read("app/saude/registros/relatorio/page.tsx");
const withdrawals = read("lib/repositories/retiradas.ts");
const treatment = read("app/saude/tratamentos/novo/page.tsx");
const temporal = read("scripts/test-hoje-temporal-intelligence-v1.js");
const localAuth = read("lib/supabase/local-auth.ts");

expect(home.includes("normalizedMedicationSchedules"), "Home normaliza horários antes de contar a rotina");
expect(home.includes('log.dose_kind !==') && home.includes('"sos"') && home.includes('"extra"'), "SOS e extra não inflam doses programadas concluídas");
expect(localAuth.includes("supabase.auth.getSession()") && !localAuth.includes("getUser()"), "escrita local usa identidade da sessão persistida");

const repositories = [
  "cids", "cirurgias", "consultas", "documents", "doseLogs", "exames", "farmacias",
  "healthGoals", "healthReminders", "hospitais", "locais", "medicamentos", "medicos",
  "registrosSaude", "renovacoes", "retiradas", "tratamentos",
];
for (const name of repositories) {
  const source = read(`lib/repositories/${name}.ts`);
  expect(source.includes("getLocalFirstAuthUser") && !source.includes("supabase.auth.getUser()"), `${name} preserva gravação local-first`);
}

expect(report.includes("number | null") && report.includes("previous === 0"), "comparação sem base não fabrica crescimento de 100%");
expect(report.includes("item.periodoDias <= periodDays"), "relatório limita insights à janela selecionada");
expect(report.includes("discardedRecords") && report.includes('kind === "data_quality"'), "relatório audita qualidade dos dados");
expect(reportPage.includes("Novo no período") && reportPage.includes("Qualidade dos dados"), "interface explica base ausente e inconsistências");
expect(withdrawals.includes('current.user_id!==userId') && withdrawals.includes('medicamento.user_id!==userId'), "retiradas validam proprietário e medicamento");
expect(withdrawals.includes('"renovacao_origem_id"') && withdrawals.includes("renovacao_origem_id:current.renovacao_origem_id"), "origem automática da retirada é imutável");
expect(!treatment.includes("showAddCidPrompt"), "cadastro de tratamento não conserva modal CID morto");
expect(temporal.includes("useRetiradas") && temporal.includes("retiradasHoje") && !temporal.includes('".data_retorno_sus"'), "contrato temporal acompanha entidade canônica de retirada");

const deterministicRoutes = {
  "app/saude/hospitais/detalhes/page.tsx": "/saude/hospitais",
  "app/saude/farmacias/detalhes/page.tsx": "/saude/farmacias",
  "app/saude/locais/detalhes/page.tsx": "/saude/locais",
  "app/saude/medicos/detalhes/page.tsx": "/saude/medicos",
  "app/saude/cids/detalhes/page.tsx": "/saude/cids",
  "app/saude/cirurgias/detalhes/page.tsx": "/saude/cirurgias",
  "app/saude/exames/detalhes/page.tsx": "/saude/exames",
  "app/saude/consultas/detalhes/page.tsx": "/saude/consultas",
};
for (const [file, route] of Object.entries(deterministicRoutes)) {
  const source = read(file);
  expect(source.includes(`router.replace("${route}")`) && !source.includes("router.back()"), `${file} possui retorno determinístico`);
}

expect(!fs.existsSync("lib/health-intelligence/longitudinal-insights.ts.v11-pre-ts-fix"), "resíduo de correção V11 não integra o produto");
console.log(`CONTRATOS FECHAMENTO SAÚDE V13: OK (${checks.length})`);
