import fs from "node:fs";

const page = fs.readFileSync(
  "app/saude/medicamentos/page.tsx",
  "utf8"
);

const ok = (value, message) => {
  if (!value) {
    throw new Error(
      `V76.1: ${message}`
    );
  }
  console.log(`OK: ${message}`);
};

ok(
  page.includes("VAULT_REGULATORY_EDGE_LABEL_V76_1"),
  "etiqueta regulatória vertical"
);

ok(
  page.includes('"vertical-rl"'),
  "texto regulatório vertical"
);

ok(
  page.includes('"Notif. "'),
  "Notificação compactada"
);

ok(
  page.includes("regulatoryProfile.badgeClass"),
  "identidade visual regulatória preservada"
);

ok(
  page.includes("regulatorySurface.rail"),
  "borda regulatória preservada"
);

ok(
  page.includes("event.preventDefault();") &&
  page.includes("event.stopPropagation();"),
  "clique regulatório isolado do card"
);

ok(
  page.includes("VAULT_REGULATORY_COMPACT_DIALOG_V76_1"),
  "diálogo regulatório compacto"
);

ok(
  page.includes('role="dialog"') &&
  page.includes('aria-modal="true"'),
  "diálogo acessível"
);

ok(
  page.includes("max-w-[330px]"),
  "diálogo limitado a 330px"
);

ok(
  page.includes("selectedRegulatory.sourceLabel") &&
  page.includes("selectedRegulatory.verified"),
  "origem e confirmação preservadas"
);

ok(
  !page.includes("<BottomSheet"),
  "BottomSheet grande removido"
);

ok(
  !page.includes("expandedRegulatoryMedId"),
  "expansão antiga ausente"
);

console.log(
  "VAULT V76.1 REGULATORY EDGE CONTRACT: OK"
);
