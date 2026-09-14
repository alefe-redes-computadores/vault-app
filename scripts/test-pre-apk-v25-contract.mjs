import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const checks = [];
const ok = (label, value) => {
  if (!value) throw new Error(`FALHOU: ${label}`);
  checks.push(label);
  console.log(`OK: ${label}`);
};

const pkg = json("package.json");
const capacitor = json("capacitor.config.json");
const manifest = json("public/manifest.json");
const nextConfig = read("next.config.js");
const providers = read("components/Providers.tsx");
const legacyContract = read("scripts/test-consolidacao-v8-r2-contract.mjs");

ok("APK não usa identificador provisório", capacitor.appId === "com.alefejohsefe.vault");
ok("APK não libera tráfego cleartext", capacitor.server?.cleartext === false);
ok("APK não depende de servidor remoto", !capacitor.server?.url && !capacitor.server?.hostname);
ok("conteúdo nativo vem do diretório exportado", capacitor.webDir === "out");
ok("barra nativa usa ícones claros", capacitor.plugins?.StatusBar?.style === "LIGHT" && providers.includes("Style.Light"));
ok("exportação Capacitor é real", nextConfig.includes('CAPACITOR_BUILD === "1"') && nextConfig.includes('output: "export"'));
ok("exportação usa rotas com trailing slash", nextConfig.includes("trailingSlash: true"));
ok("build valida versões antes de executar", pkg.scripts.build.includes("check:versions") && pkg.scripts["build:export"].includes("check:versions"));
ok("Capacitor não depende de symlink em .bin", pkg.scripts["cap:sync"].includes("node_modules/@capacitor/cli/bin/capacitor"));
ok("manifesto não repete ícones", new Set(manifest.icons.map((icon) => `${icon.src}|${icon.sizes}`)).size === manifest.icons.length);
ok("contrato legado aceita redação honesta atual", legacyContract.includes("não promete segurança absoluta"));
ok("sem promessa de zero-knowledge", read("app/inteligencia/page.tsx").includes("não promete segurança absoluta"));
ok("gate de versões existe", fs.existsSync("scripts/check-runtime-versions.mjs"));
ok("Sentry não tenta sourcemap no pacote local", nextConfig.includes("disable: isCapacitorExport"));
ok("sem migration ou Dexie v40", !read("lib/db/index.ts").includes(".version(40)"));

console.log(`CONTRATOS PRÉ-APK V25: OK (${checks.length})`);
