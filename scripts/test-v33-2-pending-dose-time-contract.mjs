import fs from "node:fs";
const s = fs.readFileSync("components/PendingDosesModal.tsx", "utf8");
function ok(v,m){ if(!v) throw new Error(m); }
ok(s.includes("bulkResolutionOpen"), "estado bulk ausente");
ok(s.includes("Tomei nos horários programados"), "scheduled coletivo ausente");
ok(s.includes("Tomei todas agora"), "now coletivo ausente");
ok(s.includes("Revisar individualmente"), "fallback individual ausente");
ok(s.includes("await onResolveDose(dose, resolution)"), "processamento serial perdido");
ok(!/handleResolveAll\s*\(\s*\)/.test(s), "execução coletiva ainda presume horário");
console.log("V33.2 CONTRACT: OK");
