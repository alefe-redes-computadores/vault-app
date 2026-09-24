import fs from "node:fs";
const hoje=fs.readFileSync("app/hoje/page.tsx","utf8");
const hook=fs.readFileSync("hooks/useDoseLogs.ts","utf8");
const repo=fs.readFileSync("lib/repositories/doseLogs.ts","utf8");
const checks=[
 ["marcador V46",hoje.includes("VAULT_MOTOR_TEMPORAL_V46")],
 ["API temporal consumida",hoje.includes("marcarComoTomadaEm,")&&hook.includes("const marcarComoTomadaEm")],
 ["modo agora",hoje.includes('executarTomadaEmLote("now")')],
 ["modo programado",hoje.includes('executarTomadaEmLote("scheduled")')],
 ["modo customizado",hoje.includes('executarTomadaEmLote("custom")')],
 ["instante único no lote agora",hoje.includes("const batchNow =")&&hoje.includes("takenAt = batchNow!")],
 ["slot separado do instante real",/marcarComoTomadaEm\(\s*dose\.medicamentoId,\s*dose\.horario,\s*takenAt\.toISOString\(\),\s*dose\.unidadePorDose/s.test(hoje)],
 ["quantidade histórica preservada",hoje.includes("takenAt.toISOString(),\n            item.unidadePorDose")],
 ["histórico não movimenta estoque",hook.includes("adjustStock:")&&hook.includes("false")],
 ["repository sem fallback 1",repo.includes("Não existe fallback para 1")],
 ["desfazer V45 preservado",hoje.includes("handleDesfazerLote")],
 ["SOS/extra preservado",hook.includes("registrarTomadaAvulsa")],
];
let fail=false;
for(const [n,ok] of checks){console.log(`${ok?"OK":"FALHOU"}: ${n}`);if(!ok)fail=true}
if(fail)process.exit(1);
