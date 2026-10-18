const assert = require("node:assert/strict");
const fs = require("node:fs");

const scene = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");
const fallback = fs.readFileSync("components/saude/HealthBody.tsx", "utf8");

for (const contract of ["phoneArmSign", "noseBridge", "innerEar", "underBrim", "quarter", "phoneRim", "phoneCamera"]) assert(scene.includes(contract), `geometria ausente: ${contract}`);
assert(scene.includes("const holdsPhone=sign===phoneArmSign"), "braço não acompanha o lado da pegada");
assert(scene.includes("for(const eyeletSide of [-1,1])"), "tênis sem ilhós nas duas laterais");
assert(scene.includes('powerPreference: "low-power"'), "orçamento de GPU removido");
assert(scene.includes("visibilityObserver.disconnect()"), "renderer não é suspenso/liberado");
assert(fallback.includes('stroke="#07101a"'), "fallback sem leitura inferior da aba");
assert(fallback.includes("[ -7,-1,5,11 ].map"), "fallback sem dedos envolvendo o celular");

console.log("V173 avatar silhouette + grip contract: OK");
