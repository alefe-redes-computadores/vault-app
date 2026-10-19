const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file) {
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const scopedRequire = (id) => {
    if (id === "./avatar-style") return { normalizeAvatarStyle: (value) => value || {} };
    return require(id);
  };
  new Function("require", "module", "exports", js)(scopedRequire, module, module.exports);
  return module.exports;
}

const { parseAvatarFraming, avatarPreferencePayload } = load("lib/health-profile/avatar-preference.ts");
assert.equal(parseAvatarFraming(null), "body");
assert.equal(parseAvatarFraming("not-json"), "body");
assert.equal(parseAvatarFraming(JSON.stringify({ version: 1, framing: "face" })), "face");
assert.equal(parseAvatarFraming(JSON.stringify({ version: 1, framing: "shoes" })), "shoes");
assert.equal(parseAvatarFraming(JSON.stringify({ version: 1, framing: "clinical" })), "body");
assert.equal(parseAvatarFraming(avatarPreferencePayload("3d", "expanded", {}, "Álefe", "face")), "face");

const shell = fs.readFileSync("components/saude/HealthAvatar.tsx", "utf8");
const scene = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");
assert(shell.includes("parseAvatarFraming(stored)"));
assert(shell.includes("onFramingChange={chooseFraming}"));
assert(shell.includes("Sua representação pessoal e de saúde"));
assert(shell.includes("Ajustar visualização"));
assert(!shell.includes("<details open className=\"group mx-auto mt-3 max-w-[520px]"));
assert(scene.includes('max-w-[440px]'));
assert(scene.includes("touchAction = \"pan-y\""));
assert(scene.includes("IntersectionObserver"));
assert(scene.includes("renderer.forceContextLoss()"));
assert(scene.includes("Aparelhos representados · {slots.length}"));
assert(scene.includes("Arraste para girar · toque no corpo, Brain ou aparelho para explorar"));
// V181 mantém a diferenciação entre os modelos sem aceitar novamente a aba superdimensionada da V178.
assert(scene.includes('appearance.hat==="flat"?.32:.30'));
assert(scene.includes('appearance.hat==="flat"?.285:.27'));
assert(!scene.includes('appearance.hat==="flat"?.43:.40'));

console.log("V178 immersive avatar inspection, persisted framing and compact controls: OK");
