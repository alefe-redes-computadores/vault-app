// scripts/test-tratamentos-runtime-v1.js
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

const list =
  read(
    "app/saude/tratamentos/page.tsx"
  );

const detail =
  read(
    "app/saude/tratamentos/detalhes/page.tsx"
  );

const hook =
  read(
    "hooks/useTratamentos.ts"
  );

console.log(
  "\n🏥 TRATAMENTOS RUNTIME V1\n"
);

expect(
  list.includes(
    'router.replace(\n                        `/saude/tratamentos/detalhes?id=${tratamento.id}`'
  ),
  "listagem entra no detalhe com replace"
);

expect(
  !list.includes(
    'router.push(\n                        `/saude/tratamentos/detalhes?id=${tratamento.id}`'
  ),
  "listagem não acumula detalhe com push"
);

expect(
  detail.includes(
    "getMedicamentosDoTratamento"
  ),
  "detalhe usa API própria de vínculos"
);

expect(
  detail.includes(
    "await Promise.all(["
  ),
  "tratamento e medicamentos carregam juntos"
);

expect(
  detail.includes(
    "setLinkedMedicamentos"
  ),
  "detalhe possui estado próprio dos vínculos"
);

expect(
  !detail.includes(
    'const { medicamentos = [] } = useMedicamentos();'
  ),
  "detalhe não confunde lista global vazia com ausência de vínculos"
);

expect(
  !detail.includes(
    "const linkedMedicamentos = useMemo(() => {"
  ),
  "filtro tardio antigo foi removido"
);

expect(
  detail.includes(
    'router.replace("/saude/tratamentos")'
  ),
  "retorno canônico preservado"
);

expect(
  detail.includes(
    "medicamento.person_id ==="
  ),
  "ownership revalidado no detalhe"
);

expect(
  hook.includes(
    "tratamentosRepository.getMedicamentos("
  ),
  "hook resolve medicamentos via repository"
);

expect(
  list.includes(
    "medicamentosPorTratamento"
  ) &&
  list.includes(
    "gastoPorMedicamento"
  ) &&
  list.includes(
    "totalGasto"
  ),
  "agregação financeira multi-medicamento preservada"
);

console.log(
  "\n✅ TRATAMENTOS RUNTIME VALIDADO."
);
