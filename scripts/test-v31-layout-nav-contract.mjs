import fs from "node:fs";
const r=f=>fs.readFileSync(f,"utf8"),ok=(v,m)=>{if(!v)throw Error(m)};
const css=r("app/globals.css"),mais=r("app/mais/page.tsx"),docs=r("app/documentos/page.tsx"),hoje=r("app/hoje/page.tsx"),nav=r("components/BottomNav.tsx"),providers=r("components/Providers.tsx"),native=r("scripts/patch-android-edge-to-edge-v28.mjs");
ok(css.includes(".header-safe-top {\n  padding-top: 1rem;"),"helper interno incorreto");
/*
 * V31 -> IA 2.0 P3B compatibility:
 * .header-safe-top is a STATIC 1rem padding helper (see globals.css),
 * not a second env(safe-area-inset-top) owner.  A class-name substring
 * cannot prove duplicated insets; reject the real top inset owners instead.
 * This deliberately preserves the newer P3B Documents contract.
 */
const assertInternalHeaderWithoutDuplicateInset = (source, page) => {
  const headers = [...source.matchAll(/<header\b[^>]*\bclassName\s*=\s*"([^"]+)"/g)];
  ok(headers.length > 0, `${page}: header ausente`);
  for (const [, classes] of headers) {
    const tokens = classes.trim().split(/\s+/);
    ok(tokens.filter(token => token === "header-safe-top").length <= 1,
      `${page}: helper de header repetido`);
    ok(!tokens.includes("app-system-header"),
      `${page}: header interno assume inset global`);
    ok(!tokens.includes("pt-safe"),
      `${page}: header interno assume safe-area superior`);
    ok(!tokens.some(token => token.includes("safe-area-inset-top")),
      `${page}: header interno usa inset nativo`);
  }
};
assertInternalHeaderWithoutDuplicateInset(mais, "Mais");
assertInternalHeaderWithoutDuplicateInset(docs, "Documentos");
/* Contratos negativos: provam que classes realmente conflitantes falham. */
for (const conflicting of [
  '<header className="app-system-header header-safe-top">',
  '<header className="pt-safe header-safe-top">',
  '<header className="header-safe-top header-safe-top">',
  '<header className="pt-[env(safe-area-inset-top)]">',
]) {
  let rejected = false;
  try { assertInternalHeaderWithoutDuplicateInset(conflicting, "fixture"); }
  catch { rejected = true; }
  ok(rejected, "V31 aceita duplicacao real de inset no fixture negativo");
}
ok(hoje.includes("bg-void px-4 pb-3 pt-3"),"Hoje ainda usa inset duplicado");
ok(nav.includes("fixed inset-x-0 bottom-0 z-50 bg-surface"),"BottomNav wrapper incorreto");
ok(nav.includes("pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"),"BottomNav sem safe bottom explicito");
ok(providers.includes("<BottomNav />"),"BottomNav global perdido");
ok(providers.includes("V30.5:"),"V30.5 perdida");
ok(native.includes("VAULT_EDGE_TO_EDGE_V28"),"V28 perdida");

const walk=(dir)=>{
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=`${dir}/${e.name}`;
    if(e.isDirectory()) out.push(...walk(p));
    else if(e.isFile() && e.name==="page.tsx") out.push(p);
  }
  return out;
};
const forbiddenTopOwners=[];
for(const f of walk("app")){
  const src=r(f);
  if(/\bpt-safe\b/.test(src) || /safe-area-inset-top/.test(src)) forbiddenTopOwners.push(f);
}
ok(forbiddenTopOwners.length===0,`Pages internas ainda reivindicam safe-area superior: ${forbiddenTopOwners.join(", ")}`);

console.log("V31 LAYOUT/NAVEGACAO CONTRATOS OK");
