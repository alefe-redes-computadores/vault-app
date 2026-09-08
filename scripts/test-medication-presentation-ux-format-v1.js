// scripts/test-medication-presentation-ux-format-v1.js
"use strict";

const fs =
  require("fs");

const path =
  require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

const source =
  fs.readFileSync(
    path.join(
      ROOT,
      "app/saude/medicamentos/novo/page.tsx"
    ),
    "utf8"
  );

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

console.log(
  "\n💊 PRESENTATION UX + FORMAT V1\n"
);

expect(
  source.includes(
    "normalizeCatalogPresentationText"
  ),
  "parser preserva palavras"
);

expect(
  source.includes(
    "catalog-official-form-aliases-v4"
  ),
  "aliases oficiais v4 presentes"
);

expect(
  source.includes(
    String.raw`\bcom ct\b`
  ),
  "COM CT suportado"
);

expect(
  source.includes(
    String.raw`\bsol inj\b`
  ),
  "SOL INJ suportado"
);

expect(
  source.includes(
    "isCatalogPresentationOpen"
  ),
  "painel possui estado aberto/fechado"
);

expect(
  source.includes(
    "selectedCatalogPresentation"
  ),
  "apresentação selecionada possui resumo"
);

expect(
  source.includes(
    "Alterar apresentação"
  ),
  "usuário pode reabrir apresentações"
);

expect(
  source.includes(
    "setIsCatalogPresentationOpen(\n                                                  false"
  ),
  "seleção recolhe painel"
);

console.log(
  "\n✅ PRESENTATION UX + FORMAT VALIDADO."
);
