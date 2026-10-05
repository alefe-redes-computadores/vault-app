import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const ok = (condition, message) => {
  if (!condition) {
    throw new Error(`V70 FINAL: ${message}`);
  }

  console.log(`OK: ${message}`);
};

const med = read(
  "app/saude/medicamentos/detalhes/page.tsx"
);

const quick = read(
  "components/saude/QuickDoseModal.tsx"
);

const sos = read(
  "lib/health-intelligence/sos-patterns.ts"
);

const withdrawals = read(
  "app/saude/retiradas/page.tsx"
);

const search = read(
  "components/list/ListSearch.tsx"
);

const filters = read(
  "components/list/ListFilters.tsx"
);

const treatments = read(
  "app/saude/tratamentos/page.tsx"
);

const more = read(
  "app/mais/page.tsx"
);

const intelligence = read(
  "app/inteligencia/page.tsx"
);

const contextual = read(
  "components/vault-intelligence/ContextualHealthIntelligence.tsx"
);

const bottom = read(
  "components/BottomNav.tsx"
);

ok(
  search.includes('aria-label="Abrir busca"') &&
    search.includes("setExpanded"),
  "busca compartilhada compacta"
);

ok(
  filters.includes('aria-expanded={open}'),
  "filtros compartilhados compactos"
);

ok(
  treatments.includes("<ListSearch") &&
    treatments.includes("Buscar tratamento"),
  "Tratamentos usa busca compartilhada"
);

ok(
  med.includes(
    '`/saude/medicamentos/editar?id=${id}`'
  ) &&
    med.includes('aria-label="Editar medicamento"'),
  "Editar medicamento navegável"
);

ok(
  med.includes(
    '`/saude/medicamentos/novo?duplicar=${id}`'
  ),
  "Duplicar medicamento navegável"
);

ok(
  med.includes(
    "/saude/renovacao/nova?medicamento_id=${id}&return_to="
  ),
  "Aquisição navegável com retorno explícito"
);

ok(
  med.includes(
    '`/saude/medicamentos/historico?id=${id}`'
  ),
  "Histórico de doses navegável"
);

ok(
  med.includes(
    'getElementById("historico-aquisicoes")'
  ),
  "melhor preço possui ação"
);

ok(
  med.includes(
    "formatMedicationDosageDisplay"
  ),
  "formatter de dosagem preservado"
);

ok(
  quick.includes("getCurrentTime()"),
  "dose extra inicia no horário atual"
);

ok(
  quick.includes('type="date"') ||
    quick.includes("doseDate") ||
    quick.includes("selectedDate") ||
    quick.includes("dataRegistro"),
  "dose extra aceita data histórica"
);

ok(
  sos.includes("current.knownQuantity >= 21") &&
    sos.includes("current.knownQuantity >= 7") &&
    sos.includes("quantityRatio"),
  "SOS considera quantidade agregada"
);

ok(
  withdrawals.includes("MedicationFormatIcon"),
  "Retiradas herda identidade do medicamento"
);

ok(
  more.includes("@/lib/app-version"),
  "versão do app possui fonte única"
);

ok(
  more.includes("Vault Insight"),
  "Mais apresenta Vault Insight"
);

ok(
  intelligence.includes("VAULT INSIGHT"),
  "Central preserva identidade Vault Insight"
);

ok(
  contextual.includes(
    'router.push("/inteligencia")'
  ),
  "Central contextual navegável"
);

ok(
  contextual.includes("new Set<string>()") &&
    contextual.includes(".slice(0, 3)"),
  "deduplicação contextual V64 preservada"
);

ok(
  bottom.includes(
    "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
  ),
  "safe-area V31 preservada"
);

console.log(
  "VAULT V70 FINAL — COMPLETUDE CONTRACT OK"
);
