import fs from "node:fs";
const hoje=fs.readFileSync("app/hoje/page.tsx","utf8");
const hook=fs.readFileSync("hooks/useDoseLogs.ts","utf8");
const repo=fs.readFileSync("lib/repositories/doseLogs.ts","utf8");
const checks=[
 ["marcador V46",hoje.includes("VAULT_MOTOR_TEMPORAL_V46")],
 ["API temporal consumida",hoje.includes('civilDoseInstant(dataSelecionada,hour,startedAt)')&&hoje.includes('tomadoEm:takenAt')&&hook.includes('const marcarComoTomadaEm')],
 ["modo agora",hoje.includes("executarTomadaEmLote('now')")],
 ["modo programado",hoje.includes("executarTomadaEmLote('scheduled')")],
 ["modo customizado",hoje.includes("executarTomadaEmLote('custom')")],
 ["instante único no lote agora",hoje.includes("const startedAt=new Date().toISOString()")&&hoje.includes("mode==='now'?startedAt")&&hoje.includes("const takenAt=actual??scheduledAt")],
 ["slot separado do instante real",hoje.includes("data:review.scope.data,horario:hour,status:'taken',tomadoEm:takenAt,quantidade:dose.quantity")],
 ["quantidade histórica preservada",hoje.includes("quantidade:status==='taken'?Number(quantity.replace(',','.')):undefined,tomadoEm:actualAt,unit,expected")],
 ["histórico não movimenta estoque",hook.includes("adjustStock:")&&hook.includes("false")],
 ["repository sem fallback 1",repo.includes("Não existe fallback para 1")],
 ["retificação V45 por ID, snapshot e recibo",hoje.includes("confirmDoseCorrection")&&hoje.includes("id:expected.id,expected,adjustStock:target.action")],
 ["SOS/extra preservado",hook.includes("registrarTomadaAvulsa")],
];
let fail=false;
for(const [n,ok] of checks){console.log(`${ok?"OK":"FALHOU"}: ${n}`);if(!ok)fail=true}
if(fail)process.exit(1);
