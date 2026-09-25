import fs from "node:fs";

const page = fs.readFileSync(
  "app/saude/medicamentos/page.tsx",
  "utf8"
);
const visual = fs.readFileSync(
  "lib/medication-regulatory-visual.ts",
  "utf8"
);

const ok = (value, message) => {
  if (!value) {
    throw new Error(`V35.1/V59: ${message}`);
  }
};

ok(
  page.includes("useMedicationRegulatoryProfiles"),
  "hook regulatório"
);
ok(
  page.includes("regulatoryProfiles[med.id]"),
  "perfil por medicamento"
);
ok(
  page.includes("getMedicationRegulatorySurface"),
  "superfície regulatória central"
);
ok(
  page.includes("regulatorySurface.rail"),
  "faixa principal não é regulatória"
);
ok(
  page.includes("expandedRegulatoryMedId"),
  "badge não é expansível"
);
ok(
  page.includes("VAULT_REGULATORY_EXPLANATION_V35_1"),
  "explicação móvel ausente"
);
ok(
  visual.includes('tone === "black"'),
  "dark mode da classificação preta ausente"
);
ok(
  visual.includes("bg-black/70") &&
    visual.includes("#94a3b8"),
  "preta não recebeu contraste dark-mode"
);
ok(
  !page.includes(
    'regulatoryProfile?.tone === "black"'
  ),
  "hack visual antigo ainda está na página"
);

console.log(
  "V35.1/V59 REGULATORY IDENTITY CONTRACT: OK"
);
