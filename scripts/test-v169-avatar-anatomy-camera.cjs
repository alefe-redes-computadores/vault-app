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

// V169 + P6: protege o comportamento responsivo, nao um pixel antigo.
// A altura continua clamp(min, percentual de viewport, max). O modo de
// inspecao deve dispor de area maior, com limite superior para nao dominar
// a tela, e a camera deve ser ajustada para canvas estreitos em outra camada.
const viewport=scene.match(/style=\{\{height:compact\?"clamp\((\d+)px, (\d+)dvh, (\d+)px\)":"clamp\((\d+)px, (\d+)dvh, (\d+)px\)"\}\}/);
assert.ok(viewport, "V169: canvas usa clamp por viewport no modo compacto e na inspeção");
const [compactMin, compactDvh, compactMax, expandedMin, expandedDvh, expandedMax]=viewport.slice(1).map(Number);
assert.ok(
  compactMin>=190 && compactMin<=250 && compactDvh>=25 && compactDvh<=35 &&
  compactMax>=240 && compactMax<=260 && compactMin<=compactMax,
  "V169: prévia compacta preserva legibilidade sem ocupar a tela"
);
assert.ok(
  expandedMin>=260 && expandedMin<=350 && expandedDvh>=44 && expandedDvh<=56 &&
  expandedMax>=440 && expandedMax<=500 && expandedMin<=expandedMax &&
  expandedMin>compactMin && expandedMax>compactMax,
  "V169: inspeção dedicada continua maior, responsiva e com limites de altura"
);
assert.match(scene,/avatarCameraFrameForViewport\(framingRef\.current/, "V169: câmera considera proporção real do canvas");
assert.match(scene,/avatarAdaptiveRatio\(/, "V169: proporção GPU adaptativa mantida");
assert.match(scene, /linear-gradient\(180deg/);

console.log("V169 avatar anatomy + camera contract: OK");
