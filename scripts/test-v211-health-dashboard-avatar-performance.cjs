const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const js = ts.transpileModule(read("lib/health-profile/dashboard-index.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleBox = { exports: {} };
new Function("exports", "module", "require", js)(moduleBox.exports, moduleBox, require);
const { buildHealthDashboardIndex } = moduleBox.exports;

const index = buildHealthDashboardIndex({
  personId: "p1", userId: "u1", today: "2026-10-21",
  records: [
    { id: "old", user_id: "u1", person_id: "p1", tipo: "peso", data: "2026-10-20", horario: "08:00" },
    { id: "latest", user_id: "u1", person_id: "p1", tipo: "peso", data: "2026-10-21", horario: "09:00" },
    { id: "future", user_id: "u1", person_id: "p1", tipo: "peso", data: "2026-10-22", horario: "09:00" },
    { id: "foreign", user_id: "u2", person_id: "p1", tipo: "peso", data: "2026-10-21", horario: "10:00" },
    { id: "water", user_id: "u1", person_id: "p1", tipo: "agua", data: "2026-10-21", horario: "11:00" },
  ],
  devices: [
    { id: "active", user_id: "u1", person_id: "p1", active: true },
    { id: "archived", user_id: "u1", person_id: "p1", active: false },
    { id: "foreign-device", user_id: "u1", person_id: "p2", active: true },
  ],
});
assert.deepEqual(index.records.map((row) => row.id), ["latest", "old"]);
assert.equal(index.latestByMetric.get("peso").id, "latest");
assert.deepEqual(index.activeDevices.map((row) => row.id), ["active"]);
assert.deepEqual(index.archivedDevices.map((row) => row.id), ["archived"]);
assert.equal(index.deviceById.has("foreign-device"), false);

const page = read("app/saude/minha-saude/page.tsx");
const avatar = read("components/saude/HealthAvatar.tsx");
const body = read("components/saude/HealthBody.tsx");
assert.match(page, /buildHealthDashboardIndex/);
assert.match(page, /latestByMetric\.get\(type\)/);
assert.match(page, /deviceById\.get\(r\.device_id \|\| ""\)/);
assert.doesNotMatch(page, /devices\.find\(\(d\) => d\.id/);
assert.match(page, /border-emerald-400\/20 bg-emerald-400/);
assert.match(avatar, /Preparando avatar 3D…<\/p>/);
assert.doesNotMatch(body, /text-slate-/);
console.log("V211 OK: health dashboard uses owner-scoped O(1) projections, semantic navigation and theme-aware Avatar fallback");
