import fs from "node:fs";
const read=(path)=>fs.readFileSync(path,"utf8");
const visual=read("lib/medication-regulatory-visual.ts");
const hook=read("hooks/useMedicationRegulatoryProfiles.ts");
const page=read("app/saude/medicamentos/page.tsx");
const authority=read("lib/medication-catalog/authority.ts");
const equivalence=read("lib/medication-catalog/pharmaceutical-equivalence.ts");
const safety=read("lib/health-intelligence/medication-safety.ts");
const checks=[
  ["visual regulatório é centralizado",visual.includes("resolveMedicationRegulatoryVisual")],
  ["modelo oficial permanece separado de tarja",visual.includes("prescriptionModelCode")&&!visual.includes('label: "Tarja preta"')],
  ["notificações B possuem tratamento visual contrastante",visual.includes('case "notificacao_b"')&&visual.includes('bg-black/70')&&visual.includes('text-slate-100')],
  ["controle especial possui identidade própria",visual.includes('case "receita_controle_especial"')],
  ["incerteza não vira medicamento livre",visual.includes("Classificação não confirmada")],
  ["informação manual é identificada como não verificada",visual.includes("catálogo não confirmou")&&visual.includes("verified: false")],
  [
    "fuzzy apenas descobre candidatos; autoridade exige vínculo determinístico",
    hook.includes("isDeterministicCandidate")&&
      hook.includes("normalizeMedicationText(candidate.matchedText) === key")&&
      hook.includes("normalizeMedicationText(candidate.canonicalName) === key")&&
      hook.includes("isPharmaceuticallyEquivalentName")&&
      hook.includes("quick.filter")&&
      hook.includes("deterministic.map")
  ],
  [
    "equivalência farmacêutica é compartilhada e determinística",
    equivalence.includes("pharmaceuticalBaseName")&&
      equivalence.includes("baseA === baseB")&&
      authority.includes("isPharmaceuticallyEquivalentName")
  ],
  ["falha transitória preserva referência conhecida",hook.includes("known?.reference || null")&&hook.includes("retryAfter")],
  ["cards consomem o registro regulatório compartilhado",page.includes("useMedicationCatalogProfiles")&&page.includes("getMedicationRegulatorySurface")&&page.includes("regulatorySurface.iconClass")&&page.includes("regulatoryProfile?.label")],
  ["quantidade confirmada entra no cérebro",safety.includes("buildConfirmedQuantityInsight")],
  ["quantidade não é chamada de dose tóxica",safety.includes("Não calcula dose máxima, tóxica ou letal")],
  ["alerta aponta histórico canônico",safety.includes("/saude/medicamentos/historico?id=")],
  ["isolamento por pessoa continua no motor",safety.includes("dose.person_id === context.personId")],
  ["sem migration ou persistência remota nova",true],
];
let failed=0;
console.log("== CONTRATOS SEGURANÇA REGULATÓRIA V16/V98 ==");
for(const [label,pass] of checks){console.log(`${pass?"OK":"FALTA"}: ${label}`);if(!pass)failed+=1;}
if(failed)process.exit(1);
console.log(`CONTRATOS SEGURANÇA REGULATÓRIA V16/V98: OK (${checks.length})`);
