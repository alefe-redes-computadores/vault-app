const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const js = ts.transpileModule(read("lib/health-network/care-network-index.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
new Function("exports", "module", "require", js)(moduleBox.exports, moduleBox, require);
const { buildCareNetworkIndex, buildCareNetworkStats } = moduleBox.exports;

const accessJs = ts.transpileModule(read("lib/medication-access-action.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const accessBox = { exports: {} };
new Function("exports", "module", "require", accessJs)(accessBox.exports, accessBox, require);
const { medicationAccessAction } = accessBox.exports;

const person = (id, extra = {}) => ({ id, user_id: "u1", person_id: "p1", ...extra });
const foreign = (id, extra = {}) => ({ id, user_id: "u1", person_id: "p2", ...extra });
const input = {
  activePersonId: "p1",
  medicamentos: [person("m1", { status: "ativo", medico_id: "dr-med", farmacia_id: "ph-med", hospital_id: "h-med", local_id: "l-med" }), foreign("m2", { medico_id: "dr-foreign" })],
  tratamentos: [person("t1", { status: "ativo", medico_ids: ["dr-treatment"], hospital_ids: ["h-treatment"], local_ids: ["l-treatment"] })],
  consultas: [person("q1", { status: "agendada", data: "soon", medico_id: "dr-query", hospital_id: "h-query", local_id: "l-query" }), person("q2", { status: "realizada", data: "past" })],
  exames: [person("e1", { medico_id: "dr-exam", local_id: "l-exam" })],
  cirurgias: [person("s1", { medico_id: "dr-surgery", hospital_id: "h-surgery", local_id: "l-surgery" })],
  renovacoes: [person("r1", { medico_id: "dr-renewal", farmacia_id: "ph-renewal", hospital_id: "h-renewal", local_id: "l-renewal" })],
  registros: [person("record"), foreign("foreign-record")],
  cids: [person("cid", { medico_id: "dr-cid", hospital_id: "h-cid", local_id: "l-cid" })],
  retiradas: [person("withdrawal"), foreign("foreign-withdrawal")],
  medicos: ["dr-med", "dr-treatment", "dr-query", "dr-exam", "dr-surgery", "dr-renewal", "dr-cid", "dr-foreign"].map((id) => ({ id })),
  farmacias: ["ph-med", "ph-renewal", "l-med"].map((id) => ({ id })),
  hospitais: ["h-med", "h-treatment", "h-query", "h-surgery", "h-renewal", "h-cid", "l-query"].map((id) => ({ id })),
  locais: ["l-med", "l-treatment", "l-query", "l-exam", "l-surgery", "l-renewal", "l-cid", "h-query"].map((id) => ({ id })),
};
const snapshot = JSON.stringify(input);
const index = buildCareNetworkIndex(input);

assert.deepEqual(index.medicamentos.map((row) => row.id), ["m1"]);
assert.deepEqual(index.registros.map((row) => row.id), ["record"]);
assert.deepEqual(index.retiradas.map((row) => row.id), ["withdrawal"]);
assert.deepEqual([...index.medicoIds].sort(), ["dr-cid", "dr-exam", "dr-med", "dr-query", "dr-renewal", "dr-surgery", "dr-treatment"]);
assert.deepEqual(index.farmacias.map((row) => row.id), ["ph-med", "ph-renewal"]);
assert.deepEqual(index.hospitais.map((row) => row.id), ["h-med", "h-treatment", "h-query", "h-surgery", "h-renewal", "h-cid"]);
assert.deepEqual(index.locais.map((row) => row.id), ["l-med", "l-treatment", "l-query", "l-exam", "l-surgery", "l-renewal", "l-cid"]);
assert.equal(index.hospitalIds.has("l-query"), false);
assert.equal(index.localIds.has("h-query"), false);
assert.equal(JSON.stringify(input), snapshot, "the projection must not mutate hook data");

const stats = buildCareNetworkStats(index, (date) => date === "soon" ? 12 : -1);
assert.equal(stats.medicamentosAtivos, 1);
assert.equal(stats.tratamentosAtivos, 1);
assert.equal(stats.consultasProximas, 1);
assert.equal(stats.medicos, 7);

const empty = buildCareNetworkIndex({ ...input, activePersonId: null });
assert.equal(empty.medicamentos.length, 0);
assert.equal(empty.medicos.length, 0);

const plannedSos = medicationAccessAction(
  { deveRenovar: true, motivo: "estoque" },
  "zolpidem",
  "/saude/medicamentos",
  { tipoUso: "sos", tipoAquisicao: "comprado" }
);
assert.equal(plannedSos.kind, "withdrawal");
assert.equal(plannedSos.cta, "Planejar reposição");
assert.match(plannedSos.href, /^\/saude\/retiradas\/nova\?/);

const page = read("app/saude/rede/page.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");
const brain = read("app/inteligencia/page.tsx");
const prescription = read("app/saude/renovacao/nova-receita/page.tsx");
const insights = read("lib/health-insights.ts");
assert.match(page, /buildCareNetworkIndex/);
assert.match(page, /buildCareNetworkStats\(networkIndex, getDaysUntil\)/);
assert.doesNotMatch(page, /const filteredMedicos\s*=\s*useMemo/);
assert.doesNotMatch(page, /const filteredMedicamentos\s*=\s*useMemo/);
assert.match(avatar, /V214: planos orbitais afunilados/);
assert.match(avatar, /taperedBox\(\.041,\.061,\.016,\.017\)/);
assert.doesNotMatch(avatar, /sign\*\.081,2\.826,\.237/);
assert.match(avatar, /start from Three's stable indexed geometry/);
// V216 keeps the dedicated grip while moving fingers behind the screen edge.
assert.match(avatar, /phoneX\+gripSign\*\.102,1\.323\+fingerIndex\*\.042,\.08/);
assert.doesNotMatch(brain, /(sky|cyan)-400/);
assert.match(brain, /data_quality:.*rose-400/);
assert.match(brain, /financial:.*emerald-400/);
assert.match(prescription, /Planejar próxima revisão da receita/);
assert.match(prescription, /uploadFile\(user\.id, localFile, "receitas"\)/);
assert.match(prescription, /anexo_url:\s*uploadedStorageUrl/);
assert.match(insights, /falta de estoque é um problema de reposição/);
assert.doesNotMatch(insights, /automatico && !medicamento\.tratamento_ids\?\.length/);

console.log("V214 OK: care network, prescription/access states, Android-safe Avatar and semantic Brain palette");
