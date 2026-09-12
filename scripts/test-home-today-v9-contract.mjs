import fs from "node:fs";
const read = (path) => fs.readFileSync(path, "utf8");
const home = read("app/page.tsx");
const hub = read("components/home/HomeCommandCenter.tsx");
const today = read("app/hoje/page.tsx");
const checks = [];
const ok = (label, condition) => { if (!condition) throw new Error(`FALHOU: ${label}`); checks.push(label); };

ok("Home preserva começo e Tratamentos", home.includes("Tratamentos") && home.includes("HomeCommandCenter"));
ok("parte inferior possui central única", hub.includes("Saúde e rotina") && hub.includes("Organização"));
ok("retiradas ficam no contexto de medicamentos", hub.indexOf("/saude/retiradas") > hub.indexOf("/saude/medicamentos"));
ok("retiradas explicam programação e histórico", hub.includes("Programações, locais e histórico de retirada"));
ok("atalhos clínicos possuem cores semânticas", ["text-ice", "text-emerald-400", "text-cyan-400", "text-amber-400", "text-coral"].every((tone) => hub.includes(tone)));
ok("cirurgias continuam acessíveis", hub.includes("/saude/cirurgias"));
ok("arquivos, compras e rede foram preservados", ["/documentos", "/saude/renovacao", "/saude/rede"].every((path) => hub.includes(path)));
ok("Hoje resume concluídos por padrão", today.includes("mostrarConcluidas") && today.includes("concluidasOcultas"));
ok("pendentes continuam visíveis por padrão", today.includes("!dose.tomada && !dose.ignorada"));
ok("filtro explícito continua soberano", today.includes('filtroStatus !== "todos"'));
ok("lembretes continuam fora da adesão", today.includes("não mede adesão"));
ok("versículo permanece na Hoje", today.includes("<VersiculoDia"));

for (const label of checks) console.log(`OK: ${label}`);
console.log(`CONTRATOS HOME/HOJE V9: OK (${checks.length})`);
