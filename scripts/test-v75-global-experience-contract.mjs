import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V75: ${message}`);
  console.log(`OK: ${message}`);
};

const layout = read("app/layout.tsx");
const more = read("app/mais/page.tsx");
const intelligence = read("app/inteligencia/page.tsx");
const healthIntelligence = read("app/inteligencia/saude/page.tsx");
const medicationDetail = read("app/saude/medicamentos/detalhes/page.tsx");
const locations = read("app/saude/locais/page.tsx");
const bottomNav = read("components/BottomNav.tsx");

ok(!layout.includes("<SyncStatusIndicator") && !layout.includes("<PersonSelector"), "régua global redundante removida");
ok(more.includes("<PersonSelector") && (more.includes("Pessoa ativa") || more.includes("Perfis do Vault")), "troca de pessoa centralizada em Mais");
ok(more.includes("Sincronizar agora") && more.includes("handleSync"), "sincronização permanece acessível em Mais");
ok((more.includes("space-y-2") || more.includes("grid grid-cols-2 gap-2")) && more.includes("Biometria") && more.includes("Lembretes"), "controles de proteção permanecem legíveis e compactos");
ok(more.includes("border-violet-400") && more.includes("border-emerald-400") && more.includes("border-amber-400"), "atalhos usam identidade cromática variada");
ok(intelligence.includes(">Brain V4<") && healthIntelligence.includes("BRAIN V4"), "Brain V4 possui identidade consistente");
ok(locations.includes('density="compact"'), "cards de locais usam densidade compacta");
ok(bottomNav.includes("bg-emerald-400/70") && bottomNav.includes("backdrop-blur-xl"), "BottomNav polida sem excesso de azul");
ok(medicationDetail.includes("authenticateDeletion") && medicationDetail.includes("deletePhrase"), "exclusão de medicamento usa proteção nativa ou confirmação digitada");
ok(medicationDetail.includes('deletePhrase !== "EXCLUIR"'), "confirmação web exige palavra EXCLUIR");

console.log("V75 global experience contract: PASS");
