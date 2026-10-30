const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const central = fs.readFileSync("app/inteligencia/alertas/page.tsx", "utf8");
const hub = fs.readFileSync("app/inteligencia/page.tsx", "utf8");
const contextual = fs.readFileSync("components/vault-intelligence/ContextualHealthIntelligence.tsx", "utf8");
const healthSheet = fs.readFileSync("components/vault-intelligence/HealthInsightSheet.tsx", "utf8");
const vaultSheet = fs.readFileSync("components/vault-intelligence/VaultInsightSheet.tsx", "utf8");
const brainSheet = fs.readFileSync("components/vault-intelligence/BrainV5DetailSheet.tsx", "utf8");
const dialogGuard = fs.readFileSync("hooks/useDialogGuard.ts", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

assert(central.includes("createLocalSearchIndex") && central.includes("filterLocalSearchIndex"));
assert(central.includes('useReturnContext("/inteligencia")'));
assert(central.includes("router.push(preserveReturn(href))"));
assert(central.includes('role="dialog"') && central.includes('aria-labelledby="brain-filters-title"'));
assert(central.includes('flex flex-wrap gap-2') && central.includes('laneCounts[key]') && central.includes('Filtrar por momento da decisão'), "decision lanes remain visible, compact and reachable");
assert(central.includes('contentVisibility:"auto"'));

assert(hub.includes('useReturnContext("/mais")'));
assert(!hub.includes('router.replace("/mais")'));
assert(hub.includes('preserveReturn("/inteligencia/alertas")'));
assert.ok((hub.match(/router\.push\(preserveReturn\(href\)\)/g)?.length || 0) >= 2, "Central preserva as rotas contextuais históricas e permite novas superfícies navegáveis");

assert(contextual.includes("withReturnTarget"));
assert(contextual.includes("currentHref"));
assert(contextual.includes("openWithReturn(href)"));
for (const sheet of [healthSheet, vaultSheet, brainSheet]) assert(sheet.includes("useDialogGuard"));
assert(dialogGuard.includes('event.key !== "Escape"'));
assert(dialogGuard.includes('document.body.style.overflow = "hidden"'));
assert(dialogGuard.includes("focusOrigin?.focus"));

assert(avatar.includes("V194: o volume craniano"));
assert(avatar.includes("mouth.scale.y=.62"));
assert(avatar.includes("const neutralMouth=mesh(softBox("));
assert(!avatar.includes("requestAnimationFrame(animate)"), "Avatar must remain on-demand");

const searchSource = fs.readFileSync("lib/local-search.ts", "utf8");
const searchJs = ts.transpileModule(searchSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleRef = { exports: {} };
new Function("module", "exports", searchJs)(moduleRef, moduleRef.exports);
const { createLocalSearchIndex, filterLocalSearchIndex } = moduleRef.exports;
const rows = createLocalSearchIndex([
  { title: "Interação com Clorpromazina", evidence: "Atenção ao histórico" },
  { title: "Sono", evidence: "7 horas" },
], (item) => [item.title, item.evidence]);
assert.equal(filterLocalSearchIndex(rows, "clorpromazina atencao")[0].title, "Interação com Clorpromazina");
assert.equal(filterLocalSearchIndex(rows, "7h")[0].title, "Sono");

console.log("VAULT V194 — INTELLIGENCE COMMAND + AVATAR FACE CONTRACT OK");
