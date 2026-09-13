import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const engine = read("lib/health-intelligence/longitudinal-insights.ts");
const core = read("lib/health-insights.ts");
const selector = read("lib/health-intelligence/select-highlights.ts");
const sheet = read("components/health-intelligence/HealthInsightExplanationSheet.tsx");

const checks = [
  ["janelas de 7 e 30 dias são equivalentes", engine.includes("buildWindowPatterns(scoped, today, 7)") && engine.includes("buildWindowPatterns(scoped, today, 30)")],
  ["confiança considera cobertura de dias", engine.includes("coveredDays / windowDays")],
  ["sintomas possuem tendência longitudinal", engine.includes('tendencia: worsening ? "aumento"')],
  ["SOS e extra entram na associação", engine.includes('dose_kind === "sos"') && engine.includes('dose_kind === "extra"')],
  ["associação não é apresentada como causalidade", engine.includes("não demonstra causa")],
  ["tratamento e CID exigem vínculo explícito", engine.includes("explicitLinks")],
  ["contexto continua isolado por pessoa", engine.includes("item.person_id === context.personId")],
  ["motor canônico recebe camada longitudinal", core.includes("buildLongitudinalHealthInsights")],
  ["insight carrega comparação estruturada", core.includes("comparacao?:")],
  ["insight carrega cobertura auditável", core.includes("coberturaDias?:")],
  ["agregação preserva fontes internas", selector.includes("routinePatterns.flatMap")],
  ["explicação mostra comparação e ação segura", sheet.includes("Comparação equivalente") && sheet.includes("Próximo passo seguro")],
  ["sem prescrição ou alteração automática", !engine.includes("recomenda aumentar") && engine.includes("sem alterar a medicação")],
  ["sem migration ou persistência nova", !engine.includes("db.version") && !engine.includes("supabase")],
];

console.log("== CONTRATOS CÉREBRO CLÍNICO V11 ==");
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FALTA"}: ${label}`);
  failed ||= !ok;
}
if (failed) process.exit(1);
console.log(`CONTRATOS CÉREBRO CLÍNICO V11: OK (${checks.length})`);
