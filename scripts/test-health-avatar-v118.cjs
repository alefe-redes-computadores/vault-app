const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
if (JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).name !== "vault") {
  throw new Error("Execute no projeto Vault.");
}
const filename = path.join(root, "lib/health-profile/avatar.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: filename,
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled.outputText, filename);
const { avatarLayout, avatarColor, avatarShade } = loaded.exports;
const device = (id, kind, side, extra = {}) => ({
  id, kind, side, name: id, active: true, color: "#111111", updated_at: "2026-10-01T00:00:00Z", ...extra,
});

assert.equal(avatarColor("#ABCDEF"), "#abcdef");
assert.equal(avatarColor("bad-value"), "#bb8159");
assert.match(avatarShade("bad-value", 1.12), /^#[0-9a-f]{6}$/);
assert.equal(avatarShade("#ffffff", 2), "#ffffff");

const excluded = [device("arquivado", "watch", "right", { active: false }), device("sem-lado", "ring", "none"), device("balanca", "scale", "right")];
assert.equal(avatarLayout(excluded).slots.length, 0);
assert.equal(avatarLayout([device("relogio", "watch", "right")]).phoneSide, "left");
assert.equal(avatarLayout([device("anel", "ring", "left")]).phoneSide, "right");

const duplicates = [device("antigo", "watch", "right"), device("novo", "watch", "right", { updated_at: "2026-10-02T00:00:00Z" }), device("anel", "ring", "right")];
const originalOrder = duplicates.map((item) => item.id);
const resolved = avatarLayout(duplicates);
assert.equal(resolved.slots.length, 2);
assert.equal(resolved.slots.find((slot) => slot.kind === "watch").device.id, "novo");
assert.equal(resolved.slots.find((slot) => slot.kind === "watch").count, 2);
assert.match(resolved.description, /antigo/);
assert.match(resolved.description, /novo/);
assert.deepEqual(duplicates.map((item) => item.id), originalOrder);

const bothSides = [...duplicates, device("outro-relogio", "watch", "left"), device("outro-anel", "ring", "left")];
assert.equal(avatarLayout(bothSides).slots.length, 4);
assert.deepEqual(avatarLayout([...bothSides].reverse()).slots, avatarLayout(bothSides).slots);
console.log("AVATAR V118 OK: cores, lados, arquivados, posições duplicadas e dados originais preservados.");
