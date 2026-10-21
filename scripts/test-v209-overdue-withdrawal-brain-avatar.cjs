const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const source = read("lib/withdrawal-agenda.ts");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
new Function("exports", "module", "require", js)(moduleBox.exports, moduleBox, require);
const agenda = moduleBox.exports;

const base = { user_id: "u1", person_id: "p1", medicamento_id: "m1", tipo: "sus" };
const rows = [
  { ...base, id: "old", data: "2026-10-20", status: "agendada" },
  { ...base, id: "today", data: "2026-10-21", status: "agendada", horario: "09:00" },
  { ...base, id: "done", data: "2026-10-20", status: "realizada" },
  { ...base, id: "closed", data: "2026-10-19", status: "nao_realizada" },
  { ...base, id: "future", data: "2026-10-22", status: "agendada" },
];

assert.deepEqual(agenda.openWithdrawalsDueBy(rows, "2026-10-21").map((row) => row.id), ["old", "today"]);
assert.deepEqual(agenda.withdrawalsForAgendaDate(rows, "2026-10-21", "2026-10-21").map((row) => row.id), ["old", "today"]);
assert.deepEqual(agenda.withdrawalsForAgendaDate(rows, "2026-10-20", "2026-10-21").map((row) => row.id), ["old", "done"]);
assert.equal(agenda.withdrawalDaysOverdue("2026-10-18", "2026-10-21"), 3);
assert.equal(agenda.isOverdueWithdrawal(rows[2], "2026-10-21"), false);

const home = read("app/page.tsx");
const today = read("app/hoje/page.tsx");
const hook = read("hooks/useRetiradas.ts");
const repository = read("lib/repositories/retiradas.ts");
const brain = read("lib/health-insights.ts");
const avatar = read("components/saude/HealthAvatar3D.tsx");
assert.match(home, /openWithdrawalsDueBy\(retiradas, hoje\)/);
assert.match(today, /withdrawalsForAgendaDate\(retiradas, dataSelecionada/);
assert.match(repository, /where\("\[user_id\+person_id\]"\)/);
assert.match(hook, /user\.id, activePersonId/);
assert.match(brain, /filter\(isOpenWithdrawal\)/);
assert.match(avatar, /compactRef\.current\)return/);
console.log("V209 OK: overdue withdrawals remain actionable, reads are owner-scoped, Brain closes resolved noise and compact Avatar stays front-facing");
