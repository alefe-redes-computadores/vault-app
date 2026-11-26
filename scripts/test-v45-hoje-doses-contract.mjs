import fs from "node:fs";
const hoje=fs.readFileSync("app/hoje/page.tsx","utf8");
const hook=fs.readFileSync("hooks/useDoseLogs.ts","utf8");
const groups=fs.readFileSync("components/hoje/TodayTimelineGroupPresentation.ts","utf8");
const checks=[
 ["marcador V45",hoje.includes("VAULT_HOJE_DOSES_V45")],
 ["quantidade real individual",hoje.includes('openIndividualReview(item)')&&fs.readFileSync('components/saude/QuickDoseModal.tsx','utf8').includes('doseLogsRepository.setStatus(')&&hoje.includes('quantidade:dose.quantity,unit:dose.unit,expected:review.expected')],
 ["lote deduplicado",hoje.includes("new Map<string, DoseItemExt>()")],
 ["grupos operacionais",hoje.includes("const metadata = todayTimelineGroupPresentation") && hoje.includes("groupTimelineItems(dosesParaExibir") && [["agora","Agora"],["atrasadas","Atrasadas"],["depois","Depois"],["avulsas","SOS e extras"],["concluidas","Tomadas"],["ignoradas","Ignoradas"]].every(([key,label])=>groups.includes(`${key}: { label: "${label}"`))],
 ["lote serial",hoje.includes("for(const entry of entries)")&&hoje.includes("const entries=[...frozenEntries]")],
 ["correção individual por snapshot e ID",hoje.includes("confirmDoseCorrection")&&hoje.includes("id:expected.id,expected,adjustStock:target.action")],
 ["extra/SOS",hook.includes("registrarTomadaAvulsa")&&hook.includes('"sos" | "extra"')],
 ["histórico",hook.includes("marcarComoTomadaHistoricaEm")&&hook.includes("desmarcarDoseHistorica")],
]; let fail=false; for(const [n,ok] of checks){console.log(`${ok?"OK":"FALHOU"}: ${n}`);if(!ok)fail=true} if(fail)process.exit(1);
