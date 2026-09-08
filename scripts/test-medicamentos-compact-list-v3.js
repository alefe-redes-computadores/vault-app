// scripts/test-medicamentos-compact-list-v3.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

const source =
  fs.readFileSync(
    path.join(
      ROOT,
      "app/saude/medicamentos/page.tsx"
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
  "\n💊 VAULT — COMPACT LIST V3 TEST\n"
);

expect(
  source.includes(
    "PAINEL OPERACIONAL COMPACTO"
  ),
  "painel compacto aplicado"
);

expect(
  source.includes(
    "humanizeStockText"
  ),
  "pluralização visual aplicada"
);

expect(
  source.includes(
    "whitespace-normal break-words"
  ),
  "status pode quebrar linha sem ellipsis"
);

expect(
  source.includes(
    "processarListaMedicamentos"
  ),
  "processamento original preservado"
);

expect(
  source.includes(
    "setQuickDoseMedId("
  ),
  "dose rápida preservada"
);

expect(
  source.includes(
    "medsPrioridade.length"
  ),
  "resumo Atenção preservado"
);

expect(
  source.includes(
    "medsEmDia.length"
  ),
  "resumo Em dia preservado"
);

expect(
  source.includes(
    "medsSOS.length"
  ),
  "resumo SOS preservado"
);

console.log(
  "\n✅ LISTAGEM COMPACTA VALIDADA."
);
