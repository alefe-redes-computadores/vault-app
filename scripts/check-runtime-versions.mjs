import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const declared = readJson("package.json");
const lock = readJson("package-lock.json");

const expectedNext = declared.dependencies?.next;
const lockedNext = lock.packages?.["node_modules/next"]?.version;

let installedNext = null;
try {
  installedNext = readJson("node_modules/next/package.json").version;
} catch {
  // A mensagem unificada abaixo explica como reparar.
}

if (!expectedNext || !lockedNext || installedNext !== lockedNext || expectedNext !== lockedNext) {
  console.error("ERRO: dependências do Next estão divergentes.");
  console.error(`package.json: ${expectedNext || "ausente"}`);
  console.error(`package-lock.json: ${lockedNext || "ausente"}`);
  console.error(`node_modules: ${installedNext || "ausente"}`);
  console.error("No Termux, repare com: npm install --ignore-scripts --no-bin-links");
  process.exit(1);
}

console.log(`OK: Next ${installedNext} coincide com package.json e package-lock.json`);
