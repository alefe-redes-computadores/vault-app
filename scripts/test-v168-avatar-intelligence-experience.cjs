const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const scene = read("components/saude/HealthAvatar3D.tsx");
const avatar = read("components/saude/HealthAvatar.tsx");
const brain = read("components/vault-intelligence/BrainV5DetailSheet.tsx");

assert.match(scene, /appearance\.glasses==="rectangular"[\s\S]*softBox\(\.116,\.058/);
assert.match(scene, /V168: the grip wraps the device/);
assert.match(scene, /Math\.PI\/2\+phoneAngle/);
assert.match(scene, /const elbow=oval/);
assert.match(scene, /const ankle=(?:mesh|limb)/);
assert.match(avatar, /overscroll-contain/);
assert.match(avatar, /max-w-\[420px\]/);
assert.match(avatar, /<details open/);
assert.doesNotMatch(avatar, /sticky top-\[52px\]/);

assert.match(brain, /Risco potencial identificado nos registros/);
assert.match(brain, /não confirma um evento clínico/);
assert.match(brain, /Orientação segura/);
assert.match(brain, /Fontes regulatórias revisadas/);
assert.match(brain, /<details className=/);

console.log("V168 avatar immersion + intelligence hierarchy contract: OK");
