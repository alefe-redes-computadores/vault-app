import fs from "node:fs";

const queue = fs.readFileSync("hooks/useSyncQueue.ts", "utf8");
const providers = fs.readFileSync("components/Providers.tsx", "utf8");

function ok(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`OK: ${message}`);
}

ok(/fatalError:\s*string\s*\|\s*null/.test(queue), "resultado diferencia erro fatal");
ok(/fatalError:\s*null/.test(queue), "resultado vazio começa sem erro fatal");
ok(queue.includes("VAULT_SYNC_TERMINAL_STATE_V50_1_1"), "marcador V50.1.1 presente");
ok(/result\.fatalError\s*=\s*errorMessage/.test(queue), "catch global grava erro fatal");

ok(
  !providers.includes("result.failed > 0 || result.permanentlyFailed > 0"),
  "tentativa transitória não define erro terminal"
);

ok(
  /result\.fatalError\s*\|\|\s*result\.permanentlyFailed\s*>\s*0/.test(providers),
  "erro terminal exige erro fatal ou falha permanente"
);

ok(
  /result\.remaining\s*>\s*0/.test(providers),
  "fila restante impede falso sucesso"
);

ok(
  /phase:\s*"synced",\s*error:\s*null/.test(providers),
  "fila concluída termina sincronizada"
);

console.log("V50.1.1 SYNC TERMINAL STATE CONTRACT: OK");
