import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  ts = require(process.env.VAULT_TEST_TYPESCRIPT || "typescript"),
  cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if(filename.endsWith(".json.ts"))return {__esModule:true,default:JSON.parse(fs.readFileSync(filename.slice(0,-3),"utf8"))};
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
    filename,
  );
  return mod.exports;
}
const { supplyChecklist, estimatedCycleEnd, validSupplyDate } = load(
  "lib/health-supply/rules.ts",
);
const { buildSupplyInsights } = load(
  "lib/health-intelligence/supply-insights.ts",
);
const { selectContextualHealthInsights } = load(
  "lib/health-intelligence/contextual.ts",
);
const { selectHealthHighlights } = load(
  "lib/health-intelligence/select-highlights.ts",
);
const base = {
  user_id: "u",
  person_id: "p",
  created_at: "2026-10-09T09:00:00Z",
  updated_at: "2026-10-09T09:00:00Z",
};
const supplyProcess = {
  ...base,
  id: "supplyProcess",
  titulo: "Metadona",
  origem: "estadual_ceaf",
  status: "ativo",
  renovacao_meses: 6,
  antecedencia_dias: 30,
  receita_cada_retirada: true,
};
const cycle = {
  ...base,
  id: "cycle",
  processo_id: "supplyProcess",
  status: "preparando",
  inicio: null,
  fim: null,
};
const med = {
  ...base,
  id: "m",
  nome: "Metadona",
  dosagem: "10 mg",
  status: "ativo",
};
const withdrawal = {
  ...base,
  id: "r",
  medicamento_id: "m",
  data: "2026-10-09",
  status: "agendada",
  fornecimento_id: "supplyProcess",
  fornecimento_ciclo_id: "cycle",
  quantidade_prevista: 30,
};
const item = {
  ...base,
  id: "i",
  processo_id: "supplyProcess",
  ciclo_id: "cycle",
  medicamento_id: "m",
  dosagem: "10 mg",
  quantidade_mensal: 30,
};
const data = {
  processos: [supplyProcess],
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
  retiradas: [withdrawal],
  fornecimento: data,
};
const check = (
  c = cycle,
  d = data,
  docs = [],
  r = withdrawal,
  p = supplyProcess,
  m = med,
  today = "2026-10-09",
) => supplyChecklist(p, c, m, r, d, docs, today);
assert.ok(check().needsLme, "renovação sem autorização pede LME");
const doc = {
  ...base,
  id: "doc",
  category_id: "saude",
  type: "lme",
  title: "LME preenchida",
  attachments: [],
};
const link = {
  ...base,
  id: "link",
  processo_id: "supplyProcess",
  ciclo_id: "cycle",
  document_id: "doc",
  retirada_id: null,
  tipo: "lme",
  estado: "preenchido",
};
const ready = { ...data, documentos: [link] };
assert.ok(
  check(cycle, ready, [doc]).lmeReady,
  "LME já preenchida é reconhecida",
);
assert.equal(check(cycle, ready, [doc]).covered, false, "anexo não autoriza");
assert.ok(
  check({ ...cycle, status: "protocolado" }, ready, [doc]).needsLme,
  "protocolo não autoriza",
);
const authorized = {
  ...cycle,
  status: "autorizado",
  inicio: "2026-10-09",
  fim: "2027-04-08",
};
assert.equal(
  check(authorized).needsLme,
  false,
  "autorização cobre retirada hoje",
);
assert.equal(
  check(authorized, data, [], { ...withdrawal, data: "2027-03-09" }).needsLme,
  false,
  "mês seis coberto",
);
assert.equal(
  check(authorized, ready, [doc], { ...withdrawal, data: "2027-04-09" })
    .lmeReady,
  false,
  "LME do ciclo encerrado não renova o próximo",
);
assert.equal(
  check(authorized, data, [], { ...withdrawal, data: "2027-04-09" }).needsLme,
  true,
  "próximo ciclo exige renovação",
);
assert.equal(
  check(authorized, data, [], { ...withdrawal, data: "2027-04-08" }).needsLme,
  false,
  "último dia incluído",
);
assert.equal(
  check(authorized, data, [], {
    ...withdrawal,
    data: "2027-04-09",
    reagendamentos: [{ nova_data: "2027-04-09" }],
  }).covered,
  false,
  "reagendamento não prolonga ciclo",
);
assert.equal(estimatedCycleEnd("2026-10-09", 6), "2027-04-08");
assert.equal(
  estimatedCycleEnd("2026-08-31", 6),
  "2027-02-27",
  "fim de mês preservado por limite civil",
);
assert.equal(estimatedCycleEnd("2026-02-30", 6), null);
assert.equal(validSupplyDate("2026-02-30"), false);
assert.equal(
  check(cycle, ready, [{ ...doc, person_id: "other" }]).lmeReady,
  false,
  "documento de outra pessoa excluído",
);
assert.equal(
  check(cycle, ready, [{ ...doc, user_id: "other" }]).lmeReady,
  false,
  "outra conta excluída",
);
assert.equal(
  check(cycle, { ...ready, documentos: [{ ...link, person_id: "other" }] }, [
    doc,
  ]).lmeReady,
  false,
  "vínculo cruzado excluído",
);
assert.equal(
  check(cycle, ready, []).lmeReady,
  false,
  "documento removido não fica pronto",
);
const recipeLink = { ...link, tipo: "receita", retirada_id: "old" };
assert.equal(
  check(authorized, { ...data, documentos: [recipeLink] }, [doc])
    .prescriptionReady,
  false,
  "receita de outra retirada não satisfaz",
);
assert.equal(
  check(
    authorized,
    { ...data, documentos: [{ ...recipeLink, retirada_id: "r" }] },
    [doc],
  ).prescriptionReady,
  true,
  "receita exata vinculada",
);
assert.equal(
  check(authorized, data, [], withdrawal, {
    ...supplyProcess,
    origem: "municipal",
  }).needsLme,
  false,
  "municipal não herda LME CEAF",
);
assert.equal(
  check(cycle, data, [], withdrawal, { ...supplyProcess, origem: "comprado" })
    .needsLme,
  false,
  "compra não herda LME",
);
assert.equal(
  check(authorized, data, [], withdrawal, supplyProcess, {
    ...med,
    dosagem: "20 mg",
  }).changed,
  true,
  "mudança de dose é conferência, não exigência automática",
);
assert.equal(
  check(authorized, data, [], { ...withdrawal, quantidade_prevista: 60 })
    .changed,
  true,
  "aumento da quantidade pede conferência",
);
assert.equal(
  check(authorized, data, [], withdrawal, supplyProcess, med, "2027-03-15")
    .renewalSoon,
  true,
  "antecedência configurada",
);
assert.equal(
  check(authorized, data, [], withdrawal, supplyProcess, med, "2027-04-09")
    .renewalSoon,
  false,
  "vencido não aparece como futuro",
);
let signals = buildSupplyInsights(context);
assert.equal(signals.length, 1, "uma ação principal por medicamento/processo");
assert.equal(
  signals[0].gravidadeSeguranca,
  "importante",
  "documento faltando no dia tem prioridade",
);
signals = buildSupplyInsights({
  ...context,
  documentos: [doc],
  fornecimento: ready,
});
assert.equal(
  signals[0].gravidadeSeguranca,
  "informativa",
  "LME pronta diminui pendência",
);
assert.ok(
  signals[0].mensagem.includes("LME está vinculada"),
  "mensagem operacional explícita",
);
assert.equal(
  selectContextualHealthInsights(signals, "retirada", "r").length,
  1,
  "retirada recebe mesmo sinal",
);
assert.equal(
  selectContextualHealthInsights(signals, "fornecimento", "supplyProcess")
    .length,
  1,
  "processo recebe mesmo sinal",
);
assert.equal(
  selectHealthHighlights(signals).length,
  1,
  "informação documental explícita não exige três doses",
);
assert.equal(
  buildSupplyInsights({
    ...context,
    medicamentos: [{ ...med, person_id: "other" }],
  }).length,
  0,
);
assert.equal(
  buildSupplyInsights({
    ...context,
    fornecimento: {
      ...data,
      processos: [{ ...supplyProcess, user_id: "other" }],
    },
  }).length,
  0,
);
assert.equal(
  buildSupplyInsights({
    ...context,
    fornecimento: {
      ...data,
      processos: [{ ...supplyProcess, status: "encerrado" }],
    },
  }).length,
  0,
);
assert.equal(
  buildSupplyInsights({
    ...context,
    medicamentos: [{ ...med, status: "descontinuado" }],
  }).length,
  0,
);
const oldAuthorized = {
  ...authorized,
  id: "old",
  created_at: "2026-09-01T00:00:00Z",
};
const futureDraft = { ...cycle, id: "new" };
const advanced = {
  ...data,
  ciclos: [oldAuthorized, futureDraft],
  itens: [
    { ...item, ciclo_id: "old" },
    { ...item, id: "newitem", ciclo_id: "new" },
  ],
};
signals = buildSupplyInsights({
  ...context,
  retiradas: [],
  fornecimento: advanced,
});
assert.equal(
  signals.length,
  0,
  "rascunho futuro não invalida autorização atual",
);
assert.equal(buildSupplyInsights({ ...context, hoje: "2026-02-30" }).length, 0);
const { resolveSupplyWithdrawal } = load("lib/health-supply/rules.ts");
assert.equal(
  resolveSupplyWithdrawal(advanced, "m", "p", "u", "2027-02-09")
    .fornecimento_ciclo_id,
  "old",
  "nova retirada mensal usa autorização que cobre sua data",
);
assert.equal(
  resolveSupplyWithdrawal(advanced, "m", "p", "u", "2027-04-09")
    .fornecimento_ciclo_id,
  "new",
  "retirada após período usa próximo ciclo preparado",
);
assert.equal(
  resolveSupplyWithdrawal(
    {
      ...advanced,
      processos: [...advanced.processos, { ...supplyProcess, id: "second" }],
      itens: [
        ...advanced.itens,
        { ...item, id: "secondItem", processo_id: "second" },
      ],
    },
    "m",
    "p",
    "u",
    "2027-02-09",
  ).fornecimento_id,
  null,
  "origem ambígua pede escolha",
);
assert.notEqual(buildSupplyInsights(context)[0].id,buildSupplyInsights({...context,retiradas:[{...withdrawal,id:"nextwithdrawal"} ]})[0].id,"aviso de nova retirada não herda dispensa de aviso anterior");
console.log(
  "V102: fornecimento, ciclos, LME, receita por retirada, escopo e cérebro OK",
);
