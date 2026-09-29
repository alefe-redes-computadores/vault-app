import fs from "node:fs";

const r = (p) => fs.readFileSync(p, "utf8");

function ok(value, message) {
  if (!value) {
    throw new Error(`V72: ${message}`);
  }

  console.log("OK:", message);
}

const med = r(
  "app/saude/medicamentos/detalhes/page.tsx"
);

const list = r(
  "app/saude/medicamentos/page.tsx"
);

const search = r(
  "components/list/ListSearch.tsx"
);

const filters = r(
  "components/list/ListFilters.tsx"
);

const bottom = r(
  "components/BottomNav.tsx"
);

const providers = r(
  "components/Providers.tsx"
);

const auth = r(
  "hooks/useAuth.ts"
);

const hero =
  med.indexOf("VAULT_MEDICATION_HIERARCHY_V72");

const insight =
  med.indexOf("<ContextualHealthIntelligence");

const routine =
  med.indexOf("ROTINA E DOSES");

ok(
  hero >= 0,
  "hierarquia V72 instalada"
);

ok(
  insight > hero,
  "Vault Insight vem depois da identidade essencial"
);

ok(
  routine > insight,
  "inteligência permanece antes da rotina detalhada"
);

ok(
  med.includes("VAULT_SAFE_BACK_V71_1") &&
    med.includes("/saude/medicamentos"),
  "Medicamento mantém back confiável"
);

ok(
  med.includes(
    "/saude/medicamentos/editar?id=${id}"
  ),
  "Editar medicamento possui destino"
);

ok(
  med.includes(
    "/saude/medicamentos/novo?duplicar=${id}"
  ),
  "Duplicar medicamento possui destino"
);

ok(
  med.includes(
    "/saude/renovacao/nova?medicamento_id=${id}"
  ),
  "Nova renovação possui destino"
);

ok(
  list.includes("VAULT_MEDICATION_LIST_DENSITY_V72") &&
    list.includes('density="compact"'),
  "lista de medicamentos usa densidade compacta"
);

ok(
  list.includes("getMedicationRegulatorySurface"),
  "lista preserva identidade regulatória"
);

ok(
  search.includes("setExpanded") &&
    search.includes('aria-label="Abrir busca"'),
  "busca compartilhada é expansível"
);

ok(
  filters.includes("setOpen") &&
    filters.includes("aria-expanded={open}"),
  "filtros compartilhados são compactos"
);

ok(
  bottom.includes(
    "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
  ),
  "BottomNav preserva safe-area"
);

ok(
  providers.includes("vault-profile-selected:"),
  "seleção de perfil continua persistida"
);

ok(
  auth.includes("getPersistedSession") &&
    !auth.includes("getUser("),
  "boot continua local-first"
);

const reliableParents = [
  [
    "app/saude/farmacias/editar/page.tsx",
    "/saude/farmacias",
  ],
  [
    "app/saude/hospitais/editar/page.tsx",
    "/saude/hospitais",
  ],
  [
    "app/saude/locais/editar/page.tsx",
    "/saude/locais",
  ],
  [
    "app/saude/cids/editar/page.tsx",
    "/saude/cids",
  ],
  [
    "app/saude/medicos/editar/page.tsx",
    "/saude/medicos",
  ],
];

for (const [file, parent] of reliableParents) {
  if (!fs.existsSync(file)) continue;

  const text = r(file);

  ok(
    !text.includes("router.back()"),
    `${file} não depende mais apenas de router.back`
  );

  ok(
    text.includes(`router.replace("${parent}")`),
    `${file} possui destino pai conhecido`
  );
}

console.log(
  "VAULT V72 — PRODUCT CLOSURE CONTRACT: OK"
);
