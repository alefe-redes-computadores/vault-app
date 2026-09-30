import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V76.2: ${message}`);
  console.log(`OK: ${message}`);
};

const list = read("app/saude/medicamentos/page.tsx");
const card = read("components/list/ListCard.tsx");

ok(card.includes("rail?: ReactNode"), "ListCard aceita conteúdo na faixa lateral");
ok(card.includes('rail ? "w-6" : "w-1.5"'), "faixa só alarga quando recebe conteúdo");
ok(card.includes('"p-3 pl-8"'), "conteúdo compacto respeita a largura da faixa");
ok(list.includes("VAULT_REGULATORY_RAIL_LABEL_V76_2"), "medicamento usa classificação dentro da faixa");
ok(list.includes("rail={"), "classificação é entregue ao slot lateral do card");
ok(list.includes('writingMode: "vertical-rl"'), "texto regulatório permanece vertical");
ok(list.includes("setSelectedRegulatory(regulatoryProfile)"), "toque na faixa abre a explicação regulatória");
ok(!list.includes("absolute -left-2.5"), "etiqueta sobreposta antiga foi removida");
ok(!list.includes('gap-1 pl-2.5'), "conteúdo não mantém recuo compensatório antigo");
ok(list.includes("VAULT_REGULATORY_COMPACT_DIALOG_V76_1"), "diálogo compacto permanece disponível");

console.log("V76.2 REGULATORY RAIL — CONTRATO OK");
