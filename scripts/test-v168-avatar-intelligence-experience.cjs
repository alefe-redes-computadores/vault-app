const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const scene = read("components/saude/HealthAvatar3D.tsx");
const avatar = read("components/saude/HealthAvatar.tsx");
const brain = read("components/vault-intelligence/BrainV5DetailSheet.tsx");

assert.match(scene, /appearance\.glasses==="rectangular"[\s\S]*softBox\(\.116,\.058/);
assert.ok(/V168: the grip wraps the device/.test(scene)||/V183: the dedicated grip replaces the generic fingers/.test(scene),"pegada dedicada preservada e versionada");
assert.match(scene, /!holdsPhone&&fingerIndex<4/);
assert.match(scene, /Math\.PI\/2\+phoneAngle/);
assert.match(scene, /const elbow=oval/);
assert.match(scene, /const ankle=(?:mesh|limb)/);
assert.match(avatar, /overscroll-contain/);
assert.ok(/max-w-\[420px\]/.test(avatar)||/max-w-\[520px\]/.test(avatar), "palco imersivo V168/V178 mantém largura limitada");
assert.ok(/<details open/.test(avatar)||/Ajustar visualização/.test(avatar), "controles V168 visíveis ou inspeção compacta V178 acessível");
assert.doesNotMatch(avatar, /sticky top-\[52px\]/);

assert.match(brain, /Risco potencial identificado nos registros/);
assert.match(brain, /não confirma um evento clínico/);
assert.match(brain, /Orientação segura/);
assert.match(brain, /Fontes regulatórias revisadas/);
assert.match(brain, /<details className=/);

console.log("V168 avatar immersion + intelligence hierarchy contract: OK");
