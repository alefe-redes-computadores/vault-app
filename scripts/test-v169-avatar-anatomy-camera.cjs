const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scene = fs.readFileSync(path.join(root, "components/saude/HealthAvatar3D.tsx"), "utf8");

// Anatomia segmentada: a evolução não pode voltar a usar um cilindro único por membro.
for (const part of ["upperArm", "forearm", "wrist", "thigh", "knee", "calf", "ankle"]) {
  assert.match(scene, new RegExp(`const ${part}=`), `${part} precisa permanecer explícito`);
}
assert.match(scene, /Collar bones and shoulder caps/);
assert.match(scene, /const limb=/);

// A base retangular substitui o pedestal circular e mantém contorno discreto.
assert.match(scene, /new THREE\.BoxGeometry\(1\.18,\.025,\.68\)/);
assert.match(scene, /new THREE\.EdgesGeometry\(stage\.geometry\)/);
assert.doesNotMatch(scene, /new THREE\.CircleGeometry\(\.72,32\)/);
assert.doesNotMatch(scene, /new THREE\.RingGeometry\(\.70,\.715,48\)/);

// Enquadramentos mudam suavemente sem reintroduzir loop permanente de renderização.
assert.match(scene, /let cameraTransition:/);
assert.match(scene, /if\(transition\|\|cameraTransition\)draw\(\)/);
assert.match(scene, /prefers-reduced-motion/);
assert.match(scene, /cameraTransition=null/);
assert.doesNotMatch(scene, /setAnimationLoop/);

// Viewport responsivo preserva leitura compacta e amplia a inspeção dedicada.
assert.match(scene, /compact\?"clamp\(210px, 29dvh, 250px\)":"clamp\(300px, 48dvh, 440px\)"/);
assert.match(scene, /linear-gradient\(180deg/);

console.log("V169 avatar anatomy + camera contract: OK");
