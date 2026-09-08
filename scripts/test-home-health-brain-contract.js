// scripts/test-home-health-brain-contract.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

function read(file) {
  return fs.readFileSync(
    path.join(
      ROOT,
      file
    ),
    "utf8"
  );
}

function expect(
  condition,
  label
) {
  if (!condition) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

const home =
  read(
    "app/page.tsx"
  );

const rede =
  read(
    "app/saude/rede/page.tsx"
  );

const utils =
  read(
    "lib/health-utils.ts"
  );

const insights =
  read(
    "lib/health-insights.ts"
  );

console.log(
  "\n🏥 VAULT — HOME / HEALTH BRAIN CONTRACT TEST\n"
);

// HOME

expect(
  home.includes(
    "useActivePersonId"
  ),
  "Home usa pessoa ativa"
);

expect(
  home.includes(
    "useHealthIntelligence"
  ),
  "Home usa inteligência longitudinal"
);

expect(
  home.includes(
    "healthIntelligence.highlights"
  ),
  "Home usa highlights curados"
);

expect(
  home.includes(
    "gerarAlertasVisaoGeral"
  ),
  "Home preserva alertas imediatos"
);

expect(
  home.includes(
    "buildMedicationCareOpportunities"
  ),
  "Home preserva oportunidades medicamentosas"
);

expect(
  home.includes(
    "HealthInsightExplanationSheet"
  ),
  "Home preserva explicabilidade"
);

expect(
  home.includes(
    "const documentInsights ="
  ) &&
  home.includes(
    "!activePersonId"
  ),
  "alertas documentais possuem guarda de pessoa ativa"
);

// REDE

expect(
  !rede.includes(
    "router.back();"
  ),
  "Rede não depende de histórico"
);

// UTILS

expect(
  utils.includes(
    "export const VALIDADE_RECEITA_DIAS"
  ),
  "validade de receita permanece centralizada"
);

expect(
  utils.includes(
    "export function computeEstoqueInfo"
  ),
  "estoque permanece centralizado"
);

expect(
  utils.includes(
    "export function getDocumentAlerts"
  ),
  "alertas documentais permanecem centralizados"
);

// INSIGHTS

expect(
  insights.includes(
    "export type HealthInsightKind"
  ),
  "HealthInsight possui kind"
);

expect(
  insights.includes(
    '"pattern"'
  ),
  "HealthInsight suporta pattern"
);

expect(
  insights.includes(
    '"alert"'
  ),
  "HealthInsight suporta alert"
);

expect(
  insights.includes(
    '"data_quality"'
  ),
  "HealthInsight suporta data_quality"
);

expect(
  insights.includes(
    "export function validarHealthInsightContext"
  ),
  "cérebro valida contexto"
);

expect(
  insights.includes(
    "item.person_id !==\n              contexto.personId"
  ),
  "cérebro detecta ownership inválido"
);

expect(
  insights.includes(
    "contexto.medicamentos.filter"
  ),
  "cérebro saneia medicamentos"
);

expect(
  insights.includes(
    "contexto.doseLogs.filter"
  ),
  "cérebro saneia DoseLogs"
);

expect(
  insights.includes(
    "contexto.renovacoes.filter"
  ),
  "cérebro saneia renovações"
);

expect(
  insights.includes(
    "contexto.tratamentos.filter"
  ),
  "cérebro saneia tratamentos"
);

expect(
  insights.includes(
    "contexto.registrosSaude.filter"
  ),
  "cérebro saneia registros de saúde"
);

expect(
  insights.includes(
    "export function gerarInsightsSaude"
  ),
  "motor longitudinal preservado"
);

expect(
  insights.includes(
    "export function gerarAlertasVisaoGeral"
  ),
  "motor de alertas imediatos preservado"
);

console.log(
  "\n✅ HOME + REDE + HEALTH BRAIN VALIDADO."
);
