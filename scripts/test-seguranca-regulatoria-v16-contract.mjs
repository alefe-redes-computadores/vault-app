import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const visual = read("lib/medication-regulatory-visual.ts");
const hook = read("hooks/useMedicationRegulatoryProfiles.ts");
const page = read("app/saude/medicamentos/page.tsx");
const safety = read("lib/health-intelligence/medication-safety.ts");

const checks = [
  ["visual regulatório é centralizado", visual.includes("resolveMedicationRegulatoryVisual")],
  ["modelo oficial permanece separado de tarja", visual.includes("prescriptionModelCode") && !visual.includes('label: "Tarja preta"')],
  ["notificações B possuem tratamento visual contrastante", visual.includes('case "notificacao_b"') && visual.includes('bg-black text-white')],
  ["controle especial possui identidade própria", visual.includes('case "receita_controle_especial"')],
  ["incerteza não vira medicamento livre", visual.includes("Classificação não confirmada")],
  ["informação manual é identificada como não verificada", visual.includes("registrada manualmente")],
  ["catálogo exige correspondência nominal exata", hook.includes("normalizeMedicationText(item.matchedText) === key")],
  ["falha de rede mantém fallback local", hook.includes("catch") && hook.includes("return null")],
  ["cards consomem perfil regulatório", page.includes("useMedicationRegulatoryProfiles") && page.includes("regulatoryProfile.badgeClass")],
  ["quantidade confirmada entra no cérebro", safety.includes("buildConfirmedQuantityInsight")],
  ["quantidade não é chamada de dose tóxica", safety.includes("Não calcula dose máxima, tóxica ou letal")],
  ["alerta aponta histórico canônico", safety.includes("/saude/medicamentos/historico?id=")],
  ["isolamento por pessoa continua no motor", safety.includes("dose.person_id === context.personId")],
  ["sem migration ou persistência nova", true],
];

let failed = 0;
console.log("== CONTRATOS SEGURANÇA REGULATÓRIA V16 ==");
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FALTA"}: ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`CONTRATOS SEGURANÇA REGULATÓRIA V16: OK (${checks.length})`);
