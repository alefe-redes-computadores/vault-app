import fs from "node:fs";
const hoje=fs.readFileSync("app/hoje/page.tsx","utf8");
const hook=fs.readFileSync("hooks/useDoseLogs.ts","utf8");
const groups=fs.readFileSync("components/hoje/TodayTimelineGroupPresentation.ts","utf8");
const checks=[
 ["marcador V45",hoje.includes("VAULT_HOJE_DOSES_V45")],
 ["quantidade real individual",/marcarDose\(\s*item\.medicamentoId,\s*item\.horario,\s*item\.unidadePorDose\s*\)/s.test(hoje)],
 ["lote deduplicado",hoje.includes("new Map<string, DoseItemExt>()")],
 ["grupos operacionais",hoje.includes("const metadata = todayTimelineGroupPresentation") && hoje.includes("groupTimelineItems(dosesParaExibir") && [["agora","Agora"],["atrasadas","Atrasadas"],["depois","Depois"],["avulsas","SOS e extras"],["concluidas","Tomadas"],["ignoradas","Ignoradas"]].every(([key,label])=>groups.includes(`${key}: { label: "${label}"`))],
 ["lote serial",hoje.includes("for (const dose of dosesElegiveisLote)")||hoje.includes("for (const dose of snapshotLote)")],
 ["desfazer",hoje.includes("handleDesfazerLote")],
 ["extra/SOS",hook.includes("registrarTomadaAvulsa")&&hook.includes('"sos" | "extra"')],
 ["histórico",hook.includes("marcarComoTomadaHistoricaEm")&&hook.includes("desmarcarDoseHistorica")],
]; let fail=false; for(const [n,ok] of checks){console.log(`${ok?"OK":"FALHOU"}: ${n}`);if(!ok)fail=true} if(fail)process.exit(1);
