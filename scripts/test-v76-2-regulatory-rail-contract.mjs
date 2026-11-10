import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`V76.2: ${message}`);
  console.log(`OK: ${message}`);
};

const list = read("app/saude/medicamentos/page.tsx");
const card = read("components/list/ListCard.tsx");

ok(card.includes("rail?: ReactNode"), "ListCard aceita conteúdo na faixa lateral");
ok(card.includes('railSize === "slim" ? "w-4" : "w-6"'), "faixa fina é opt-in");
ok(card.includes('"p-3 pl-8"'), "conteúdo compacto respeita a largura da faixa");
ok(list.includes('railSize="slim"'), "medicamento usa faixa vertical fina");
ok(list.includes("rail={"), "classificação é entregue ao trilho lateral");
ok(list.includes('writingMode: "vertical-rl"'), "texto regulatório vertical permanece compacto");
ok(list.includes("setSelectedRegulatory(regulatoryProfile)"), "toque na etiqueta abre a explicação regulatória");
ok(!list.includes("absolute -left-2.5"), "etiqueta sobreposta antiga foi removida");
ok(!list.includes('gap-1 pl-2.5'), "conteúdo não mantém recuo compensatório antigo");
ok(list.includes("VAULT_REGULATORY_COMPACT_DIALOG_V76_1"), "diálogo compacto permanece disponível");

console.log("V76.2 REGULATORY RAIL — CONTRATO OK");
