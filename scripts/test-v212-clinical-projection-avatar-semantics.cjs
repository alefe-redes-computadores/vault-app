const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const js = ts.transpileModule(read("lib/health-intelligence/clinical-timeline-projection.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
new Function("exports", "module", "require", js)(moduleBox.exports, moduleBox, require);
const { buildClinicalTimelineProjection, clinicalTimelineRoute } = moduleBox.exports;

const event = (id, type, date, entityType, entityId, label, status = null) => ({
  id, type, date, entityType, entityId, label, personId: "p1", occurredAt: `${date}T12:00:00`,
  relatedEntityIds: [], facts: { status }, source: "contract",
});
const timeline = [
  event("old", "appointment", "2026-06-01", "consulta", "c old", "Consulta antiga"),
  event("dose", "dose", "2026-10-20", "medicamento", "m1", "Dose SOS", "tomada"),
  event("pickup", "pickup", "2026-10-21", "retirada", "r/1", "Retirada SUS", "pendente"),
  event("plain", "health_record", "2026-10-21", "unknown", "x", "Pressão"),
];
const snapshot = JSON.stringify(timeline);
const projection = buildClinicalTimelineProjection({ timeline, type: "all", period: 30, query: "", today: "2026-10-21" });
assert.deepEqual(projection.events.map((item) => item.id), ["plain", "pickup", "dose"]);
assert.deepEqual(projection.groups.map(([date, rows]) => [date, rows.map((item) => item.id)]), [
  ["2026-10-21", ["plain", "pickup"]], ["2026-10-20", ["dose"]],
]);
assert.deepEqual(projection.stats, { days: 2, categories: 3, navigable: 2 });
assert.equal(projection.routeById.get("pickup"), "/saude/retiradas/detalhes?id=r%2F1");
assert.equal(projection.routeById.has("plain"), false);
assert.equal(JSON.stringify(timeline), snapshot, "projection must not mutate canonical timeline");
assert.deepEqual(buildClinicalTimelineProjection({ timeline, type: "pickup", period: 3650, query: "pendente", today: "2026-10-21" }).events.map((item) => item.id), ["pickup"]);
assert.equal(clinicalTimelineRoute(event("missing", "pickup", "2026-10-21", "retirada", undefined, "Retirada")), null);

const timelinePage = read("app/saude/timeline/page.tsx");
const recordsPage = read("app/saude/registros/page.tsx");
const surgery = read("components/saude/AvatarSurgeryAgenda.tsx");
const bodyEvidence = read("components/saude/AvatarBodyEvidence.tsx");
const supply = read("components/saude/SupplyCycleSummary.tsx");
assert.match(timelinePage, /buildClinicalTimelineProjection/);
assert.match(timelinePage, /routeById\.get\(event\.id\)/);
assert.doesNotMatch(timelinePage, /\.reverse\(\)\.filter/);
assert.match(recordsPage, /for\(const event of month\.events\)/);
assert.doesNotMatch(recordsPage, /month\.events\.filter\(e => e\.kind/);
assert.doesNotMatch(surgery, /sky-/);
assert.match(surgery, /rose-400/);
assert.match(bodyEvidence, /bg-amber-400\/10/);
assert.match(supply, /title:'Documentos'.*tone:'text-violet-300'/);
console.log("V212 OK: one-pass clinical projection, compact counts and semantic Avatar/document colors");
