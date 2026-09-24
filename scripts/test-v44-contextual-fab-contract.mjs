import fs from "node:fs";

const nav = fs.readFileSync("components/BottomNav.tsx", "utf8");
const cards = fs.readFileSync("app/cartoes/page.tsx", "utf8");
const vaults = fs.readFileSync("app/vaults/page.tsx", "utf8");
const tratamentos = fs.readFileSync("app/saude/tratamentos/page.tsx", "utf8");
const retiradas = fs.readFileSync("app/saude/retiradas/page.tsx", "utf8");

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

ok(nav.includes("VAULT_CONTEXTUAL_FAB_PATH_NORMALIZATION_V44"), "marker V44 ausente");
ok(nav.includes("const normalizedPathname = normalizeNavPathname(pathname)"), "compose não normaliza pathname");
ok(nav.includes('normalizedPathname === "/saude/medicamentos"'), "medicamentos não usa pathname normalizado");
ok(nav.includes('"/saude/tratamentos",'), "tratamentos ausente do ALLOWED");
ok(nav.includes('"/saude/retiradas",'), "retiradas ausente do ALLOWED");
ok(nav.includes("REGISTROS_LIST_COMPOSE_OPTIONS"), "compose de registros ausente");
ok(nav.includes('path: "/saude/registros/novo"'), "destino de registro incorreto");
ok(nav.includes("RETIRADAS_LIST_COMPOSE_OPTIONS"), "compose de retiradas ausente");
ok(nav.includes('path: "/saude/retiradas/nova"'), "destino de retirada incorreto");
ok(nav.includes('normalizedPathname === "/saude/registros"'), "rota registros sem compose");
ok(nav.includes('normalizedPathname === "/saude/retiradas"'), "rota retiradas sem compose");

ok(!cards.includes('aria-label="Adicionar cartão"'), "FAB duplicado de cartões permaneceu");
ok(!vaults.includes('aria-label="Criar novo cofre"'), "FAB duplicado de cofres permaneceu");
ok(!tratamentos.includes('aria-label="Criar novo tratamento"'), "FAB duplicado de tratamentos permaneceu");
ok(!retiradas.includes('aria-label="Nova retirada"'), "botão duplicado de retiradas permaneceu");

ok(cards.includes('actionLabel="Novo cartão"'), "CTA EmptyState de cartões foi removido");
ok(vaults.includes('actionLabel="Criar cofre"'), "CTA EmptyState de cofres foi removido");
ok(tratamentos.includes('"Criar tratamento"'), "CTA EmptyState de tratamentos foi removido");
ok(retiradas.includes('actionLabel={retiradas.length === 0 ? "Nova retirada" : undefined}'), "CTA EmptyState de retiradas foi removido");

console.log("V44 CONTEXTUAL FAB CONTRACT: OK");
