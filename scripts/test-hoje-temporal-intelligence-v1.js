// scripts/test-hoje-temporal-intelligence-v1.js
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
      "app/hoje/page.tsx"
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
  "\n🏥 HOJE — TEMPORAL INTELLIGENCE TEST\n"
);

expect(
  source.includes(
    "const isFuturo ="
  ),
  "timeline conhece futuro"
);

expect(
  source.includes(
    "isHoje &&"
  ),
  "atraso depende de estar no dia atual"
);

expect(
  source.includes(
    "const isPrevistoFuturo ="
  ),
  "futuro possui estado próprio"
);

expect(
  source.includes(
    'statusText =\n                              "Prevista"'
  ),
  "futuro é rotulado como Prevista"
);

expect(
  source.includes(
    "const isHistoricoSemConfirmacao ="
  ),
  "histórico possui estado sem confirmação"
);

expect(
  source.includes(
    'statusText =\n                              "Sem confirmação"'
  ),
  "histórico não vira atraso automaticamente"
);

expect(
  source.includes(
    "c.data ===\n          dataSelecionada"
  ),
  "cirurgias respeitam data selecionada"
);

expect(
  !source.includes(
    "(c: any) => c.data === hoje"
  ),
  "bug antigo de cirurgias removido"
);

expect(
  source.includes("useRetiradas") &&
    source.includes("retiradasHoje"),
  "timeline lê a entidade canônica de retirada"
);

expect(
  source.includes(
    "renovacao_receita"
  ),
  "timeline lê renovação de receita"
);

expect(
  source.includes(
    "Cuidados do dia"
  ),
  "eventos medicamentosos aparecem visualmente"
);

expect(
  source.includes(
    "if (\n        !isHoje\n      ) {\n        return null;"
  ),
  "assistente diário só avalia hoje"
);

expect(
  source.includes(
    "totalItensPlanejados"
  ),
  "futuro possui contador de planejamento"
);

expect(
  source.includes(
    "Previstas (${totalEsperadasSemConfirmacao})"
  ),
  "filtro futuro usa semântica Previstas"
);

console.log(
  "\n✅ TIMELINE TEMPORAL VALIDADA."
);
