import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const r=(p)=>fs.readFileSync(p,"utf8");
const ok=(v,m)=>{if(!v)throw new Error(`V94: ${m}`);console.log(`OK: ${m}`)};
const repo=r("lib/repositories/medicamentos.ts"),hook=r("hooks/useMedicamentos.ts"),list=r("app/saude/medicamentos/page.tsx"),ins=r("lib/health-insights.ts"),edit=r("app/saude/medicamentos/editar/page.tsx"),hoje=r("app/hoje/page.tsx");
ok(repo.includes("VAULT_SOS_AFTER_DISCONTINUATION_V94"),"repository separa histórico e operação");
ok(repo.includes("getAllIncludingDiscontinued"),"coleção completa disponível para gestão");
ok(hook.includes("medicamentosIncluindoDescontinuados"),"hook expõe coleção completa");
ok(list.includes("medicamentosIncluindoDescontinuados:"),"listagem enxerga encerrados");
ok(ins.includes("&&\n          !isSOS;"),"descontinuado+SOS não cai como suspenso operacional");
ok(edit.includes("Disponível como SOS sem reabrir o tratamento"),"UX explica transição sem reativação");
// V94 R2: a geração da timeline foi extraída da página Hoje; a autoridade é o módulo puro.
const timeline=r("lib/today/build-timeline-items.ts");
ok(hoje.includes('buildTodayTimelineItems({') &&
   timeline.includes('med.status === "descontinuado"') &&
   timeline.includes('med.tipo_uso === "sos"'),
   "Hoje não cria slot programado para SOS/encerrado");
ok(timeline.includes('log.dose_kind === "sos"') &&
   timeline.includes('isAvulsa: true'),
   "Hoje preserva DoseLog SOS na timeline");
// Exercício funcional do módulo real com dependências clínicas isoladas e sem banco.
// Comprova que SOS/encerrados não ganham horários e que SOS registrado permanece visível.
const compiled=ts.transpileModule(timeline, {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true,
});
ok((compiled.diagnostics||[]).every(d=>d.category!==ts.DiagnosticCategory.Error),
  "Motor Hoje mantém sintaxe TypeScript válida");
const sandbox={exports:{}};
const acquisitionSandbox={exports:{}};
new Function("exports","require",ts.transpileModule(
  r("lib/today/acquisition-date-index.ts"),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}
).outputText)(acquisitionSandbox.exports,id=>{throw new Error("V94 unexpected acquisition helper dependency: "+id)});
const deps={
  "@/lib/today/acquisition-date-index":acquisitionSandbox.exports,
  "@/lib/dose-slot-authority":{
    buildDoseSlotIndex:()=>new Map(),
    resolveDoseSlot:()=>({state:"absent"}),
  },
  "@/lib/health-utils":{
    computeEstoqueInfo:()=>({quantidadeRestante:10}),
    getDaysUntil:()=>null,
  },
  "@/lib/health-insights":{
    sugerirRenovacao:()=>({deveRenovar:false,mensagem:"",urgencia:"nenhuma"}),
    isReceitaAtualVencida:()=>false,
    analisarComportamentoUso:()=>null,
  },
};
new Function("exports","require",compiled.outputText)(sandbox.exports,id=>{
  if(!Object.hasOwn(deps,id)) throw new Error("Dependência inesperada no motor de Hoje: "+id);
  return deps[id];
});
const active=(id,tipo_uso,status="ativo")=>({
  id,nome:id,dosagem:"1 un",status,tipo_uso,
  estoque_horarios:["08:00"],created_at:"2026-01-01",
  data_receita:"2026-01-01",proxima_renovacao:"2026-12-31",estoque_quantidade:10,
});
const medicationRows=[
  active("continuo","continuo"),
  active("sos-ativo","sos"),
  active("sos-encerrado","sos","descontinuado"),
  active("continuo-encerrado","continuo","descontinuado"),
  active("esporadico","esporadico"),
];
const doseLogs=[
  {id:"log-sos-ativo",medicamento_id:"sos-ativo",horario:"14:00",dose_kind:"sos",tomado_em:"2026-10-31T14:00:00"},
  {id:"log-sos-encerrado",medicamento_id:"sos-encerrado",horario:"15:00",dose_kind:"sos",tomado_em:"2026-10-31T15:00:00"},
  {id:"log-sos-pendente",medicamento_id:"sos-ativo",horario:"16:00",dose_kind:"sos"},
];
const items=sandbox.exports.buildTodayTimelineItems({
  medicamentos:medicationRows,doseLogs,medicos:[],tratamentos:[],farmacias:[],
  hospitais:[],historicoDoses:[],registros:[],renovacoes:[],
  dataSelecionada:"2026-10-31",isHoje:true,userId:"u",personId:"p",
});
const programmed=items.filter(item=>!item.isAvulsa&&!item.isSintoma);
const sosRecorded=items.filter(item=>item.isAvulsa&&item.doseKind==="sos");
ok(programmed.length===1&&programmed[0].medicamentoId==="continuo",
   "Somente tratamento contínuo ativo produz slot programado");
ok(sosRecorded.length===2&&sosRecorded.every(item=>item.tomada)
   &&new Set(sosRecorded.map(item=>item.medicamentoId)).has("sos-encerrado"),
   "SOS tomado permanece no histórico inclusive após encerramento");
ok(items.every(item=>item.logId!=="log-sos-pendente"),
   "SOS não confirmado não vira tomada nem slot programado");
console.log("\nVAULT V94 SOS APÓS ENCERRAMENTO — CONTRATO + RUNTIME OK");
