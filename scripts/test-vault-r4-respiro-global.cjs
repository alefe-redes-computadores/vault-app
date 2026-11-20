'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = process.cwd();
const rel = [
  'app/page.tsx','app/hoje/page.tsx','app/saude/medicamentos/page.tsx',
  'app/saude/exames/page.tsx','app/saude/consultas/page.tsx',
  'app/saude/minha-saude/page.tsx','app/documentos/page.tsx','app/mais/page.tsx',
  'app/saude/careflow/page.tsx','app/saude/careflow/linha-do-tempo/page.tsx',
  'app/saude/careflow/exames/page.tsx','app/saude/careflow/episodios/page.tsx',
  'app/saude/careflow/dossie/page.tsx','app/saude/careflow/modo-medico/page.tsx',
  'app/saude/careflow/relatorios/page.tsx','app/saude/careflow/pressao/page.tsx',
  'app/saude/careflow/sintomas/page.tsx',
];
function read(name){return fs.readFileSync(`${root}/${name}`,'utf8')}
const css=read('app/globals.css');
assert.match(css,/VAULT_R4_RESPIRO_GLOBAL/);
assert.match(css,/body:not\(:has\(nav\.vault-bottom-nav\)\) \.vault-adaptive-tail/);
assert.match(css,/body:has\(nav\.vault-bottom-nav\) \.vault-adaptive-tail/);
assert.match(css,/body:has\(nav\.vault-bottom-nav button\.absolute\) \.vault-adaptive-tail/);
assert.match(css,/min-height: calc\(100dvh - env\(safe-area-inset-top/);
assert.match(css,/@supports selector\(body:has\(nav\.vault-bottom-nav\)\)/);
assert.match(css,/padding-bottom: calc\(8rem \+ env\(safe-area-inset-bottom/);
let count=0;
for (const name of rel) {
 const content=read(name);
 const mains=Array.from(content.matchAll(/<main\b[^>]{0,700}?\bclassName="([^"]+)"/gs), x=>x[1]);
 const marked=mains.filter(x=>x.includes('vault-adaptive-tail'));
 assert(marked.length>=1&&marked.length<=2,`${name}: root main not calibrated`);
 for (const c of marked) {
   assert(c.includes('bg-void'),`${name}: original dark identity lost`);
   assert(c.includes('min-h-'),`${name}: unexpected main semantics`);
 }
 count+=marked.length;
}
assert.match(read('components/BottomNav.tsx'),/vault-bottom-nav fixed/);
assert.match(read('components/BottomNav.tsx'),/absolute -top-12 right-2/);
assert.match(read('lib/navigation/ia20-root-navigation.ts'),/ia20IsCareflowOverview/);
const examPage=read('app/saude/careflow/exames/page.tsx');
assert.match(examPage,/min-h-\[clamp\(14rem,38dvh,24rem\)\]/);
assert.match(examPage,/Nenhum pedido de exames por aqui/);
assert.match(examPage,/onClick=\{\(\)=>setTab\('new'\)\}/);

console.log(`R4_RESPIRO_GLOBAL_OK | paginas=${rel.length} | mains=${count} | safe-area/nav/compose preservados`);
