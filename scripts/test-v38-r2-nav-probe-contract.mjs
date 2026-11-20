import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// NAV R6 FIX3: V38-R2 foi um HUD temporario, nao um requisito de producao.
// O contrato permanente verifica as garantias reais V31.2/V33.1/V37/R6.
const nav = fs.readFileSync("components/BottomNav.tsx", "utf8");
const mountGuard = /if\s*\(\s*!shouldShowNav\s*\(\s*pathname\s*\)\s*\|\|\s*isFocusedClinicalEditor\s*\)\s*\{\s*return\s+null\s*;\s*\}/s;
assert.match(nav, /function\s+shouldShowNav\s*\(/, "V31.2: autoridade de visibilidade por rota ausente");
assert.match(nav, mountGuard, "R6: montagem por rota e foco clinico regrediu");
assert.match(nav, /vault-bottom-nav/, "V31.2: classe da barra ausente");
assert.match(nav, /VAULT_HOME_NAV_FALLBACK_V37/, "V37: fallback da Home ausente");
assert.match(nav, /normalizeNavPathname\(window\.location\.pathname\)/, "V37: rota real nao conferida");
assert.ok(nav.includes('window.location.assign("/")'), "V37: fallback real ausente");
assert.ok(nav.includes("router.replace(path);"), "V33.1: troca de abas deve usar replace");
assert.ok(nav.includes("router.push("), "V33.1: criacao e detalhes devem preservar push");
assert.ok(!nav.includes('data-vault-nav-probe="v38-r2"'), "HUD temporario nao deve reaparecer no release");
const expression = nav.match(/const\s+isFocusedClinicalEditor\s*=\s*([\s\S]*?);/)?.[1];
assert.ok(expression, "R6: calculo do editor focado ausente");
function focused(pathname, query="") {
  return vm.runInNewContext(`Boolean(${expression})`, { pathname, searchParams: new URLSearchParams(query) }, {timeout: 500});
}
assert.equal(focused("/saude/careflow/exames", "novo=1"), true, "R6: novo exame precisa de foco");
assert.equal(focused("/saude/careflow/sintomas", "consulta=1"), true, "R6: editor de sintomas precisa de foco");
assert.equal(focused("/saude/careflow/pressao", "plano=1"), true, "R6: plano precisa de foco");
assert.equal(focused("/saude/careflow/exames", "filtro=1"), false, "R6: leitura nao esconde a barra");
assert.equal(focused("/saude/medicamentos", "novo=1"), false, "R6: foco nao deve vazar a outras rotas");
console.log("V38 R2 — NAV R6 SEM HUD TEMPORARIO: OK");
