const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function load(path, imports = {}) {
  const mod = new Module(path, module);
  const fallback = mod.require.bind(mod);
  mod.require = id => imports[id] ?? fallback(id);
  mod._compile(ts.transpileModule(fs.readFileSync(path,"utf8"), {
    compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
  }).outputText, path);
  return mod.exports;
}

const { projectExperienceContext } = load("lib/health-intelligence/experience-context.ts", {
  "@/lib/careflow-m2/domain": load("lib/careflow-m2/domain.ts"),
});
const today = "2026-11-28";
const own = {user_id:"u",person_id:"p"};
const foreign = {user_id:"u",person_id:"other"};
const context = {
  userId:"u",personId:"p",hoje:today,
  medicamentos:[{...own,status:"ativo",tipo_uso:"continuo",estoque_horarios:["09:00"]}],
  consultas:[{...own,id:"visit",data:today,status:"agendada",especialidade:"Visita"},
    {...foreign,id:"hidden",data:today,status:"agendada",especialidade:"Proibido"}],
  exames:[{...own,id:"exam",data:"2026-11-29",nome:"Exame"}],
  registrosSaude:[{...own,id:"symptom",data:"2026-11-27",nome:"Sintoma"}],
  tratamentos:[{...own,id:"care",status:"ativo",nome:"Ativo"},{...own,id:"closed",status:"concluido",nome:"Encerrado"}],
};
const events = [
  {...own,id:"monitor",kind:"monitor_plan",payload:{start:"2026-11-27",end:"2026-11-29"}},
  {...own,id:"ended",kind:"monitor_plan",payload:{start:"2026-11-20",end:"2026-11-21"}},
  {...foreign,id:"hidden-monitor",kind:"monitor_plan",payload:{start:"2026-11-27",end:"2026-11-29"}},
];
const rehab = [{...own,id:"rehab",status:"active",title:"Programa"},{...own,id:"removed",deleted_at:today}];
const command = {plan:{ownerKey:"u:p",items:[
  {id:"buy",phenomenon:"acquisition",evidenceKind:"recorded",title:"Compra",reason:"Aquisição vinculada",href:"/saude/renovacao",priorityScore:95},
  {id:"missing",phenomenon:"schedule",evidenceKind:"missing_data",title:"Horário",reason:"Dados ausentes",href:"/hoje",priorityScore:31},
  {id:"renewal",phenomenon:"prescription",evidenceKind:"projected",title:"Receita",reason:"Planejada",dueDate:"2026-12-02",href:"/saude/renovacao",priorityScore:62}
]}};
const current = projectExperienceContext(context,command,events,rehab,today);
assert.deepEqual(current.slice(0,2).map(x=>x.key),["buy","consultation:visit"]);
assert.equal(current.find(x=>x.key==="monitor:monitor").state,"atual");
assert.equal(current.find(x=>x.key==="monitor:ended").state,"histórico");
assert.equal(current.find(x=>x.key==="treatment:closed").state,"histórico");
assert.equal(current.find(x=>x.key==="missing").state,"dados insuficientes");
assert.equal(current.find(x=>x.key==="renewal").state,"previsto");
assert.equal(current.find(x=>x.key==="rehab:rehab").href,"/saude/reabilitacao/detalhes?id=rehab");
assert.equal(current.find(x=>x.key==="monitor:monitor").href,"/saude/careflow/pressao#careflow-plano-monitor");
assert.ok(current.some(x=>x.key==="routine")&&!current.some(x=>/hidden|removed/.test(x.key)));
assert.deepEqual(projectExperienceContext(context,command,events,rehab,"2026-11-27").map(x=>[x.key,x.state]),
  [["record:symptom","histórico"],["monitor:monitor","histórico"]]);
assert.deepEqual(projectExperienceContext(context,command,events,rehab,"2026-11-29").map(x=>x.key),["exam:exam","monitor:monitor"]);
assert.deepEqual(projectExperienceContext(context,command,events,rehab,"2026-02-30"),[]);
assert.ok(!projectExperienceContext(context,{plan:{...command.plan,ownerKey:"u:other"}},events,rehab,today).some(x=>x.key==="buy"));
console.log("EXPERIENCE_CONTEXT_PASS: origem, prioridade, temporalidade, ciclo, lacunas e isolamento");
