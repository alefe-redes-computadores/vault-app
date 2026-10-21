const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const js = ts.transpileModule(read("lib/health-supply/relationship-index.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
new Function("exports", "module", "require", js)(moduleBox.exports, moduleBox, require);
const { buildSupplyRelationshipIndex, buildSupplyProcessView } = moduleBox.exports;

const owner = { user_id: "u1", person_id: "p1" };
const process = (id, status = "ativo", extra = {}) => ({ id, status, updated_at: id, ...owner, ...extra });
const child = (id, processo_id, extra = {}) => ({ id, processo_id, ...owner, ...extra });
const index = buildSupplyRelationshipIndex({
  personId: "p1", userId: "u1",
  data: {
    processos: [process("sus"), process("private"), process("closed", "encerrado"), process("foreign", "ativo", { person_id: "p2" })],
    itens: [child("i1", "sus", { medicamento_id: "m1" }), child("i2", "private", { medicamento_id: "m2" }), child("i3", "closed", { medicamento_id: "m1" })],
    ciclos: [child("c1", "sus", { status: "preparando" }), child("c2", "closed", { status: "encerrado" })],
    documentos: [child("d1", "sus", { document_id: "doc1" })],
  },
  medications: [
    { id: "m1", tratamento_ids: ["t1"], tipo_aquisicao: "sus", ...owner },
    { id: "m2", tratamento_ids: [], tipo_aquisicao: "sus", ...owner },
    { id: "m3", tratamento_ids: ["foreign-treatment"], tipo_aquisicao: "comprado", ...owner },
  ],
  treatments: [
    { id: "t1", medicamento_ids: ["m2"], nome: "Tratamento misto", ...owner },
    { id: "foreign-treatment", medicamento_ids: ["m3"], nome: "Outro", user_id: "u1", person_id: "p2" },
  ],
  renewals: [{ id: "buy", medicamento_id: "m2", tipo_aquisicao: "comprado", ...owner }],
  documents: [{ id: "doc1", ...owner }], withdrawals: [], pharmacies: [], places: [],
});

assert.deepEqual([...index.processIdsByMedication.get("m1")], ["sus", "closed"]);
assert.deepEqual([...index.medicationIdsByTreatment.get("t1")].sort(), ["m1", "m2"]);
assert.deepEqual([...index.treatmentIdsByMedication.get("m1")], ["t1"]);
assert.deepEqual(index.processesByTreatment.get("t1").map((row) => row.id).sort(), ["closed", "private", "sus"]);
assert.deepEqual(index.treatmentsByProcess.get("private").map((row) => row.id), ["t1"]);
assert.deepEqual(index.purchasedMedicationsByTreatment.get("t1").map((row) => row.id), ["m2"]);
assert.equal(index.treatmentById.has("foreign-treatment"), false);

const view = buildSupplyProcessView(index, index.processes);
assert.deepEqual(view.activeProcesses.map((row) => row.id), ["sus", "private"]);
assert.deepEqual(view.archivedProcesses.map((row) => row.id), ["closed"]);
assert.deepEqual({ cycles: view.cycles, documents: view.documents, inProgress: view.cyclesInProgress }, { cycles: 2, documents: 1, inProgress: 1 });
assert.deepEqual(view.treatmentGroups.map((group) => group.treatment.id), ["t1"]);

const page = read("app/saude/fornecimento/page.tsx");
const surgeryFields = read("components/saude/SurgeryBodyFields.tsx");
const avatar = read("components/saude/HealthAvatar.tsx");
const brain = read("app/inteligencia/saude/page.tsx");
assert.match(page, /buildSupplyProcessView/);
assert.match(page, /relationalIndex\.treatmentsByProcess\.get/);
assert.doesNotMatch(page, /matchesSupplyTreatment/);
assert.doesNotMatch(page, /renovacoes\.some/);
assert.doesNotMatch(surgeryFields, /sky-/);
assert.match(surgeryFields, /rose-400/);
assert.doesNotMatch(avatar, /(sky|slate)-/);
assert.match(brain, /border-violet-400\/15 bg-violet-400/);
console.log("V213 OK: bidirectional supply graph, one-pass process view and semantic Avatar/Brain surfaces");
