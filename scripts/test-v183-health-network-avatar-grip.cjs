const assert=require("node:assert/strict");
const fs=require("node:fs");

const network=fs.readFileSync("app/saude/rede/page.tsx","utf8");
const networkIndex=fs.readFileSync("lib/health-network/care-network-index.ts","utf8");
const avatar=fs.readFileSync("components/saude/HealthAvatar3D.tsx","utf8");

assert(network.includes("const filteredRetiradas ="));
assert(network.includes("buildCareNetworkIndex"));
assert(networkIndex.includes("const retiradas = owned(input.retiradas)"));
assert(networkIndex.includes("retiradas: index.retiradas.length"));
assert(network.includes('useReturnContext("/")')&&network.includes("preserveReturn(path)"));
assert(network.includes("Atenções da rotina")&&network.includes("alertsOpen"));
assert(network.includes('min-h-[72px]')&&!network.includes('min-h-[150px]'));
assert(network.includes("Resumo da sua saúde")&&network.includes("Acervo conectado"));
assert(network.includes("onClick={onClick}"),"cards compactos não devem disparar haptic duplicado");

assert(avatar.includes("A mão do celular usa uma única palma"));
assert(avatar.includes("!holdsPhone&&fingerIndex<4"));
assert(avatar.includes("!holdsPhone&&knuckleIndex<3"));
assert(avatar.includes("avoiding an eight-finger overlap"));
assert(avatar.includes("phoneThumb.rotation.y=-gripSign*.08"));
assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V183 — HEALTH NETWORK + AVATAR GRIP CONTRACT OK");
