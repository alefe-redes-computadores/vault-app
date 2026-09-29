import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V74: ${message}`);
  console.log(`OK: ${message}`);
};

const detail = read("app/saude/medicamentos/detalhes/page.tsx");
const contextual = read("components/vault-intelligence/ContextualHealthIntelligence.tsx");
const safety = read("lib/health-intelligence/medication-safety.ts");
const renewalNew = read("app/saude/renovacao/nova/page.tsx");
const renewalDetail = read("app/saude/renovacao/detalhes/page.tsx");

ok(!detail.includes("window.location.assign"), "detalhe não força recarga de página");
ok(detail.includes("handleSafeBack();"), "voltar usa fallback seguro");
ok(detail.includes("<MoreHorizontal"), "menu usa semântica de mais ações");
ok(detail.includes('id="historico-aquisicoes"'), "melhor preço aponta para histórico real");
ok(detail.includes("/saude/medicos/detalhes?id="), "médico relacionado abre detalhes");
ok(detail.includes("/saude/hospitais/detalhes?id="), "hospital relacionado abre detalhes");
ok(detail.includes("/saude/locais/detalhes?id="), "local relacionado abre detalhes");
ok(detail.includes("/saude/farmacias/detalhes?id="), "farmácia relacionada abre detalhes");
ok(detail.includes("/saude/renovacao/detalhes?id="), "aquisição abre detalhes");
ok(!detail.includes('className="fixed bottom-5 right-5'), "exclusão saiu do botão flutuante");
ok(contextual.includes("snap-mandatory") && contextual.includes("activeIndex"), "múltiplos insights têm navegação e indicador");
ok(contextual.includes("?healthInsight="), "Central abre o insight exato");
ok(safety.includes("quantity7d") && safety.includes("quantity24h"), "alerta soma eventos e quantidades");
ok(renewalNew.includes("router.replace(returnTo)"), "nova aquisição retorna à origem");
ok(renewalDetail.includes("router.replace(returnTo)"), "detalhe de aquisição retorna à origem");

console.log("V74 medication reliability contract: PASS");
