import fs from "node:fs";
const hoje=fs.readFileSync("app/hoje/page.tsx","utf8");
const hook=fs.readFileSync("hooks/useDoseLogs.ts","utf8");
const checks=[
 ["marcador V45",hoje.includes("VAULT_HOJE_DOSES_V45")],
 ["quantidade real individual",/marcarDose\(\s*item\.medicamentoId,\s*item\.horario,\s*item\.unidadePorDose\s*\)/s.test(hoje)],
 ["lote deduplicado",hoje.includes("new Map<string, DoseItemExt>()")],
 ["grupos operacionais",["Atrasadas","Agora","Depois","SOS e extras","Concluído"].every(x=>hoje.includes(`label: \"${x}\"`))],
 ["lote serial",hoje.includes("for (const dose of dosesElegiveisLote)")],
 ["desfazer",hoje.includes("handleDesfazerLote")],
 ["extra/SOS",hook.includes("registrarTomadaAvulsa")&&hook.includes('"sos" | "extra"')],
 ["histórico",hook.includes("marcarComoTomadaHistoricaEm")&&hook.includes("desmarcarDoseHistorica")],
]; let fail=false; for(const [n,ok] of checks){console.log(`${ok?"OK":"FALHOU"}: ${n}`);if(!ok)fail=true} if(fail)process.exit(1);
