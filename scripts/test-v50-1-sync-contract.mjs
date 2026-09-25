import fs from "node:fs";
const p=fs.readFileSync("components/Providers.tsx","utf8"),i=fs.readFileSync("components/SyncStatusIndicator.tsx","utf8"),r=fs.readFileSync("lib/sync/runtime-status.ts","utf8");
const c=[["runtime",r.includes("VAULT_BOOT_SYNC_V50_1")],["pull",p.includes('phase: "pulling"')],["push",p.includes('phase: "pushing"')],["await",p.includes("await processQueue()")],["synced",p.includes('phase: "synced"')],["fail",p.includes("result.permanentlyFailed > 0")],["ui",i.includes("useVaultSyncRuntime")],["no false green",i.includes("VAULT_SYNC_IDLE_TRUTH_V63")&&i.includes('syncRuntime.phase === "idle"')]];
let bad=false; for(const [n,ok] of c){console.log(`${ok?"OK":"FAIL"}: ${n}`);if(!ok)bad=true;} if(bad)process.exit(1); console.log("V50.1 SYNC CONTRACT: OK");
