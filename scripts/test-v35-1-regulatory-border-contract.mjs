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
    throw new Error(
      `V35.1/V59/V76.1: ${message}`
    );
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
  "borda usa identidade regulatória"
);

ok(
  page.includes("VAULT_REGULATORY_RAIL_LABEL_V76_2") &&
    page.includes("setSelectedRegulatory(regulatoryProfile)"),
  "identidade visual regulatória preservada"
);

ok(
  page.includes("VAULT_REGULATORY_EDGE_LABEL_V76_1"),
  "etiqueta vertical presente"
);

ok(
  page.includes("VAULT_REGULATORY_COMPACT_DIALOG_V76_1"),
  "explicação compacta presente"
);

ok(
  !page.includes("expandedRegulatoryMedId"),
  "expansão antiga removida"
);

ok(
  visual.includes('tone === "black"'),
  "dark mode da classificação preta"
);

ok(
  visual.includes("bg-black/70") &&
    visual.includes("#94a3b8"),
  "contraste da classificação preta"
);

ok(
  !page.includes('regulatoryProfile?.tone === "black"'),
  "hack antigo ausente"
);

console.log(
  "V35.1/V59/V76.1 REGULATORY CONTRACT: OK"
);
