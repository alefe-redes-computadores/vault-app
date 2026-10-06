import fs from "node:fs";
const source=fs.readFileSync("app/saude/medicamentos/detalhes/page.tsx","utf8");
const checks=[
 [source.includes("VAULT_NAV_RUNTIME_DIAGNOSTIC_V92_4"),"marcador V92.4"],
 [source.includes("HISTORY_PUSHSTATE"),"pushState rastreado"],
 [source.includes("HISTORY_REPLACESTATE"),"replaceState rastreado"],
 [source.includes("DETAIL_MOUNT")&&source.includes("DETAIL_UNMOUNT"),"mount/unmount rastreados"],
 [source.includes("PATHNAME_EFFECT"),"pathname rastreado"],
 [source.includes("POPSTATE"),"popstate rastreado"],
 [source.includes("NAV TRACE"),"painel visual"],
 [source.includes("router.push(path);"),"V92.3 preservada"],
 [!source.includes("navigateReliably"),"helper legado ausente"],
 [!source.includes("window.location.assign"),"hack nativo ausente"],
];
let failed=false;
for(const [ok,label] of checks){if(ok)console.log(`✓ ${label}`);else{console.error(`✗ ${label}`);failed=true;}}
if(failed)process.exit(1);
console.log("\nVAULT V92.4 NAVIGATION RUNTIME DIAGNOSTIC: CONTRATOS OK");
