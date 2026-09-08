// scripts/test-health-core-release-gate-v2.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

function read(
  file
) {
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

const documentsHook =
  read(
    "hooks/useDocuments.ts"
  );

const documentsRepo =
  read(
    "lib/repositories/documents.ts"
  );

const renewalHook =
  read(
    "hooks/useRenovacoes.ts"
  );

const renewalRepo =
  read(
    "lib/repositories/renovacoes.ts"
  );

const medicationHook =
  read(
    "hooks/useMedicamentos.ts"
  );

const medicationRepo =
  read(
    "lib/repositories/medicamentos.ts"
  );

const medicationList =
  read(
    "app/saude/medicamentos/page.tsx"
  );

const routedPages = [
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

console.log(
  "\n🏥 VAULT — HEALTH CORE RELEASE GATE v2\n"
);

// DOCUMENTOS

expect(
  documentsHook.includes(
    "useActivePersonId"
  ),
  "Documentos usa pessoa ativa"
);

expect(
  documentsHook.includes(
    "documentsRepository.getAll("
  ),
  "Documentos LIST usa repository"
);

expect(
  documentsRepo.includes(
    "person_id"
  ),
  "Documentos possui ownership"
);

// RENOVAÇÃO

expect(
  renewalHook.includes(
    "useActivePersonId"
  ),
  "Renovação usa pessoa ativa"
);

expect(
  renewalHook.includes(
    "renovacoesRepository.getAll("
  ),
  "Renovação LIST usa repository"
);

expect(
  renewalRepo.includes(
    "data_aquisicao"
  ),
  "Renovação preserva data de aquisição"
);

expect(
  renewalRepo.includes(
    "estoque_quantidade"
  ),
  "Renovação integra estoque"
);

// MEDICAMENTOS

expect(
  medicationHook.includes(
    "medicamentosRepository.getAll("
  ),
  "Medicamentos LIST usa repository"
);

expect(
  medicationHook.includes(
    "medicamentosRepository.getById("
  ),
  "Medicamentos GET usa repository"
);

expect(
  medicationHook.includes(
    "medicamentosRepository.create("
  ),
  "Medicamentos CREATE usa repository"
);

expect(
  medicationHook.includes(
    "medicamentosRepository.update("
  ),
  "Medicamentos UPDATE usa repository"
);

expect(
  medicationHook.includes(
    "medicamentosRepository.delete("
  ),
  "Medicamentos DELETE usa repository"
);

expect(
  medicationRepo.includes(
    "deleteSafe("
  ),
  "deleteSafe preservado"
);

expect(
  medicationRepo.includes(
    "cancelDoseNotifications"
  ),
  "notificações de dose preservadas"
);

expect(
  medicationList.includes(
    "PAINEL OPERACIONAL"
  ),
  "listagem premium preservada"
);

expect(
  medicationList.includes(
    "medsPrioridade.length"
  ),
  "Atenção usa dados reais"
);

expect(
  medicationList.includes(
    "medsEmDia.length"
  ),
  "Em dia usa dados reais"
);

expect(
  medicationList.includes(
    "medsSOS.length"
  ),
  "SOS usa dados reais"
);

// CAPACITOR

for (
  const [
    file,
    destination,
  ]
  of routedPages
) {
  const source =
    read(
      file
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
      " não usa history"
  );

  expect(
    source.includes(
      "router.replace("
    ),
    file +
      " usa destino determinístico"
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
  "\n🚀 HEALTH CORE APROVADO PARA BUILD/DEPLOY."
);
