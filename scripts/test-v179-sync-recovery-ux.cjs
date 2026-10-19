const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("lib/sync/manual-sync.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const transitions = [];
const moduleRef = { exports: {} };
new Function("require", "module", "exports", js)(
  (id) => id === "./runtime-status"
    ? { setVaultSyncRuntime: (state) => transitions.push(state) }
    : require(id),
  moduleRef,
  moduleRef.exports
);

const { runManualVaultSync } = moduleRef.exports;
(async () => {
  transitions.length = 0;
  const healthy = await runManualVaultSync({
    pull: async () => {},
    push: async () => ({ remaining: 0, permanentlyFailed: 0, offline: false, fatalError: null }),
  });
  assert.equal(healthy.phase, "synced");
  assert.deepEqual(transitions.map((item) => item.phase), ["pulling", "pushing", "synced"]);
  assert.equal(transitions.at(-1).error, null, "successful manual sync clears stale visual error");

  transitions.length = 0;
  const pending = await runManualVaultSync({
    pull: async () => {},
    push: async () => ({ remaining: 2, permanentlyFailed: 0 }),
  });
  assert.equal(pending.phase, "idle");
  assert.equal(transitions.at(-1).error, null);

  transitions.length = 0;
  const partial = await runManualVaultSync({
    pull: async () => {},
    pullIssue: () => "Uma tabela falhou.",
    push: async () => ({ remaining: 0, permanentlyFailed: 0 }),
  });
  assert.equal(partial.phase, "error");
  assert.equal(partial.error, "Uma tabela falhou.");

  const diagnosis = fs.readFileSync("app/diagnostico/page.tsx", "utf8");
  const recovery = fs.readFileSync("app/recuperacao/page.tsx", "utf8");
  const queue = fs.readFileSync("hooks/useSyncQueue.ts", "utf8");
  const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");
  assert(diagnosis.includes("runManualVaultSync"));
  assert(diagnosis.includes('operation.phase === "error"'), "manual sync cannot toast success over terminal failure");
  assert(diagnosis.includes("Preparar envio das ausentes"));
  assert(diagnosis.includes("Confirmar reparo seguro?"));
  assert(diagnosis.includes("Nada será apagado e o estoque não será movimentado novamente."));
  assert(recovery.includes("runManualVaultSync"));
  assert(queue.includes('setVaultSyncRuntime({ phase: "pushing", error: null })'));
  assert(queue.includes('setVaultSyncRuntime({ phase: "synced", error: null })'));
  assert(avatar.includes("upperLid"));
  console.log("V179 manual sync runtime recovery, explicit dose repair and avatar eyelids: OK");
})().catch((error) => { console.error(error); process.exitCode = 1; });
