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
assert.match(notifications, /visibilitychange/);
assert.match(notifications, /scheduledWithdrawals, today/);
assert.match(notifications, /Retirada atrasada/);
assert.match(notifications, /current\.tipo !== "withdrawal"/);
const brain = read("lib/health-intelligence/medication-care-opportunities.ts");
assert.match(brain, /!insight\.deveRenovar && !hasStockSignal && !overdueWithdrawal/);
assert.match(brain, /motivo: "sus" as const/);
const avatar = read("components/saude/HealthAvatar3D.tsx");
assert.match(avatar, /phoneRim=mesh\([^\n]+\.119\)/);
assert.match(avatar, /screen=mesh\([^\n]+\.128\)/);
console.log("V218: retirada atrasada permanece acionável; Avatar mostra moldura e tela sem sobreposição");
