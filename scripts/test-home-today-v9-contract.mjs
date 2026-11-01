import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const read = (path) => fs.readFileSync(path, "utf8");
const home = read("app/page.tsx");
const hub = read("components/home/HomeCommandCenter.tsx");
const supplyTiles = read("components/home/HomeSupplyAccessTiles.tsx");
const today = read("app/hoje/page.tsx");
const timeline = read("lib/today/timeline-summary.ts");
const checks = [];
const ok = (label, condition) => { if (!condition) throw new Error(`FALHOU: ${label}`); checks.push(label); };

ok("Home preserva começo e Tratamentos", home.includes("Tratamentos") && home.includes("HomeCommandCenter"));
ok("parte inferior possui central única", hub.includes("Saúde e rotina") && hub.includes("Organização"));
ok("retiradas ficam no contexto de medicamentos", hub.indexOf("/saude/retiradas") > hub.indexOf("/saude/medicamentos"));
ok("retiradas explicam programação e histórico", hub.includes("<HomeSupplyAccessTiles") &&
  hub.includes('withdrawalPath="/saude/retiradas"') &&
  supplyTiles.includes("onNavigate(withdrawalPath)") &&
  supplyTiles.includes("Programações, locais e histórico de retirada"));
ok("atalhos clínicos possuem cores semânticas", ["text-ice", "text-emerald-400", "text-cyan-400", "text-amber-400", "text-coral"].every((tone) => hub.includes(tone)));
ok("cirurgias continuam acessíveis", hub.includes("/saude/cirurgias"));
ok("arquivos, compras e rede foram preservados", ["/documentos", "/saude/renovacao", "/saude/rede"].every((path) => hub.includes(path)));
ok("Hoje resume concluídos por padrão", today.includes("mostrarConcluidas") && today.includes("concluidasOcultas"));
ok("pendentes continuam visíveis por padrão",
  today.includes("visibleTimelineItems(dosesFiltradas, { isToday: isHoje, status: filtroStatus, showResolved: mostrarConcluidas })") &&
  timeline.includes('if (!options.isToday || options.status !== "todos" || options.showResolved) return items;') &&
  timeline.includes('return items.filter(item => !item.tomada && !item.ignorada && !item.isDataConflict);'));

// Exercise the actual extracted function, not a copy of its implementation.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const { Module } = require("node:module");
const timelineModule = new Module("lib/today/timeline-summary.ts");
timelineModule.require = name => name === "@/lib/health-intelligence/clinical-time"
  ? { classifyClinicalSchedule: () => "now" } : require(name);
timelineModule._compile(ts.transpileModule(timeline, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
}}).outputText, "lib/today/timeline-summary.ts");
const { visibleTimelineItems } = timelineModule.exports;
const slots = [
  { id: "pending", tomada: false, ignorada: false, isDataConflict: false, horario: "10:00" },
  { id: "taken", tomada: true, ignorada: false, isDataConflict: false, horario: "10:00" },
  { id: "ignored", tomada: false, ignorada: true, isDataConflict: false, horario: "10:00" },
  { id: "conflict", tomada: false, ignorada: false, isDataConflict: true, horario: "10:00" },
];
const selected = opts => visibleTimelineItems(slots, opts).map(slot => slot.id);
ok("pendente continua visível no Hoje por padrão",
  JSON.stringify(selected({isToday:true,status:"todos",showResolved:false})) === JSON.stringify(["pending"]));
ok("filtro explícito não é substituído pelo modo padrão",
  selected({isToday:true,status:"tomados",showResolved:false}).length === 4);
ok("mostrar concluídos e histórico mantêm todos os registros",
  selected({isToday:true,status:"todos",showResolved:true}).length === 4 &&
  selected({isToday:false,status:"todos",showResolved:false}).length === 4);
ok("filtro explícito continua soberano", today.includes('filtroStatus !== "todos"'));
ok("lembretes continuam fora da adesão", today.includes("não mede adesão"));
ok("versículo permanece na Hoje", today.includes("<VersiculoDia"));

for (const label of checks) console.log(`OK: ${label}`);
console.log(`CONTRATOS HOME/HOJE V9: OK (${checks.length})`);
