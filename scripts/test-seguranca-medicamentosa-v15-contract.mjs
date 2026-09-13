import fs from "node:fs";

const safety = fs.readFileSync("lib/health-intelligence/medication-safety.ts", "utf8");
const engine = fs.readFileSync("lib/health-insights.ts", "utf8");
const selector = fs.readFileSync("lib/health-intelligence/select-highlights.ts", "utf8");
const sheet = fs.readFileSync("components/health-intelligence/HealthInsightExplanationSheet.tsx", "utf8");
const home = fs.readFileSync("app/page.tsx", "utf8");

const checks = [
  ["gravidade de segurança é separada de urgência", engine.includes("gravidadeSeguranca?:")],
  ["tomadas curtas não são chamadas automaticamente de superdosagem", safety.includes("não confirma superdosagem")],
  ["SOS e extra entram na triagem", safety.includes('dose.dose_kind === "sos"') && safety.includes('dose.dose_kind === "extra"')],
  ["janelas de 24 horas e 7 dias são auditáveis", safety.includes("last24h") && safety.includes("last7d")],
  ["combinação depende de tomadas registradas", safety.includes("recent(medicationLogs")],
  ["regra de zolpidem usa vocabulário fechado", safety.includes("const PROFILES") && safety.includes('substance: "zolpidem"')],
  ["regra considera opioide e outros depressores", safety.includes('"opioide"') && safety.includes('"depressor_snc"')],
  ["fonte regulatória possui autoridade URL e revisão", safety.includes("fontesExternas") && safety.includes("revisadoEm")],
  ["motor canônico recebe a camada de segurança", engine.includes("buildMedicationSafetyInsights")],
  ["alerta importante pode chegar à Home", selector.includes('insight.kind === "alert"') && selector.includes('insight.gravidadeSeguranca === "importante"')],
  ["Home diferencia segurança visualmente", home.includes("Inteligência de saúde") && home.includes("border-coral/30")],
  ["explicação mostra gravidade e referências", sheet.includes("Segurança:") && sheet.includes("Referências regulatórias")],
  ["ação nunca recomenda alterar ou repetir dose", safety.includes("Não tome dose adicional nem altere o esquema")],
  ["limitações da regra ficam explícitas", engine.includes("limitacaoSeguranca?:") && sheet.includes("insight.limitacaoSeguranca")],
  ["análise permanece isolada por pessoa", safety.includes("dose.person_id === context.personId") && safety.includes("medication.person_id === context.personId")],
  ["sem migration ou persistência nova", !safety.includes("db.version(") && !safety.includes("supabase.from(")],
];

console.log("== CONTRATOS SEGURANÇA MEDICAMENTOSA V15 ==");
let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FALHA"}: ${label}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
console.log(`CONTRATOS SEGURANÇA MEDICAMENTOSA V15: OK (${checks.length})`);
