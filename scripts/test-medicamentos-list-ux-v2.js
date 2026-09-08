// scripts/test-medicamentos-list-ux-v2.js
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
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

console.log(
  "\n💊 VAULT — MEDICAMENTOS PREMIUM LIST UX V2\n"
);

expect(
  source.includes(
    "processarListaMedicamentos"
  ),
  "processamento clínico preservado"
);

expect(
  source.includes(
    "const todayStatus ="
  ),
  "status de hoje existe"
);

expect(
  source.includes(
    "const estoqueTone ="
  ),
  "status visual de estoque existe"
);

expect(
  source.includes(
    "PAINEL OPERACIONAL"
  ),
  "painel operacional existe"
);

expect(
  source.includes(
    "medsPrioridade.length"
  ),
  "resumo Atenção usa dados reais"
);

expect(
  source.includes(
    "medsEmDia.length"
  ),
  "resumo Em dia usa dados reais"
);

expect(
  source.includes(
    "medsSOS.length"
  ),
  "resumo SOS usa dados reais"
);

expect(
  source.includes(
    "setQuickDoseMedId("
  ),
  "dose rápida preservada"
);

expect(
  source.includes(
    "/saude/documentos/novo?medicamento_id="
  ),
  "fluxo de nova receita preservado"
);

expect(
  source.includes(
    "/saude/medicamentos/detalhes?id="
  ),
  "detalhes via searchParams preservado"
);

expect(
  source.includes(
    "<QuickDoseModal"
  ),
  "QuickDoseModal preservado"
);

console.log(
  "\n✅ LISTAGEM PREMIUM V2 VALIDADA."
);
