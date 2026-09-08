// scripts/test-regulatory-review-collapse-v2.js
"use strict";

const fs = require("fs");

const source = fs.readFileSync(
  "app/saude/medicamentos/novo/page.tsx",
  "utf8"
);

function expect(condition, label) {
  if (!condition) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

console.log(
  "\n🏥 REGULATORY REVIEW COLLAPSE V2\n"
);

expect(
  source.includes(
    "isRegulatoryReviewOpen"
  ),
  "estado de expansão existe"
);

expect(
  source.includes(
    'aria-label="Fechar revisão regulatória"'
  ),
  "botão fechar existe"
);

expect(
  source.includes(
    "!isRegulatoryReviewOpen"
  ),
  "estado compacto existe"
);

expect(
  source.includes(
    "Receita merece revisão"
  ),
  "resumo compacto existe"
);

expect(
  source.includes(
    "Toque para rever a regra"
  ),
  "resumo reabre evidências"
);

expect(
  source.includes(
    "setIsRegulatoryReviewOpen(\n                                                true"
  ),
  "nova referência reabre revisão"
);

console.log(
  "\n✅ UX REGULATÓRIA V2 VALIDADA."
);
