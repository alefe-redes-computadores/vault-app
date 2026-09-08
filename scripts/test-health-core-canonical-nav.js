// scripts/test-health-core-canonical-nav.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

const cases = [
  [
    "app/saude/documentos/detalhes/page.tsx",
    "/saude/documentos",
  ],
  [
    "app/saude/documentos/editar/page.tsx",
    "/saude/documentos/detalhes?id=",
  ],
  [
    "app/saude/renovacao/detalhes/page.tsx",
    "/saude/renovacao",
  ],
  [
    "app/saude/renovacao/editar/page.tsx",
    "/saude/renovacao/detalhes?id=",
  ],
  [
    "app/saude/medicamentos/detalhes/page.tsx",
    "/saude/medicamentos",
  ],
  [
    "app/saude/medicamentos/editar/page.tsx",
    "/saude/medicamentos/detalhes?id=",
  ],
];

function expect(
  value,
  label
) {
  if (
    !value
  ) {
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

console.log(
  "\n🏥 VAULT — CANONICAL NAV TEST\n"
);

for (
  const [
    file,
    destination,
  ]
  of cases
) {
  const source =
    fs.readFileSync(
      path.join(
        ROOT,
        file
      ),
      "utf8"
    );

  expect(
    source.includes(
      "useSearchParams"
    ),
    file +
      " usa searchParams"
  );

  expect(
    !source.includes(
      "router.back()"
    ),
    file +
      " não usa router.back"
  );

  expect(
    source.includes(
      "router.replace("
    ),
    file +
      " usa router.replace"
  );

  expect(
    source.includes(
      destination
    ),
    file +
      " possui destino canônico"
  );
}

console.log(
  "\n✅ NAVEGAÇÃO CANÔNICA VALIDADA."
);
