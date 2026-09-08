// scripts/test-registros-saude-contract.js
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

function expect(value, label) {
  if (!value) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

const repo =
  read(
    "lib/repositories/registrosSaude.ts"
  );

const hook =
  read(
    "hooks/useRegistrosSaude.ts"
  );

const list =
  read(
    "app/saude/registros/page.tsx"
  );

const novo =
  read(
    "app/saude/registros/novo/page.tsx"
  );

const detalhes =
  read(
    "app/saude/registros/detalhes/page.tsx"
  );

const editar =
  read(
    "app/saude/registros/editar/page.tsx"
  );

console.log(
  "\n🏥 REGISTROS DE SAÚDE — CONTRACT TEST\n"
);

expect(
  repo.includes(
    "registro.person_id !== safePersonId"
  ),
  "registro é person-scoped"
);

expect(
  repo.includes(
    "medicamento.person_id !== personId"
  ),
  "medicamento relacionado é person-scoped"
);

expect(
  repo.includes(
    "tratamento.person_id === personId"
  ),
  "tratamentos relacionados são person-scoped"
);

expect(
  repo.includes(
    "cid.person_id === personId"
  ),
  "CIDs relacionados são person-scoped"
);

expect(
  repo.includes(
    'await validateRelations({'
  ),
  "create/update validam relações"
);

expect(
  hook.includes(
    "useActivePersonId"
  ),
  "hook usa pessoa ativa"
);

expect(
  hook.includes(
    "person_id:\n            activePersonId"
  ),
  "create injeta person_id no hook"
);

expect(
  list.includes(
    "useRegistrosSaude"
  ),
  "listagem usa hook canônico"
);

expect(
  novo.includes(
    "useRegistrosSaude"
  ),
  "novo usa hook canônico"
);

expect(
  detalhes.includes(
    "useSearchParams"
  ),
  "detalhes usa searchParams"
);

expect(
  editar.includes(
    "useSearchParams"
  ),
  "editar usa searchParams"
);

expect(
  !detalhes.includes(
    "router.back();"
  ),
  "detalhes não depende do histórico"
);

expect(
  !editar.includes(
    "router.back();"
  ),
  "editar não depende do histórico"
);

expect(
  editar.includes(
    "goBackOnSuccess:\n              false"
  ),
  "save não usa retorno automático por histórico"
);

expect(
  editar.includes(
    "/saude/registros/detalhes?id="
  ),
  "editar retorna ao detalhe por searchParams"
);

expect(
  editar.includes(
    "analisarRegistroSaude("
  ),
  "inteligência de registro preservada"
);

console.log(
  "\n✅ CONTRATO DE REGISTROS DE SAÚDE VALIDADO."
);
