"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),ts=require("typescript");
const root=path.resolve(__dirname,"..");
let checked=0;
function ok(value,msg){assert.ok(value,"D4 P2: "+msg); console.log("OK D4 P2",++checked,msg);}
function read(p){return fs.readFileSync(path.join(root,p),"utf8");}
const clinicalPath="lib/clinical/episode-m1.ts",code=read(clinicalPath);
const m=new Module(path.join(root,clinicalPath),module);
m._compile(ts.transpileModule(code,{fileName:clinicalPath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path.join(root,clinicalPath));
const e=m.exports;
const mk=(id="decision-a",override={})=>({
 id,course_key:"med-1|Tratamento temporário · 2026-11-17 · 7 dia(s)",
 tipo:"conclusao_relatada",data_evento:"2026-11-18",fonte:"relato_usuario",
 registrado_em:"2026-11-18T15:00:00.000Z",nota:"Concluí conforme meu relato",...override,
});
let state=e.appendCourseDecisionD4(null,mk(),"med-1","2026-11-18");
ok(state.versao===1&&state.decisoes_d4.length===1&&state.regimes.length===0&&state.revisoes.length===0,"primeira decisão no contexto canônico M1");
ok(e.appendCourseDecisionD4(state,mk(),"med-1","2026-11-18").decisoes_d4.length===1,"mesma intenção idempotente sem dupla inserção");
assert.throws(()=>e.appendCourseDecisionD4(state,mk("decision-a",{nota:"Alteração silenciosa"}),"med-1","2026-11-18"),/ID/);ok(true,"ID reutilizado com conteúdo diferente bloqueado");
assert.throws(()=>e.appendCourseDecisionD4(state,mk("decision-b"),"med-1","2026-11-18"),/retificação/);ok(true,"não cria segunda decisão sem vínculo de retificação");
const second=mk("decision-b",{tipo:"interrupcao_relatada",substitui_id:"decision-a",nota:"Revisão explícita"});
state=e.appendCourseDecisionD4(state,second,"med-1","2026-11-18");
ok(state.decisoes_d4.length===2&&state.decisoes_d4[0].tipo==="conclusao_relatada"&&state.decisoes_d4[1].tipo==="interrupcao_relatada","retificação preserva o histórico sem sobrescrever");
assert.throws(()=>e.appendCourseDecisionD4(state,mk("decision-c",{substitui_id:"decision-a"}),"med-1","2026-11-18"),/retificação/);ok(true,"retificação obsoleta bloqueada");
assert.throws(()=>e.appendCourseDecisionD4(null,mk("decision-c",{substitui_id:"decision-a"}),"med-1","2026-11-18"),/anterior/);ok(true,"não retifica declaração inexistente");
for(const [field,value,re] of [
 ["tipo","clinicamente_concluido",/declaração/],
 ["fonte","algoritmo",/declaração/],
 ["data_evento","2026-02-30",/declaração/],
 ["data_evento","2026-11-19",/declaração/],
 ["data_evento","2026-11-16",/declaração/],
 ["nota","x".repeat(501),/declaração/],
 ["registrado_em","nao_e_data",/declaração/],
 ["id","a",/declaração/],
 ["course_key","other|Tratamento temporário · 2026-11-17 · 7 dia(s)",/Chave/],
 ["course_key","med-1|Tratamento temporário · 2026-02-30 · 7 dia(s)",/Origem/],
 ["course_key","med-1|Dose avulsa",/Chave/],
 ]){assert.throws(()=>e.appendCourseDecisionD4(null,mk("decision-x",{[field]:value}),"med-1","2026-11-18"),re);ok(true,"entrada inválida bloqueada: "+field);}
assert.throws(()=>e.normalizeMedicationClinicalContextM1({versao:1,regimes:[],revisoes:[],decisoes_d4:[null]}),/Contexto/);
ok(true,"evento remoto nulo bloqueado antes de atualizar JSON");
assert.throws(()=>e.normalizeMedicationClinicalContextM1({versao:1,regimes:[],revisoes:[],decisoes_d4:[mk(),mk()]}),/Contexto/);
ok(true,"ID duplicado em contexto existente bloqueado");
assert.throws(()=>e.appendCourseDecisionD4(null,mk("decision-time",{course_key:"med-1|Tratamento temporário · 2026-11-17 · 7 dia(s) · intervalo 8h · primeira 2026-11-17T99:99"}),"med-1","2026-11-18"),/Origem/);
ok(true,"primeira dose com horário impossível não é aceita");
const original=e.appendRouteEpisodeM1(null,{id:"route-1",via:"oral",local:"",lado:"nao_informado",inicio:"2026-11-17",fonte:"relato_usuario",registrado_em:"2026-11-18T12:00:00Z"});
const integrated=e.appendCourseDecisionD4(original,mk("decision-integrated"),"med-1","2026-11-18");
const reviewed=e.recordCourseReviewM1(integrated,{id:"review-1",course_key:"med-1|Tratamento temporário · 2026-11-10 · 2 dia(s)",periodo_fim:"2026-11-11",avaliado_em:"2026-11-18",percepcao:"nao_informado",registrado_em:"2026-11-18T14:00:00Z"},"2026-11-18");
ok(reviewed.decisoes_d4.length===1&&reviewed.regimes.length===1&&reviewed.revisoes.length===1,"revisão M1 posterior mantém decisões D4");
ok(original.decisoes_d4===undefined&&original.regimes.length===1,"sem mutação de contexto clínico anterior");
ok(e.normalizeMedicationClinicalContextM1(reviewed).decisoes_d4.length===1,"normalização usada no repositório preserva decisões");
assert.throws(()=>e.normalizeMedicationClinicalContextM1({versao:1,regimes:[],revisoes:[],decisoes_d4:{}}),/Contexto/);ok(true,"esquema remoto malformado não sobrescrito");
const all=Array.from({length:120},(_,i)=>mk("decision-"+String(i).padStart(8,"0"),{course_key:"med-1|Tratamento temporário · 2026-11-17 · 7 dia(s)"}));
assert.throws(()=>e.appendCourseDecisionD4({versao:1,regimes:[],revisoes:[],decisoes_d4:all},mk("new-one-a"),"med-1","2026-11-18"),/Limite/);ok(true,"limite de histórico protege dados antigos");
const viewPath="lib/clinical/course-decision-view-d4.ts", viewSource=read(viewPath);
const vm=new Module(path.join(root,viewPath),module);vm._compile(ts.transpileModule(viewSource,{fileName:viewPath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path.join(root,viewPath));
const v=vm.exports;
ok(v.latestCourseDecisionD4(state,mk().course_key).id==="decision-b","leitura de estado usa último evento confirmado");
ok(v.courseDecisionSummaryD4(v.latestCourseDecisionD4(state,mk().course_key)).includes("Interrupção informada"),"rotulagem não declara alta médica");
ok(v.latestCourseDecisionD4(state,"other-key")===null,"não mistura cursos diferentes");
const card=read("components/saude/TemporaryCourseMedicationCard.tsx"),ui=read("components/saude/CourseDecisionControlD4.tsx");
for(const p of [clinicalPath,viewPath,"components/saude/CourseDecisionControlD4.tsx","components/saude/TemporaryCourseMedicationCard.tsx"]){
 const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,"parser íntegro: "+p);
}
ok(card.includes("<TemporaryCourseJourneyD4")&&card.includes("<CourseDecisionControlD4")&&card.includes("<CourseReviewM1"),"P1, P2 e M1 coexistem sem duplicar a autoridade de doses");
ok(ui.includes("med.user_id !== user.id")&&ui.includes("fresh.person_id !== personId")&&ui.includes("fresh.user_id !== user.id"),"conta e pessoa conferidas antes do salvamento");
ok(ui.includes("medicamentosRepository.update(")&&ui.includes("contexto_clinico_m1: next"),"única gravação via repositório clínico existente");
ok(ui.includes("!acknowledged")&&ui.includes("pendingIntent.current")&&ui.includes("locked.current"),"consentimento explícito e bloqueio de reenvio rápido");
ok(ui.includes("retificar")||ui.includes("Retificar"),"retificação oferecida sem excluir decisão anterior");
ok(ui.includes("Histórico das")&&ui.includes("history.map("),"histórico de retificações acessível no detalhe");
ok(ui.includes("pendingIntent.current = item")&&ui.includes("pendingIntent.current = null"),"intenção estável durante retry, reiniciada após sucesso ou edição");
ok(ui.includes("não apaga doses")&&ui.includes("não serão alterados automaticamente"),"limitações sobre agenda e dose visíveis");
ok(!/\b(?:db\.doseLogs\.(?:put|add|delete)|supabase\.|deleteDoseLogs|setStatus\()/.test(ui),"não muda DoseLogs, Supabase nem status por aproximação");
const repo=read("lib/repositories/medicamentos.ts"),sync=read("hooks/useSyncQueue.ts");
ok(repo.includes("normalizeMedicationClinicalContextM1(data.contexto_clinico_m1)"),"repositório já valida o JSON M1 existente");
ok(sync.includes("contexto_clinico_m1: med.contexto_clinico_m1 ?? null"),"payload de sync já inclui o contexto M1");
const gate=read("scripts/test-v63-release-gate.mjs");
ok((gate.match(/"scripts\/test-vault-ci360-d4-p2-decisoes.cjs"/g)||[]).length===1,"novo teste incluído uma vez no V63");
ok(gate.includes('"scripts/test-vault-ci360-d4-p1-jornada.cjs"'),"P1 preservada na matriz V63");
ok(read("scripts/test-vault-m59-medication-journey.cjs").includes("'@/components/saude/CourseDecisionControlD4':{CourseDecisionControlD4:()=>null}"),"M59 aceita painel D4 P2 sem cortar testes antigos");
console.log(`D4 P2: ${checked} garantias isoladas de decisão auditável e sem automação de prescrições.`);
