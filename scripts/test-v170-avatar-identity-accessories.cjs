const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = file => fs.readFileSync(file, "utf8");
const style = read("lib/health-profile/avatar-style.ts");
const editor = read("components/saude/AvatarStyleEditor.tsx");
const scene = read("components/saude/HealthAvatar3D.tsx");
const fallback = read("components/saude/HealthBody.tsx");

assert.match(style, /topColor: string/);
assert.match(style, /bottomColor: string/);
assert.match(style, /topColor: color\(data\.topColor/);
assert.match(style, /bottomColor: color\(data\.bottomColor/);
assert.match(editor, /\['outfit','Roupa',Palette\]/);
assert.match(editor, /label="Camiseta"/);
assert.match(editor, /label="Parte de baixo"/);

assert.match(scene, /top: new THREE\.MeshStandardMaterial\(\{ color: appearance\.topColor/);
assert.match(scene, /bottom: new THREE\.MeshStandardMaterial\(\{ color: appearance\.bottomColor/);
assert.match(scene, /materials\.top\.color\.set\(value\.topColor\)/);
assert.match(scene, /materials\.bottom\.color\.set\(value\.bottomColor\)/);
assert.match(scene, /const crownFront=/);
assert.match(scene, /const capButton=/);
assert.match(scene, /const outsole=/);
assert.match(scene, /const collar=mesh\(new THREE\.TorusGeometry/);
assert.match(scene, /for\(let j=0;j<4;j\+\+\)/);

assert.match(fallback, /fill=\{appearance\.topColor\}/);
assert.match(fallback, /fill=\{appearance\.bottomColor\}/);
assert.doesNotMatch(scene, /setAnimationLoop/);

console.log("V170 avatar identity + accessories contract: OK");
