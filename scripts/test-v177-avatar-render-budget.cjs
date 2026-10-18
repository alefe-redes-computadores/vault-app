const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file) {
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const scopedRequire = (id) => id === "./avatar-style"
    ? { normalizeAvatarStyle: (value) => value || {} }
    : require(id);
  new Function("require", "module", "exports", js)(scopedRequire, module, module.exports);
  return module.exports;
}

const { avatarRenderRatio, avatarConstrainedDevice, avatarDisplayName, parseAvatarName, avatarPreferencePayload } = load("lib/health-profile/avatar-preference.ts");
assert.equal(avatarRenderRatio(3, false), 1.5);
assert.equal(avatarRenderRatio(3, false, true), 1.3);
assert.equal(avatarRenderRatio(3, false, false, true), 1.15);
assert.equal(avatarRenderRatio(3, true, false, false), 1);
assert.equal(avatarRenderRatio(0, false), 1);
assert.equal(avatarConstrainedDevice({ hardwareConcurrency: 4 }), true);
assert.equal(avatarConstrainedDevice({ hardwareConcurrency: 8, deviceMemory: 8 }), false);
assert.equal(avatarConstrainedDevice({ reducedMotion: true }), true);
assert.equal(avatarDisplayName(null, "Álefe Jôhsefe"), "Álefe");
assert.equal(avatarDisplayName("  Meu parceiro  ", "Álefe"), "Meu parceiro");
assert.equal(avatarDisplayName("\u0000Avatar seguro", "Álefe"), "Avatar seguro");
assert.equal(parseAvatarName(avatarPreferencePayload("3d", "compact", {}, "Guardião"), "Álefe"), "Guardião");
assert.equal(parseAvatarName(JSON.stringify({ version: 1 }), "Álefe Jôhsefe"), "Álefe");

const scene = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");
const fallback = fs.readFileSync("components/saude/HealthBody.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar.tsx", "utf8");
const editor = fs.readFileSync("components/saude/AvatarStyleEditor.tsx", "utf8");
const page = fs.readFileSync("app/saude/minha-saude/page.tsx", "utf8");
for (const marker of ["jawShape", "jawGeometry", "cheek", "noseTip", "brimStitch", "toeTop", "lowerLip", "constrainedDevice"]) {
  assert(scene.includes(marker), `V177 marker missing: ${marker}`);
}
assert(scene.includes('powerPreference: "low-power"'));
assert(scene.includes("IntersectionObserver"));
assert(scene.includes("renderer.forceContextLoss()"));
assert(fallback.includes('d="M77 48 L103 48 L102 62'));
assert(avatar.includes("parseAvatarName(stored,personName)"));
assert(avatar.includes("name={avatarName} onNameChange={chooseName}"));
assert(editor.includes("Como chamar seu Avatar"));
assert(editor.includes("Não altera o nome da pessoa"));
assert(page.includes('personName={person?.name||""}'));

console.log("V177 avatar face planes + adaptive WebGL budget contract: OK");
