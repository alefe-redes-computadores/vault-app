const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
const read=file=>fs.readFileSync(file,"utf8");
const ok=(value,label)=>{if(!value)throw Error(`V277: ${label}`);console.log("OK:",label)};
const source=read("lib/dose-slot-authority.ts");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandboxModule={exports:{}};vm.runInNewContext(`(function(exports,module,require){${js}\n})(module.exports,module,require)`,{module:sandboxModule,require});
const {buildDoseSlotIndex,resolveDoseSlot,doseSlotIsResolved}=sandboxModule.exports;
const row=(over={})=>({id:"a",user_id:"u1",person_id:"p1",medicamento_id:"m1",data:"2026-10-27",horario:"09:00",dose_kind:"scheduled",...over});
let index=buildDoseSlotIndex([row(),row({id:"foreign",user_id:"u2",tomado_em:"2026-10-27T09:01:00"})],{userId:"u1",personId:"p1"});
ok(resolveDoseSlot(index,"m1","2026-10-27","09:00").state==="pending","índice isola conta e pessoa");
index=buildDoseSlotIndex([row(),row({id:"b",tomado_em:"2026-10-27T09:01:00"})],{userId:"u1",personId:"p1"});
ok(resolveDoseSlot(index,"m1","2026-10-27","09:00").state==="taken","confirmação posterior vence duplicata pendente");
index=buildDoseSlotIndex([row({tomado_em:"2026-10-27T09:01:00"}),row({id:"b",ignorado_em:"2026-10-27T09:02:00"})]);
const conflict=resolveDoseSlot(index,"m1","2026-10-27","09:00");
ok(conflict.state==="conflict"&&doseSlotIsResolved(conflict),"contradição fica visível e não gera nova cobrança");
index=buildDoseSlotIndex([row({dose_kind:"sos",tomado_em:"2026-10-27T09:01:00"})]);
ok(resolveDoseSlot(index,"m1","2026-10-27","09:00").state==="absent","SOS não resolve slot programado");
const home=read("app/page.tsx"),homePending=read("lib/home/pending-dose-projection.ts"),backlog=read("lib/pending-dose-backlog.ts"),today=read("app/hoje/page.tsx"),todayProjection=read("lib/today/build-timeline-items.ts"),todaySummary=read("lib/today/timeline-summary.ts"),reconciler=read("components/DoseNotificationReconciler.tsx");
const scheduled=read("lib/dose-notifications.ts"),overdue=read("lib/overdue-dose-notifications.ts");
ok(home.includes("buildHomePendingDoseProjection")&&homePending.includes("buildPendingDoseBacklog")&&backlog.includes("buildDoseSlotIndex")&&backlog.includes("doseSlotIsResolved(resolveDoseSlot"),"Home usa autoridade canônica em vez da primeira duplicata");
// M25-R3: verify actual M25 filters and metric-exclusion authority, not the
// obsolete literal negation used before the single-pass refactoring.
ok(todayProjection.includes('slot.state === "conflict"')&&
  today.includes("Registros contraditórios não entram nas métricas")&&
  todaySummary.includes('if (item.isExpectedUnconfirmed || item.isDataConflict || item.isAvulsa || item.isSintoma) continue;')&&
  todaySummary.includes('if (item.tomada || item.ignorada || item.isDataConflict)')&&
  todaySummary.includes('if (status === "pendentes" && (item.tomada || item.ignorada || item.isDataConflict'),
  "Hoje isola conflito das ações e métricas");
// Execute the genuine projection with a stub only for the calendar classifier:
// the test itself still asserts the clinical states and their denominators.
const TimelineModule=require("node:module").Module;
const timelineModule=new TimelineModule("lib/today/timeline-summary.ts",module);
timelineModule.require=id=>{
  if(id==="@/lib/health-intelligence/clinical-time")return {classifyClinicalSchedule:()=>"now"};
  throw Error("V277 unexpected timeline import "+id);
};
timelineModule._compile(ts.transpileModule(todaySummary,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"lib/today/timeline-summary.ts");
const {summarizeTimeline,filterTimelineItems,visibleTimelineItems,groupTimelineItems}=timelineModule.exports;
const clinicalRows=[
  {id:"pending",horario:"07:00",tomada:false,ignorada:false},
  {id:"taken",horario:"08:00",tomada:true,ignorada:false},
  {id:"ignored",horario:"09:00",tomada:false,ignorada:true},
  {id:"conflict-taken",horario:"10:00",tomada:true,ignorada:false,isDataConflict:true},
  {id:"conflict-pending",horario:"11:00",tomada:false,ignorada:false,isDataConflict:true},
  {id:"unconfirmed-history",horario:"12:00",tomada:false,ignorada:false,isExpectedUnconfirmed:true},
  {id:"sos",horario:"13:00",tomada:false,ignorada:false,isAvulsa:true,doseKind:"sos"},
  {id:"symptom",horario:"14:00",tomada:true,ignorada:false,isSintoma:true},
];
const before=JSON.stringify(clinicalRows);
const totals=summarizeTimeline(clinicalRows);
ok(totals.totalTomadas===1&&totals.totalIgnoradas===1&&totals.totalPendentes===1&&totals.totalEsperadasSemConfirmacao===1,
  "conflitos nao entram em tomada, ignorada, pendente nem historico sem confirmacao");
for(const status of ["tomados","ignorados","pendentes"]){
  const rows=filterTimelineItems(clinicalRows,status,"todos",true);
  ok(rows.every(row=>!row.isDataConflict),"filtro "+status+" nunca resolve conflito");
}
const regular=visibleTimelineItems(clinicalRows,{isToday:true,status:"todos",showResolved:false});
ok(regular.every(row=>!row.isDataConflict&&!row.tomada&&!row.ignorada)&&regular.some(row=>row.id==="pending"),
  "vista padrao oculta conflitos e realizados sem perder dose pendente");
const historical=visibleTimelineItems(clinicalRows,{isToday:false,status:"todos",showResolved:false});
ok(historical===clinicalRows,"historico continua mostrando evidencias contraditorias");
const groups=groupTimelineItems(clinicalRows,{isToday:true,selectedDate:"2026-11-02",today:"2026-11-02",nowTime:"11:00"});
const review=groups.find(group=>group[0]==="revisao")?.[1] || [];
ok(review.length===2&&review.every(row=>row.isDataConflict),"contradicoes continuam no grupo explicito de revisao");
ok(JSON.stringify(clinicalRows)===before,"projecao de conflito nao modifica nenhum registro");
ok(reconciler.includes('where("[user_id+person_id]")')&&reconciler.includes('db.transaction("r"')&&reconciler.includes("snapshot.userId!==user.id"),"reconciliador usa snapshot atômico da conta e pessoa atuais");
ok(scheduled.includes("buildDoseSlotIndex(input.logs")&&scheduled.includes("scheduledDoseResolvedV51(resolvedIndex")&&overdue.includes("buildDoseSlotIndex(input.logs")&&overdue.includes("isResolved(resolvedIndex"),"lembrete e atraso compartilham a mesma resolução");
console.log("\nVAULT V277 — SLOT CANÔNICO + NOTIFICAÇÕES ISOLADAS: OK");
