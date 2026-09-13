import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const nav = read("components/BottomNav.tsx");
const tabs = read("components/AreaTabs.tsx");
const favoritos = read("app/favoritos/page.tsx");
const documentos = read("app/documentos/page.tsx");
const mais = read("app/mais/page.tsx");

const checks = [
  ["barra inferior cobre a área segura com fundo opaco", nav.includes("bg-surface pb-safe")],
  ["barra inferior não deixa conteúdo vazar por transparência", !nav.includes("bg-surface/92") && !nav.includes("backdrop-blur-2xl")],
  ["Documentos não duplica o botão móvel de criação", !documentos.includes("bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30")],
  ["criação de documentos continua disponível", documentos.includes("openNewDocument")],
  ["Favoritos não mistura fundos incompatíveis", !favoritos.includes("bg-aurora") && favoritos.includes("bg-void px-5")],
  ["Favoritos não mantém cabeçalho alto preso ao rolar", !favoritos.includes("sticky top-0")],
  ["retorno de Favoritos é determinístico", favoritos.includes('router.replace("/mais")') && !favoritos.includes("router.back()")],
  ["estado vazio conduz ao acervo de documentos", favoritos.includes("Explorar documentos") && favoritos.includes('router.push("/documentos")')],
  ["categoria vazia permite recuperar a lista completa", favoritos.includes("Ver todos") && favoritos.includes("setSelectedCategory(null)")],
  ["abas oferecem Todos de forma explícita", tabs.includes("showAll?: boolean") && tabs.includes("activeArea === null")],
  ["filtros não ocupam espaço quando a coleção está vazia", favoritos.includes("totalCount > 0 || selectedCategory")],
  ["Cartões e contas bancárias continuam separados", mais.includes('label: "Cartões"') && mais.includes('label: "Contas bancárias"')],
];

console.log("== CONTRATOS POLIMENTO V14.1 ==");
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "OK" : "FALHA"}: ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`CONTRATOS POLIMENTO V14.1: OK (${checks.length})`);
