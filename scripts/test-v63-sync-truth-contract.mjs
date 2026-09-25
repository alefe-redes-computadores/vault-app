// scripts/test-v63-sync-truth-contract.mjs
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V63 SYNC: ${message}`);
  console.log(`OK: ${message}`);
};

const providers = read("components/Providers.tsx");
const indicator = read("components/SyncStatusIndicator.tsx");

ok(providers.includes("VAULT_SYNC_WATCHDOG_V63"), "watchdog de lentidão existe");
ok(providers.includes('setVaultSyncRuntime({ phase: "idle", error: null })'), "fila adiada encerra envio ativo");
ok(indicator.includes("VAULT_SYNC_IDLE_TRUTH_V63"), "estado ocioso é explícito");
ok(indicator.includes(">Pronto<"), "estado ocioso não anuncia sincronização");
const pendingBranch = indicator.split('if (\n    pendingCount >')[1]?.split('if (syncRuntime.phase === "error")')[0] ?? "";
ok(pendingBranch.length > 0 && !pendingBranch.includes("animate-spin"), "fila pendente não finge processamento ativo");
ok(indicator.includes('syncRuntime.phase === "pulling"') && indicator.includes('syncRuntime.phase === "pushing"'), "spinner permanece nos trabalhos ativos");

console.log("V63 SYNC TRUTH: OK");
