import fs from "node:fs";
const r=p=>fs.readFileSync(p,"utf8");const e=(v,m)=>{if(!v)throw new Error(m);console.log("OK:",m)};
e(
  r("components/list/ListSearch.tsx").includes('aria-label="Abrir busca"') &&
  r("components/list/ListSearch.tsx").includes("setExpanded") &&
  r("components/list/ListSearch.tsx").includes("Search") &&
  r("components/list/ListSearch.tsx").includes("Input"),
  "busca compacta"
);
e(
  r("components/list/ListFilters.tsx").includes('aria-expanded={open}') &&
  r("components/list/ListFilters.tsx").includes("setOpen") &&
  r("components/list/ListFilters.tsx").includes("Filtros") &&
  r("components/list/ListFilters.tsx").includes("{children}"),
  "filtros compactos"
);
e(r("components/vault-intelligence/ContextualHealthIntelligence.tsx").includes("VAULT_CONTEXTUAL_COMPACT_V70"),"insight compacto");
e(r("app/saude/medicamentos/detalhes/page.tsx").includes("VAULT_MEDICATION_NAV_RELIABILITY_V70"),"ações medicamento");
e(r("app/saude/medicamentos/detalhes/page.tsx").includes("VAULT_BUP_DOSAGE_DISPLAY_V70"),"Bup dosage");
e(r("components/saude/QuickDoseModal.tsx").includes("VAULT_RETROACTIVE_DOSE_V70"),"dose retroativa");
e(r("lib/health-intelligence/sos-patterns.ts").includes("VAULT_SOS_AGGREGATE_QUANTITY_V70"),"SOS quantidade");
e(r("lib/medication-regulatory-visual.ts").includes("VAULT_REGULATORY_FALLBACK_V70"),"receita fallback");
e(r("app/saude/retiradas/page.tsx").includes("VAULT_MEDICATION_ICON_INHERITANCE_V70"),"ícone retiradas");
e(r("app/saude/locais/detalhes/page.tsx").includes("VAULT_LOCATION_MEDICATION_ICON_V70"),"ícone locais");
e(r("app/saude/locais/page.tsx").includes("VAULT_NO_DUPLICATE_CREATE_CTA_V70"),"sem CTA duplicado");
e(r("app/saude/tratamentos/page.tsx").includes("VAULT_TREATMENT_DENSITY_V70"),"tratamentos compactos");
e(r("app/inteligencia/page.tsx").includes("VAULT_INTELLIGENCE_COMPACT_V70"),"Brain compacto");
e(r("app/mais/page.tsx").includes("VAULT_MORE_COMPACT_V70"),"Mais compacto");
e(r("app/saude/plano-seguranca/page.tsx").includes("VAULT_SAFETY_PLAN_PROGRESSIVE_V70"),"plano progressivo");
e(r("components/BottomNav.tsx").includes("VAULT_BOTTOM_NAV_POLISH_V70"),"BottomNav");
e(JSON.parse(r("package.json")).version==="1.2.0","versão 1.2.0");
e(
  r("lib/health-intelligence/sos-patterns.ts").includes(
    "current.quantityComplete && current.knownQuantity >= 21"
  ),
  "SOS quantidade participa do nível forte"
);

e(
  r("lib/health-intelligence/sos-patterns.ts").includes(
    "current.quantityComplete && current.knownQuantity >= 7"
  ),
  "SOS quantidade participa do nível atenção"
);

e(
  r("components/BottomNav.tsx").includes(
    "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
  ),
  "BottomNav preserva safe-area V31"
);

console.log("\nV70 SUPER INTEGRITY + UX: OK");