import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const ok = (label, condition) => {
  if (!condition) throw new Error(`FALHA: ${label}`);
  checks.push(label);
  console.log(`OK: ${label}`);
};

const page = read("app/saude/plano-seguranca/page.tsx");
const plan = read("lib/safety-plan.ts");
const home = read("components/home/HomeCommandCenter.tsx");
const quality = read("lib/medication-catalog/data-quality.ts");
const medicationNew = read("app/saude/medicamentos/novo/page.tsx");
const layout = read("app/layout.tsx");
const nextConfig = read("next.config.js");
const worker = read("public/sw.js");
const manifest = JSON.parse(read("public/manifest.json"));

console.log("== CONTRATOS VAULT V22–V24 ==");
ok("V22 plano é separado pela pessoa ativa", plan.includes("vault:safety-plan:v1:${personId}"));
ok("V22 não diagnostica nem envia automaticamente", page.includes("não diagnostica uma crise") && page.includes("não envia mensagens automaticamente"));
ok("V22 diferencia apoio emocional de emergência", page.includes("apoio emocional") && page.includes("SAMU 192"));
ok("V22 possui contatos acionáveis", page.includes('href="tel:192"') && page.includes('href="tel:188"'));
ok("V22 inclui sinais, vínculos, rede e ambiente seguro", ["warningSigns", "reasonsToStay", "professionalContacts", "saferEnvironment"].every((text) => page.includes(text)));
ok("V22 não usa motivação inventada pelo motor", !page.includes("sua filha") && !page.includes("tentativas anteriores"));
ok("V22 permanece acessível pela central da Home", home.includes('/saude/plano-seguranca'));
ok("V22 oferece registro canônico no prontuário", page.includes('/saude/registros/novo'));
ok("V23 diferencia não verificado de catálogo indisponível", quality.includes('"not_checked"') && quality.includes('"catalog_unavailable"'));
ok("V23 somente chama de verificado quando há correspondência", quality.includes('"verified"') && quality.includes("dosageMatchesPresentations"));
ok("V23 mantém divergência como aviso, não bloqueio arbitrário", quality.includes('"mismatch"') && medicationNew.includes("catalogDosageQuality.matches"));
ok("V24 Eruda existe apenas no desenvolvimento", layout.includes('process.env.NODE_ENV === "development" &&'));
ok("V24 build não ignora erros TypeScript", !nextConfig.includes("ignoreBuildErrors"));
ok("V24 invalida o shell antigo do PWA", Number(worker.match(/vault-shell-v(\d+)/i)?.[1] || 0) >= 24);
ok("V24 usa um manifesto canônico", !fs.existsSync("public/site.webmanifest") && manifest.start_url === "/");
ok("V24 ícones declaram suporte maskable", manifest.icons.some((icon) => String(icon.purpose).includes("maskable")));
ok("sem migration ou Dexie novo", !fs.readdirSync("supabase/migrations").some((name) => name.includes("v22") || name.includes("v23") || name.includes("v24")));

console.log(`CONTRATOS VAULT V22–V24: OK (${checks.length})`);
