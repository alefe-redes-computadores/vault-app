import fs from "node:fs";
const r=f=>fs.readFileSync(f,"utf8"),ok=(v,m)=>{if(!v)throw Error("V56: "+m);console.log("OK: "+m)};
const runtime=r("lib/sync/runtime-status.ts"),indicator=r("components/SyncStatusIndicator.tsx"),mais=r("app/mais/page.tsx");
ok(runtime.includes("VAULT_SYNC_UX_V56"),"runtime Sync UX V2");
ok(runtime.includes("lastSyncedAt")&&runtime.includes("vault_last_sync"),"última sync persistida");
ok(indicator.includes("VAULT_SYNC_INDICATOR_V56"),"indicador V56");
ok(indicator.includes('router.push("/diagnostico")'),"diagnóstico usa rota real");
ok(!indicator.includes("window.location.hash"),"hash morto removido");
ok(indicator.includes("lastSyncLabel"),"horário da última sync");
ok(!mais.includes("item travado")&&!mais.includes("itens travados"),"pendência não é chamada de travada");
const canonical={"app/documentos/novo/page.tsx":"/documentos","app/pessoas/novo/page.tsx":"/pessoas","app/saude/medicos/novo/page.tsx":"/saude/medicos","app/saude/farmacias/novo/page.tsx":"/saude/farmacias","app/saude/documentos/novo/page.tsx":"/saude/documentos","app/saude/exames/novo/page.tsx":"/saude/exames","app/saude/cirurgias/nova/page.tsx":"/saude/cirurgias","app/saude/medicamentos/novo/page.tsx":"/saude/medicamentos","app/saude/consultas/nova/page.tsx":"/saude/consultas","app/saude/locais/novo/page.tsx":"/saude/locais","app/saude/registros/novo/page.tsx":"/saude/registros","app/saude/renovacao/nova/page.tsx":"/saude/renovacao","app/saude/hospitais/novo/page.tsx":"/saude/hospitais","app/saude/cids/novo/page.tsx":"/saude/cids"};
for(const [file,route] of Object.entries(canonical)){if(!fs.existsSync(file))continue;const s=r(file);ok(!s.includes("router.back()"),`${file}: sem back cego`);ok(s.includes(`router.replace("${route}")`),`${file}: fallback canônico`)}
ok(r("components/Providers.tsx").includes("VAULT_SYNC_TERMINAL_STATE_V50_1_1"),"sync V50.1.1 preservado");
ok(r("components/BiometricLock.tsx").includes("VAULT_BIOMETRIC_POLICY_V53"),"biometria V53 preservada");
console.log("V56 FINAL STABILITY CONTRACT: OK");
