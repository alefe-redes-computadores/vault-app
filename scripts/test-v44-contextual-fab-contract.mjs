import fs from "node:fs";

const nav = fs.readFileSync("components/BottomNav.tsx", "utf8");
const compose = fs.readFileSync("lib/navigation/bottom-nav-compose.ts", "utf8");
const cards = fs.readFileSync("app/cartoes/page.tsx", "utf8");
const header = fs.readFileSync("components/list/ListPageHeader.tsx", "utf8");
const create = fs.readFileSync("components/list/ContextualCreateP2.tsx", "utf8");
const vaults = fs.readFileSync("app/vaults/page.tsx", "utf8");
const tratamentos = fs.readFileSync("app/saude/tratamentos/page.tsx", "utf8");
const retiradas = fs.readFileSync("app/saude/retiradas/page.tsx", "utf8");

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

ok(nav.includes("VAULT_CONTEXTUAL_FAB_PATH_NORMALIZATION_V44"), "marker V44 ausente");
ok(nav.includes("getComposeOptions(") && nav.includes("normalizeNavPathname(pathname),") && compose.includes("const normalizedPathname = pathname;"), "compose recebe pathname já normalizado sem segunda regra");
ok(compose.includes('normalizedPathname === "/saude/medicamentos"'), "medicamentos não usa pathname normalizado");
ok(nav.includes('"/saude/tratamentos",'), "tratamentos ausente do ALLOWED");
ok(nav.includes('"/saude/retiradas",'), "retiradas ausente do ALLOWED");
ok(compose.includes("REGISTROS_LIST_COMPOSE_OPTIONS"), "compose de registros ausente");
ok(compose.includes('path: "/saude/registros/novo"'), "destino de registro incorreto");
ok(compose.includes("RETIRADAS_LIST_COMPOSE_OPTIONS"), "compose de retiradas ausente");
ok(compose.includes('path: "/saude/retiradas/nova"'), "destino de retirada incorreto");
ok(compose.includes('normalizedPathname === "/saude/registros"'), "rota registros sem compose");
ok(compose.includes('normalizedPathname === "/saude/retiradas"'), "rota retiradas sem compose");

ok(!cards.includes('aria-label="Adicionar cartão"'), "FAB duplicado de cartões permaneceu");
ok(!vaults.includes('aria-label="Criar novo cofre"'), "FAB duplicado de cofres permaneceu");
ok(!tratamentos.includes('aria-label="Criar novo tratamento"'), "FAB duplicado de tratamentos permaneceu");
ok(!retiradas.includes('aria-label="Nova retirada"'), "botão duplicado de retiradas permaneceu");

ok(!cards.includes('actionLabel="Novo cartão"'), "Cartões: cadastro único no cabeçalho, sem EmptyState duplicado");
ok(!vaults.includes('actionLabel="Criar cofre"'), "Cofres: cadastro único no cabeçalho, sem EmptyState duplicado");
ok(!tratamentos.includes('"Criar tratamento"'), "Tratamentos: cadastro único no cabeçalho, sem EmptyState duplicado");
ok(!retiradas.includes('actionLabel={retiradas.length === 0 ? "Nova retirada" : undefined}'), "Retiradas: cadastro único no cabeçalho, sem EmptyState duplicado");

ok(header.includes('data-vault-p0-create-row="visible"') && header.includes('<ContextualCreateP2 option={p2Options[0]}') && create.includes('withReturnTarget(option.path, origin)') && create.includes('const Icon = Plus;'), "CTA do cabeçalho visível, Plus universal e retorno contextual real");
console.log("V44 CONTEXTUAL FAB CONTRACT: OK");
