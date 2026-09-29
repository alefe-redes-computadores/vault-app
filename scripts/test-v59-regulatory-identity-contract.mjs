import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const ok = (value, message) => {
  if (!value) {
    throw new Error(`V59: ${message}`);
  }
  console.log(`OK: ${message}`);
};

const visual = read(
  "lib/medication-regulatory-visual.ts"
);

const meds = read(
  "app/saude/medicamentos/page.tsx"
);

const retiradas = read(
  "app/saude/retiradas/page.tsx"
);

const hook = read(
  "hooks/useMedicationRegulatoryProfiles.ts"
);

ok(
  visual.includes(
    "VAULT_REGULATORY_IDENTITY_V59"
  ),
  "identidade regulatória central"
);

ok(
  visual.includes(
    "resolveMedicationRegulatoryVisual"
  ),
  "resolver regulatório legado preservado"
);

ok(
  visual.includes(
    "getMedicationRegulatorySurface"
  ),
  "superfície dark-mode central"
);

ok(
  hook.includes(
    "resolveMedicationRegulatoryVisual"
  ),
  "hook continua compatível"
);

ok(
  meds.includes(
    "VAULT_REGULATORY_IDENTITY_V59"
  ),
  "Medicamentos usa identidade V59"
);

ok(
  meds.includes(
    "regulatorySurface.iconClass"
  ),
  "ícone de Medicamentos é regulatório"
);

/*
 * V76.1:
 * O indicador primário deixou de ser o antigo
 * ponto baseado diretamente em .accent.
 *
 * A borda/rail agora é a identidade principal,
 * acompanhada pela etiqueta vertical.
 */

ok(
  meds.includes(
    "regulatorySurface.rail"
  ),
  "borda primária é regulatória"
);

ok(
  meds.includes(
    "VAULT_REGULATORY_EDGE_LABEL_V76_1"
  ),
  "etiqueta regulatória acompanha a borda"
);

ok(
  retiradas.includes(
    "useMedicationRegulatoryProfiles"
  ),
  "Retiradas usa perfil regulatório"
);

ok(
  retiradas.includes(
    "regulatorySurface.iconClass"
  ),
  "Retiradas compartilha identidade"
);

ok(
  retiradas.includes('"atrasada"') &&
    retiradas.includes(
      "retirada.data < hoje"
    ),
  "Retiradas distingue atraso temporal"
);

ok(
  retiradas.includes("Atrasada"),
  "Retiradas exibe atraso"
);

console.log(
  "VAULT SUPER V59 R2/V76.1 — CONTRATO OK"
);
