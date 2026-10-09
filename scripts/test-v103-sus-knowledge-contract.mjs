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
const dossier = (c = cycle, d = data, docs = [], p = processRecord) =>
  supplyDossier(p, c, med, d, docs, "2026-10-09");
assert.equal(
  SUS_CATALOG.filter((x) => x.programa === "estadual_ceaf").length,
  594
);
assert.equal(
  SUS_CATALOG.filter((x) => x.programa === "farmacia_popular").length,
  41
);
assert.equal(
  new Set(SUS_CATALOG.map((x) => x.id)).size,
  SUS_CATALOG.length,
  "chaves únicas por cobertura e apresentação"
);
assert.equal(
  searchSusCatalog("codeina", "estadual_ceaf", "Dor Crônica").length,
  3
);
assert.equal(
  searchSusCatalog("GABAPENTINA", "estadual_ceaf", "Dor Crônica").length,
  2
);
assert.equal(
  searchSusCatalog("metadona", "estadual_ceaf", "Dor Crônica").length,
  3
);
assert.equal(
  searchSusCatalog("morfina", "estadual_ceaf", "Dor Crônica").length,
  7
);
assert.equal(
  searchSusCatalog("fralda", "farmacia_popular")[0].natureza,
  "insumo"
);
assert.ok(
  searchSusCatalog(
    "naproxeno",
    "estadual_ceaf",
    "Dor Crônica"
  )[0].cids.includes("M16.0")
);
assert.ok(
  !searchSusCatalog(
    "naproxeno",
    "estadual_ceaf",
    "Dor Crônica"
  )[0].cids.includes("R52.1"),
  "indicação específica preservada"
);
assert.equal(
  dossier().requirements.length,
  4,
  "inicial: LME receita formulário pessoais"
);
assert.equal(
  dossier({ ...cycle, motivo: "renovacao" }).requirements.length,
  2,
  "renovação: LME e receita"
);
for (const reason of ["troca", "inclusao"])
  assert.equal(dossier({ ...cycle, motivo: reason }).requirements.length, 3);
assert.equal(
  dossier({ ...cycle, motivo: "ajuste_dose" }).requirements.length,
  0,
  "não inventa regra obrigatória para alteração de dose"
);
assert.equal(
  dossier({ ...cycle, motivo: "ajuste_dose" }).uncertainDoseChange,
  true
);
assert.equal(dossier().prescriptionModel, "Notificação de Receita A (amarela)");
const codeine = searchSusCatalog("codeina", "estadual_ceaf", "Dor Crônica")[0];
assert.equal(
  dossier(cycle, { ...data, itens: [{ ...item, catalogo_id: codeine.id }] })
    .prescriptionModel,
  "Receita de Controle Especial (branca)"
);
assert.equal(
  dossier(cycle, { ...data, itens: [{ ...item, catalogo_id: null }] }).detailed,
  false,
  "nome não concede elegibilidade"
);
assert.equal(
  dossier(cycle, data, [], { ...processRecord, uf: "SP" }).detailed,
  false,
  "regra MG não se aplica a SP"
);
assert.equal(
  dossier(cycle, data, [], { ...processRecord, indicacao: "Epilepsia" })
    .detailed,
  false,
  "outra indicação não recebe roteiro de dor crônica"
);
assert.throws(() =>
  validateCatalogSelection({ ...processRecord, uf: "SP" }, entry.id)
);
assert.throws(() =>
  validateCatalogSelection(
    processRecord,
    SUS_CATALOG.find((x) => x.natureza === "insumo").id
  )
);
assert.equal(
  medicationSusQuery({
    ...med,
    nome: "Marca",
    catalog_snapshot: { reference: { activeIngredients: ["Metadona"] } },
  }),
  "Metadona"
);
const doc = { ...base, id: "d", category_id: "saude", title: "LME" };
const link = {
  ...base,
  id: "l",
  processo_id: "p1",
  ciclo_id: "c",
  document_id: "d",
  tipo: "lme",
  estado: "preenchido",
  retirada_id: null,
};
assert.equal(
  dossier(cycle, { ...data, documentos: [link] }, [doc]).missing.length,
  3
);
assert.equal(
  dossier(cycle, { ...data, documentos: [{ ...link, ciclo_id: "old" }] }, [doc])
    .missing.length,
  4,
  "LME antiga não resolve nova solicitação"
);
assert.equal(
  dossier(cycle, { ...data, documentos: [link] }, [
    { ...doc, person_id: "other" },
  ]).missing.length,
  4,
  "anexo de outra pessoa excluído"
);
assert.equal(
  dossier({ ...cycle, documentos_pessoais_conferidos: true }).missing.length,
  3
);
let insights = buildSupplyInsights(context);
assert.ok(
  insights.some(
    (x) =>
      x.id.startsWith("fornecimento-planejamento-v103") &&
      x.gravidadeSeguranca === "importante"
  )
);
assert.ok(
  insights.some((x) => x.mensagem.includes("Formulário específico")),
  "cérebro explica documentos faltantes"
);
const authorized = {
  ...cycle,
  id: "old",
  status: "autorizado",
  inicio: "2026-09-01",
  fim: "2027-02-28",
  preparar_ate: null,
};
insights = buildSupplyInsights({
  ...context,
  fornecimento: {
    ...data,
    ciclos: [authorized, cycle],
    itens: [{ ...item, id: "old-item", ciclo_id: "old" }, item],
  },
});
assert.ok(
  insights.some((x) => x.id.startsWith("fornecimento-planejamento-v103")),
  "prazo de ciclo futuro aparece mesmo com período atual autorizado"
);
assert.equal(
  buildSupplyInsights({
    ...context,
    fornecimento: {
      ...data,
      ciclos: [{ ...cycle, preparar_ate: "2026-12-20" }],
    },
  }).filter((x) => x.id.startsWith("fornecimento-planejamento-v103")).length,
  0
);
assert.equal(buildSupplyInsights({ ...context, personId: "other" }).length, 0);
assert.equal(
  dossier({ ...cycle, status: "autorizado" }).requirements.length,
  0,
  "histórico não vira documentação pendente"
);
const queue = fs.readFileSync("hooks/useSyncQueue.ts", "utf8");
for (const field of [
  "preparar_ate",
  "consulta_id",
  "motivo",
  "catalogo_id",
  "uf",
  "indicacao",
])
  assert.ok(queue.includes('"' + field + '"'), "campo sincronizado: " + field);
const { selectHealthHighlights } = load(
  "lib/health-intelligence/select-highlights.ts"
);
const planned = buildSupplyInsights({
  ...context,
  fornecimento: { ...data, ciclos: [{ ...cycle, preparar_ate: "2026-10-14" }] },
}).find((x) => x.id.startsWith("fornecimento-planejamento-v103"));
assert.ok(planned);
assert.ok(
  selectHealthHighlights([planned]).length,
  "planejamento confirmado aparece na Home mesmo com uma evidência administrativa"
);
assert.equal(
  dossier(
    {
      ...cycle,
      uf_snapshot: "MG",
      indicacao_snapshot: "Dor Crônica",
      origem_snapshot: "estadual_ceaf",
    },
    data,
    [],
    { ...processRecord, uf: "SP", indicacao: "Epilepsia" }
  ).detailed,
  true,
  "contexto do ciclo mantém regras históricas"
);
console.log(
  "V103: catálogo, indicações, etapas, documentos, escopo, prazos e cérebro OK"
);
