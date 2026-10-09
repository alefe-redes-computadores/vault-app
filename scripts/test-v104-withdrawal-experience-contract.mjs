import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  ts = require(process.env.VAULT_TEST_TYPESCRIPT || "typescript"),
  cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (filename.endsWith(".json.ts"))
    return {
      __esModule: true,
      default: JSON.parse(fs.readFileSync(filename.slice(0, -3), "utf8")),
    };
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  cache.set(filename, mod);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (name) =>
    name.startsWith("@/")
      ? load(name.slice(2) + ".ts")
      : name.startsWith(".")
      ? load(path.resolve(path.dirname(filename), name) + ".ts")
      : require(name);
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}

const {
  SUS_CATALOG,
  searchSusCatalog,
  catalogEntry,
  validateCatalogSelection,
  medicationSusQuery,
} = load("lib/health-supply/catalog.ts");
const { supplyDossier } = load("lib/health-supply/knowledge.ts");
const { buildSupplyInsights } = load(
  "lib/health-intelligence/supply-insights.ts"
);
const base = {
  user_id: "u",
  person_id: "p",
  created_at: "2026-10-09T08:00:00Z",
  updated_at: "2026-10-09T08:00:00Z",
};
const processRecord = {
  ...base,
  id: "p1",
  titulo: "Dor crônica",
  origem: "estadual_ceaf",
  uf: "MG",
  indicacao: "Dor Crônica",
  status: "ativo",
  antecedencia_dias: 30,
  receita_cada_retirada: true,
  renovacao_meses: 6,
};
const med = {
  ...base,
  id: "m",
  nome: "Metadona",
  dosagem: "10 mg",
  status: "ativo",
};
const cycle = {
  ...base,
  id: "c",
  processo_id: "p1",
  status: "preparando",
  motivo: "inicial",
  preparar_ate: "2026-10-10",
  inicio: null,
  fim: null,
};
const entry = SUS_CATALOG.find(
  (x) =>
    x.indicacao === "Dor Crônica" &&
    x.medicamento === "METADONA 10 mg" &&
    x.apresentacao === "COMPRIMIDO"
);
assert.ok(entry);
const item = {
  ...base,
  id: "i",
  processo_id: "p1",
  ciclo_id: "c",
  medicamento_id: "m",
  catalogo_id: entry.id,
  dosagem: "10 mg",
  quantidade_mensal: 30,
};
const data = {
  processos: [processRecord],
  ciclos: [cycle],
  itens: [item],
  documentos: [],
};
const context = {
  personId: "p",
  hoje: "2026-10-09",
  medicamentos: [med],
  doseLogs: [],
  renovacoes: [],
  tratamentos: [],
  registrosSaude: [],
  consultas: [],
  exames: [],
  cirurgias: [],
  cids: [],
  documentos: [],
  retiradas: [],
  fornecimento: data,
};

const { withdrawalPreparation, withdrawalSourceNote, preparationStart } = load(
  "lib/health-supply/overview.ts"
);
const withdrawal = {
  ...base,
  id: "r",
  medicamento_id: "m",
  data: "2026-10-09",
  status: "agendada",
  renovacao_origem_id: "a",
  observacoes: "Anotação própria",
};
const renewal = {
  ...base,
  id: "a",
  medicamento_id: "m",
  observacoes: "nova LME",
};
assert.equal(withdrawalSourceNote(withdrawal, [renewal]), "nova LME");
assert.equal(withdrawal.observacoes, "Anotação própria");
for (const patch of [
  { user_id: "other" },
  { person_id: "other" },
  { medicamento_id: "other" },
  { id: "other" },
])
  assert.equal(
    withdrawalSourceNote(withdrawal, [{ ...renewal, ...patch }]),
    null
  );
const prep = withdrawalPreparation(withdrawal, med, data, [], "2026-10-09");
assert.equal(prep.process.id, "p1");
assert.equal(prep.cycle.id, "c");
assert.equal(prep.linked, false);
assert.ok(prep.pending.includes("LME"));
assert.ok(prep.pending.includes("Receita desta retirada"));
assert.equal(prep.tone, "important");
assert.ok(prep.recipe.includes("Notificação"));
assert.equal(
  withdrawalPreparation(
    { ...withdrawal, data: "2026-11-09" },
    med,
    data,
    [],
    "2026-10-09"
  ).tone,
  "attention"
);
assert.equal(
  withdrawalPreparation(
    { ...withdrawal, status: "realizada" },
    med,
    data,
    [],
    "2026-10-09"
  ).pending.length,
  0
);
assert.equal(
  withdrawalPreparation(
    withdrawal,
    { ...med, user_id: "other" },
    data,
    [],
    "2026-10-09"
  ).process,
  null
);
assert.equal(
  withdrawalPreparation(
    { ...withdrawal, fornecimento_id: "p1", fornecimento_ciclo_id: "other" },
    med,
    data,
    [],
    "2026-10-09"
  ).process,
  null
);
assert.equal(preparationStart("2026-11-01", 30), "2026-10-02");
assert.equal(preparationStart("2026-02-30", 30), null);
assert.equal(preparationStart("2026-11-01", -1), null);
const legacyInsights = buildSupplyInsights({
  ...context,
  retiradas: [withdrawal],
});
assert.ok(legacyInsights.some(x=>x.link.includes("retirada_id=r") && x.gravidadeSeguranca==="importante"));
assert.equal(withdrawal.fornecimento_id, undefined);
console.log(
  "VAULT V104 — retirada legada, documentos, observações e isolamento OK"
);
