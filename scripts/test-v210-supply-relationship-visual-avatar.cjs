const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const source = read("lib/health-supply/relationship-index.ts");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
new Function("exports", "module", "require", js)(moduleBox.exports, moduleBox, require);
const { buildSupplyRelationshipIndex } = moduleBox.exports;

const owner = { user_id: "u1", person_id: "p1" };
const process = (id, status = "ativo", scope = owner) => ({ id, status, ...scope });
const child = (id, processo_id, extra = {}, scope = owner) => ({ id, processo_id, ...scope, ...extra });
const index = buildSupplyRelationshipIndex({
  personId: "p1",
  userId: "u1",
  data: {
    processos: [process("active"), process("closed", "encerrado"), process("other-person", "ativo", { user_id: "u1", person_id: "p2" })],
    itens: [
      child("i1", "active", { medicamento_id: "m1" }),
      child("i2", "closed", { medicamento_id: "m2" }),
      child("orphan", "missing", { medicamento_id: "m3" }),
      child("foreign", "active", { medicamento_id: "m4" }, { user_id: "u2", person_id: "p1" }),
    ],
    ciclos: [child("c1", "active"), child("orphan-cycle", "missing")],
    documentos: [child("dl1", "active", { document_id: "d1" }), child("foreign-link", "active", { document_id: "d2" }, { user_id: "u1", person_id: "p2" })],
  },
  medications: [{ id: "m1", ...owner }, { id: "m2", ...owner }, { id: "m4", user_id: "u2", person_id: "p1" }],
  documents: [{ id: "d1", ...owner }, { id: "d2", user_id: "u1", person_id: "p2" }],
  withdrawals: [
    { id: "r1", fornecimento_id: "active", ...owner },
    { id: "orphan-r", fornecimento_id: "missing", ...owner },
    { id: "foreign-r", fornecimento_id: "active", user_id: "u1", person_id: "p2" },
  ],
  pharmacies: [{ id: "f1", user_id: "u1" }, { id: "f2", user_id: "u2" }],
  places: [{ id: "l1", user_id: "u1" }, { id: "l2", user_id: "u2" }],
});

assert.deepEqual(index.processes.map((row) => row.id), ["active", "closed"]);
assert.deepEqual(index.items.map((row) => row.id), ["i1", "i2"]);
assert.deepEqual([...index.medicationIdsByProcess.get("active")], ["m1"]);
assert.deepEqual([...index.medicationIdsByProcess.get("closed")], ["m2"]);
assert.deepEqual([...index.activeMedicationIds], ["m1"]);
assert.deepEqual(index.withdrawalsByProcess.get("active").map((row) => row.id), ["r1"]);
assert.equal(index.documentById.get("d1").id, "d1");
assert.equal(index.documentById.has("d2"), false);
assert.equal(index.pharmacyById.has("f2"), false);
assert.equal(index.placeById.has("l2"), false);

const page = read("app/saude/fornecimento/page.tsx");
const choiceIcon = read("components/saude/SupplyChoiceIcon.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");
assert.match(page, /buildSupplyRelationshipIndex/);
assert.match(page, /relationalIndex\.withdrawalsByProcess\.get/);
assert.match(page, /relationalIndex\.documentsByProcess\.get/);
assert.doesNotMatch(page, /(sky|cyan)-/);
assert.match(choiceIcon, /comprado:\[ShoppingBag,'text-rose-300'\]/);
assert.match(choiceIcon, /cycle'\?\[CalendarDays,'text-emerald-300'\]/);
assert.match(avatar, /expressionEyes/);
assert.match(avatar, /value==="reflective"\?\.88:1/);
assert.doesNotMatch(avatar, /text-slate-/);

console.log("V210 OK: owner-scoped bidirectional supply index, O(1) render lookups, semantic palette and expressive Avatar gaze");
