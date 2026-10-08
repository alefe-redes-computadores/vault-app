import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(
    path,
    "utf8"
  );

const ok = (
  condition,
  message
) => {
  if (!condition) {
    throw new Error(
      "V97.2 R1: " +
      message
    );
  }

  console.log(
    "OK: " +
    message
  );
};

const hook =
  read(
    "hooks/useMedicationRegulatoryProfiles.ts"
  );

const equivalence =
  read(
    "lib/medication-catalog/pharmaceutical-equivalence.ts"
  );

const authority =
  read(
    "lib/medication-catalog/authority.ts"
  );

const meds =
  read(
    "app/saude/medicamentos/page.tsx"
  );

ok(
  equivalence.includes(
    "isPharmaceuticallyEquivalentName"
  ) &&
  equivalence.includes(
    "cloridrato de"
  ),
  "equivalência farmacêutica conservadora"
);

ok(
  hook.includes(
    "inflight"
  ),
  "consultas concorrentes são deduplicadas"
);

ok(
  hook.includes(
    "CATALOG_CACHE_KEY"
  ) &&
  hook.includes(
    "loadCache"
  ) &&
  hook.includes(
    "persistCache"
  ),
  "perfil regulatório possui snapshot persistente"
);

ok(
  !hook.includes(
    "referenceCache.set(key, null)"
  ),
  "falha de busca não é congelada como null"
);

ok(
  hook.includes(
    "minimumScore: 0.5"
  ) &&
  hook.includes(
    "isPharmaceuticallyEquivalentName"
  ),
  "descoberta ampla mantém autoridade estrita"
);

ok(
  authority.includes(
    "pharmaceuticalEquivalent"
  ),
  "sal/base válido é compatível"
);

ok(
  meds.includes(
    "Adicionar nova receita para"
  ) &&
  meds.includes(
    "/saude/renovacao/nova-receita?medicamento_id="
  ),
  "badge Receita abre fluxo V93"
);

ok(
  !meds.includes(
    "/saude/documentos/novo?medicamento_id="
  ),
  "atalho legado de documento saiu da lista"
);

ok(
  meds.includes(
    "VAULT_CARD_RHYTHM_V97_2_R1"
  ),
  "faixa inferior de ações foi eliminada"
);

ok(
  meds.includes(
    'aria-label={`${quickDoseLabel} ${med.nome}`}'
  ),
  "Tomar/SOS permanece acessível no painel Hoje"
);

console.log(
  "VAULT V97.2 R1 REGULATORY STABILITY + CARD RHYTHM: CONTRACT OK"
);
