import fs from "node:fs";
const r=f=>fs.readFileSync(f,"utf8"),ok=(v,m)=>{if(!v)throw Error(m)};
const css=r("app/globals.css"),mais=r("app/mais/page.tsx"),docs=r("app/documentos/page.tsx"),hoje=r("app/hoje/page.tsx"),nav=r("components/BottomNav.tsx"),providers=r("components/Providers.tsx"),native=r("scripts/patch-android-edge-to-edge-v28.mjs");
ok(css.includes(".header-safe-top {\n  padding-top: 1rem;"),"helper interno incorreto");
ok(!mais.includes("backdrop-blur-xl header-safe-top"),"Mais duplica inset");
ok(!docs.includes("backdrop-blur-xl header-safe-top"),"Documentos duplica inset");
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
