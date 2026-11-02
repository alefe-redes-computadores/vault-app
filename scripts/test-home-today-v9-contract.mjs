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
// M6: verifica cada categoria em sua rota, não a antiga lista global azul/ciano.
const hasClinicalTone=(route,tone)=>hub.split("\n").some(line=>line.includes(`path: "${route}"`) && line.includes(`text-${tone}`));
ok("atalhos clínicos possuem cores semânticas",
  hasClinicalTone("/saude/minha-saude", "emerald-400") &&
  hasClinicalTone("/saude/consultas", "violet-300") &&
  hasClinicalTone("/saude/exames", "emerald-400") &&
  hasClinicalTone("/saude/lembretes", "amber-400") &&
  hasClinicalTone("/saude/registros", "coral") &&
  hub.includes('networkTone="text-emerald-300/80"') &&
  !hub.includes('networkTone="text-cyan-400/70"'));
ok("cirurgias continuam acessíveis", hub.includes("/saude/cirurgias"));
ok("arquivos, compras e rede foram preservados", ["/documentos", "/saude/renovacao", "/saude/rede"].every((path) => hub.includes(path)));
ok("Hoje resume concluídos por padrão", today.includes("mostrarConcluidas") && today.includes("concluidasOcultas"));
// M25-R2: assert the *current* read-only implementation and run the actual function below.
// Old .filter() wording was an implementation detail; M25 keeps the input
// reference when no resolved rows need hiding, without changing visibility.
ok("pendentes continuam visíveis por padrão",
  today.includes("visibleTimelineItems(dosesFiltradas, { isToday: isHoje, status: filtroStatus, showResolved: mostrarConcluidas })") &&
  timeline.includes('if (!options.isToday || options.status !== "todos" || options.showResolved) return items;') &&
  timeline.includes('if (item.tomada || item.ignorada || item.isDataConflict)') &&
  timeline.includes('if (filtered === null) filtered = items.slice(0, i)') &&
  timeline.includes('return filtered ?? items;'));

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
const onlyPending = [slots[0], {...slots[0], id:"second pending"}];
const pendingVisible = visibleTimelineItems(onlyPending,{isToday:true,status:"todos",showResolved:false});
ok("sem registros resolvidos, o mesmo array é reutilizado sem alterar os pendentes",
  pendingVisible === onlyPending && pendingVisible.length === 2 && pendingVisible[1].id === "second pending");
const mixedVisible = visibleTimelineItems(slots,{isToday:true,status:"todos",showResolved:false});
ok("com registros resolvidos, a lista filtrada é distinta sem mexer na fonte",
  mixedVisible !== slots && mixedVisible.length === 1 && mixedVisible[0] === slots[0] && slots.length === 4);
ok("filtro explícito não é substituído pelo modo padrão",
  selected({isToday:true,status:"tomados",showResolved:false}).length === 4);
ok("mostrar concluídos e histórico mantêm todos os registros",
  selected({isToday:true,status:"todos",showResolved:true}).length === 4 &&
  selected({isToday:false,status:"todos",showResolved:false}).length === 4);
ok("filtro explícito continua soberano", today.includes('filtroStatus !== "todos"'));
const remindersPanel = read("components/hoje/TodayRemindersPanel.tsx");
ok("lembretes continuam fora da adesão",
  today.includes('<TodayRemindersPanel reminders={remindersDoDia}') &&
  remindersPanel.includes('não mede adesão') &&
  remindersPanel.includes('Lembretes não confirmam dose tomada') &&
  !remindersPanel.includes('marcarDose('));
ok("versículo permanece na Hoje", today.includes("<VersiculoDia"));

for (const label of checks) console.log(`OK: ${label}`);
console.log(`CONTRATOS HOME/HOJE V9: OK (${checks.length})`);
