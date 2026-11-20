import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// NAV R6 FIX3 — verificador preventivo: roda antes dos 526 contratos.
// Não simula sucesso de produto: valida politica estrutural + casos reais do predicado.
const read = (path) => fs.readFileSync(path, "utf8");
const nav = read("components/BottomNav.tsx");
const guard = /if\s*\(\s*!shouldShowNav\s*\(\s*pathname\s*\)\s*\|\|\s*isFocusedClinicalEditor\s*\)\s*\{\s*return\s+null\s*;\s*\}/s;
assert.match(nav, guard, "REGRESSAO: a barra deve respeitar rota OU editor focado");
const focusExpression = nav.match(/const\s+isFocusedClinicalEditor\s*=\s*([\s\S]*?);/)?.[1];
assert.ok(focusExpression, "REGRESSAO: predicado de editor clinico nao encontrado");
const focus = (pathname, query="") => vm.runInNewContext(`Boolean(${focusExpression})`, { pathname, searchParams: new URLSearchParams(query) }, {timeout:500});
for (const [pathname, query] of [
  ["/saude/careflow/exames", "novo=1"],
  ["/saude/careflow/sintomas", "consulta=1"],
  ["/saude/careflow/pressao", "plano=1"],
  ["/saude/careflow/exames/", "novo=1"],
]) assert.equal(focus(pathname,query), true, `R6: editor deveria estar focado: ${pathname}?${query}`);
for (const [pathname,query] of [
  ["/saude/careflow/exames", ""],
  ["/saude/careflow/pressao", "filtro=1"],
  ["/saude/medicamentos", "novo=1"],
  ["/saude/careflow", "novo=1"],
]) assert.equal(focus(pathname,query), false, `R6: rota nao deveria ser focada: ${pathname}?${query}`);
assert.ok(nav.includes("router.replace(path);"), "V33.1: trocas de aba via replace");
assert.ok(nav.includes("router.push("), "V33.1: drill-down por push");
assert.ok(nav.includes("VAULT_HOME_NAV_FALLBACK_V37"), "V37: fallback perdido");
assert.ok(nav.includes('window.location.assign("/")'), "V37: retorno real para inicio perdido");
assert.ok(!nav.includes('data-vault-nav-probe="v38-r2"'), "V38: HUD temporario foi reintroduzido");
const tests = [
  "scripts/test-v33-1-navigation-contract.mjs",
  "scripts/test-v34-modal-viewport-contract.mjs",
  "scripts/test-v34-1-modal-layer-contract.mjs",
  "scripts/test-v34-2-modal-portal-contract.mjs",
  "scripts/test-v37-home-navigation-contract.mjs",
  "scripts/test-v38-r2-nav-probe-contract.mjs",
];
for (const file of tests) {
  const src = read(file);
  assert.ok(src.includes("isFocusedClinicalEditor"), `${file}: contrato nao foi atualizado para R6`);
  assert.ok(!src.includes('includes("if (!shouldShowNav(pathname))")'), `${file}: string fragil antiga`);
}
console.log("NAV_R6_FIX3_ESTRUTURAL_OK | 8 casos do predicado, 6 contratos e invariantes de navegacao");
