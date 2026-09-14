import fs from "node:fs";

const source =
  fs.readFileSync(
    "app/saude/medicamentos/page.tsx",
    "utf8"
  );

const checks = [];

function ok(label, value) {
  if (!value) {
    throw new Error("FALHOU: " + label);
  }

  checks.push(label);
  console.log("OK:", label);
}

ok(
  "busca começa recolhida",
  source.includes("isSearchOpen") &&
  source.includes("Pesquisar medicamentos")
);

ok(
  "busca recebe foco ao abrir",
  source.includes("searchInputRef.current?.focus()")
);

ok(
  "pesquisa antiga permanente foi removida",
  !source.includes("<ListSearch")
);

ok(
  "resumo vertical antigo foi removido",
  !source.includes("<DailyProgress")
);

ok(
  "resumo diário continua presente",
  source.includes("Rotina de hoje") &&
  source.includes("doses concluídas")
);

ok(
  "cards usam estado operacional na borda",
  source.includes("cardColorMeaning") &&
  source.includes("Dose pendente hoje") &&
  source.includes("Rotina concluída")
);

ok(
  "tarja continua separada da borda",
  source.includes("regulatoryProfile.badgeClass")
);

ok(
  "SOS possui identidade violeta",
  source.includes('isSOS\n                ? "#a78bfa"')
);

ok(
  "cards foram compactados",
  source.includes('className="space-y-2.5 pb-8"') &&
  !source.includes('min-h-[76px]')
);

ok(
  "isolamento por pessoa permanece",
  source.includes(
    "medicamento.person_id ==="
  ) &&
  source.includes("activePersonId")
);

ok(
  "sem migration ou Dexie novo",
  !source.includes(".version(40)")
);

console.log(
  "CONTRATOS MEDICAMENTOS VISUAL V25.3: OK (" +
  checks.length +
  ")"
);
