// scripts/test-tratamentos-contract.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

function read(relativePath) {
  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath
    ),
    "utf8"
  );
}

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

const repo =
  read(
    "lib/repositories/tratamentos.ts"
  );

const hook =
  read(
    "hooks/useTratamentos.ts"
  );

const detalhes =
  read(
    "app/saude/tratamentos/detalhes/page.tsx"
  );

const editar =
  read(
    "app/saude/tratamentos/editar/page.tsx"
  );

const novo =
  read(
    "app/saude/tratamentos/novo/page.tsx"
  );

const list =
  read(
    "app/saude/tratamentos/page.tsx"
  );

console.log(
  "\n🧠 VAULT — TRATAMENTOS CONTRACT TEST\n"
);

expect(
  repo.includes(
    "async function validateCidIdsForPerson("
  ),
  "repository valida ownership dos CIDs"
);

expect(
  repo.includes(
    "await db.cids.bulkGet("
  ),
  "validação CID usa banco local"
);

expect(
  repo.includes(
    "cid.person_id !=="
  ),
  "CID precisa pertencer à pessoa ativa"
);

expect(
  repo.includes(
    "getTratamentoForPerson("
  ),
  "tratamento é person-scoped"
);

expect(
  repo.includes(
    "getMedicamentosForPerson("
  ),
  "medicamentos são person-scoped"
);

expect(
  hook.includes(
    "tratamentosRepository.createWithResult("
  ),
  "hook recebe resultado rico do create"
);

expect(
  hook.includes(
    "result.medicamentosDescontinuados"
  ),
  "hook processa medicamentos descontinuados"
);

expect(
  hook.includes(
    "cancelDoseNotifications"
  ),
  "hook reconcilia notificações após commit"
);

expect(
  detalhes.includes(
    "useSearchParams"
  ),
  "detalhes usa searchParams"
);

expect(
  !detalhes.includes(
    "router.back();"
  ),
  "detalhes não depende do histórico"
);

expect(
  editar.includes(
    "useSearchParams"
  ),
  "editar usa searchParams"
);

expect(
  editar.includes(
    "goBackOnSuccess:\n              false"
  ),
  "editar desliga retorno automático"
);

expect(
  editar.includes(
    "/saude/tratamentos/detalhes?id="
  ),
  "editar retorna ao detalhe canônico"
);

expect(
  !editar.includes(
    "router.back();"
  ),
  "editar não depende do histórico"
);

expect(
  novo.includes(
    "addTratamento"
  ),
  "novo usa hook canônico"
);

expect(
  novo.includes(
    "useActivePersonId"
  ),
  "novo conhece pessoa ativa"
);

expect(
  list.includes(
    "useTratamentos"
  ),
  "listagem usa hook canônico"
);

console.log(
  "\n✅ CONTRATO DE TRATAMENTOS VALIDADO."
);
