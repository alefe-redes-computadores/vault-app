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
  page.includes('railSize="label"') && page.includes('[writing-mode:vertical-rl]') &&
    (page.includes('setSelectedRegulatoryScope({medicationId: med.id || "", userId: treatmentOwner?.id || "", personId: activePersonId || ""})') && page.includes('med.id === selectedRegulatoryScope.medicationId') && page.includes('med.user_id === selectedRegulatoryScope.userId') && page.includes('med.person_id === selectedRegulatoryScope.personId') && page.includes('regulatoryProfiles[selectedRegulatoryMedication.id') && page.includes('selectedRegulatory && selectedRegulatoryMedication') && page.includes('onClick={closeRegulatoryModal}') && !page.includes('setSelectedRegulatory(regulatoryProfile)')),
  "identidade visual regulatória preservada"
);

ok(
  page.includes('aria-label={`Ver classificação da receita:'),
  "etiqueta vertical fina e acessível presente"
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
