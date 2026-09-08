// scripts/test-medication-catalog-runtime-v3.js
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
      "Falhou: " +
      label
    );
  }

  console.log(
    "✅ " +
    label
  );
}

const provider =
  read(
    "lib/medication-catalog/supabase-provider.ts"
  );

const novo =
  read(
    "app/saude/medicamentos/novo/page.tsx"
  );

const editar =
  read(
    "app/saude/medicamentos/editar/page.tsx"
  );

console.log(
  "\n💊 MEDICATION CATALOG RUNTIME V3\n"
);

const start =
  provider.indexOf(
    "private async executeLightSearch("
  );

const end =
  provider.indexOf(
    "async hydrateQuickResult(",
    start
  );

const light =
  provider.slice(
    start,
    end
  );

expect(
  light.includes(
    "search_medication_catalog"
  ),
  "autocomplete usa RPC"
);

expect(
  !light.includes(
    '.from("medication_products")'
  ),
  "autocomplete não consulta products extra"
);

expect(
  !light.includes(
    '.from("medication_substances")'
  ),
  "autocomplete não consulta substances extra"
);

expect(
  provider.includes(
    "async prefetchQuickResults("
  ),
  "provider possui prefetch"
);

expect(
  novo.includes(
    'label="Medicamento"'
  ),
  "Novo manteve campo Medicamento"
);

expect(
  editar.includes(
    'label="Nome Oficial"'
  ),
  "Editar manteve campo Nome Oficial"
);

for (
  const [
    label,
    source,
  ]
  of [
    ["Novo", novo],
    ["Editar", editar],
  ]
) {
  expect(
    source.includes(
      "Busca inteligente"
    ),
    label +
      " mostra busca inteligente"
  );

  expect(
    source.includes(
      "Consultando catálogo ANVISA"
    ),
    label +
      " mostra carregamento"
  );

  expect(
    source.includes(
      "prefetchQuickResults("
    ),
    label +
      " usa prefetch"
  );

  expect(
    source.includes(
      "catalog-auto-format-v3"
    ),
    label +
      " possui autoformato"
  );

  expect(
    source.includes(
      "Verificação regulatória"
    ),
    label +
      " explica receita"
  );
}

console.log(
  "\n✅ RUNTIME V3 VALIDADO."
);
