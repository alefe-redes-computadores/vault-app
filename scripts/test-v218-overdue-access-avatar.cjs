const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const read = (file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const box = { exports: {} };
const js = ts.transpileModule(read("lib/medication-access-action.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function("exports", "module", "require", js)(box.exports, box, require);
const { withdrawalDueState, indexScheduledWithdrawals, medicationAccessAction } = box.exports;
const rows = [
  { id: "old", medicamento_id: "m1", status: "agendada", data: "2026-10-21" },
  { id: "done", medicamento_id: "m1", status: "realizada", data: "2026-10-19" },
  { id: "next", medicamento_id: "m1", status: "agendada", data: "2026-10-29" },
];
const pending = indexScheduledWithdrawals(rows).get("m1");
assert.equal(pending.id, "old");
assert.equal(withdrawalDueState(pending, "2026-10-22"), "overdue");
assert.equal(withdrawalDueState(pending, "2026-10-21"), "today");
assert.equal(withdrawalDueState(pending, "2026-10-20"), "future");
assert.equal(withdrawalDueState(rows[1], "2026-10-22"), null);
assert.equal(withdrawalDueState({ ...pending, data: "21/10/2026" }, "2026-10-22"), null);
assert.match(medicationAccessAction({ deveRenovar: true, motivo: "sus" }, "m1", "/", { scheduledWithdrawalId: pending.id }).href, /id=old/);
const notifications = read("components/MedicamentosNotifications.tsx");
assert.match(notifications, /withdrawalDueState\(pendingWithdrawal, today\)/);
assert.match(notifications, /useLocalDay\(\)/);
assert.match(notifications, /scheduledWithdrawals, today/);
assert.match(notifications, /Retirada atrasada/);
assert.match(notifications, /current\.tipo !== "withdrawal"/);
const brain = read("lib/health-intelligence/medication-care-opportunities.ts");
// V228: a condição legada foi substituída pela política contextual; a retirada em aberto
// continua prioritária e a ausência de necessidade não gera oportunidade operacional.
assert.match(brain, /const decision = decideMedicationAlerts\(/);
assert.match(brain, /const visibleStockSignal = hasStockSignal && decision\.showStock/);
assert.match(brain, /const visibleRenewalSignal = insight\.deveRenovar && decision\.showPrescription && !decision\.withdrawal/);
assert.match(brain, /!visibleRenewalSignal && !visibleStockSignal && !overdueWithdrawal && !dueWithdrawal/);
const policySource = read('lib/health-intelligence/medication-alert-policy.ts');
const policyBox = { exports: {} };
const policyCompiled = ts.transpileModule(policySource, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('exports','module','require',policyCompiled)(policyBox.exports,policyBox,require);
const medication = {id:'m1',user_id:'account',person_id:'person',tipo_uso:'sos',estoque_quantidade:70,status:'ativo'};
const matchingWithdrawal = {id:'old',medicamento_id:'m1',user_id:'account',person_id:'person',status:'agendada',data:'2026-10-21'};
const policyDecision = policyBox.exports.decideMedicationAlerts({medication,withdrawals:[matchingWithdrawal],today:'2026-10-22'});
assert.equal(policyDecision.withdrawal?.id,'old','V218: retirada existente deve manter identificador');
assert.equal(policyDecision.withdrawalOverdue,true,'V218: retirada vencida segue operacionalmente pendente');
assert.equal(policyDecision.focus,'withdrawal','V218: retirada tem prioridade sobre avisos de rotina');
assert.equal(policyDecision.showStock,false,'V218: SOS com 70 unidades não cria alarme de estoque');
assert.equal(policyDecision.showPrescription,false,'V218: SOS com retirada não duplica receita');
assert.equal(policyBox.exports.decideMedicationAlerts({medication:{...medication,tipo_uso:'continuo',estoque_quantidade:0},withdrawals:[matchingWithdrawal],today:'2026-10-22'}).showStock,true,'V218: medicação contínua zerada permanece visível');
assert.equal(policyBox.exports.decideMedicationAlerts({medication,withdrawals:[{...matchingWithdrawal,user_id:'other'}],today:'2026-10-22'}).withdrawal,null,'V218: compromissos alheios não entram na decisão');
assert.match(brain, /motivo: "sus" as const/);
const avatar = read("components/saude/HealthAvatar3D.tsx");
assert.match(avatar, /phoneRim=mesh\([^\n]+\.119\)/);
assert.match(avatar, /screen=mesh\([^\n]+\.128\)/);
console.log("V218: retirada atrasada permanece acionável; Avatar mostra moldura e tela sem sobreposição");
