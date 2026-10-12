const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const cache = new Map();
let stored;
let nextId = 0;
let transactionTail = Promise.resolve();
const queue = [];
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const dbMock = {
  db: {
    settings: {
      where: () => ({ equals: (userId) => ({ first: async () => stored?.user_id === userId ? clone(stored) : undefined }) }),
      get: async (id) => stored?.id === id ? clone(stored) : undefined,
    },
    syncQueue: {},
    transaction: (_mode, tables, action) => {
      assert.equal(tables.length, 2, "memória e fila compartilham a transação");
      const task = transactionTail.then(async () => {
        const before = clone(stored), queueSize = queue.length;
        try { return await action(); }
        catch (error) { stored = before; queue.splice(queueSize); throw error; }
      });
      transactionTail = task.then(() => undefined, () => undefined);
      return task;
    },
  },
  safeAddSettings: async (row) => { stored = { ...clone(row), id: "saved-" + ++nextId }; return stored.id; },
  safeUpdateSettings: async (id, patch) => { assert.equal(id, stored.id); stored = { ...stored, ...clone(patch) }; },
};
let failQueue = false;
const syncMock = {
  enfileirarOperacao: async (_table, _action, row, options) => {
    assert.equal(options.dispatchSync, false);
    if (failQueue) throw new Error("fila indisponível");
    queue.push(clone(row));
  },
  solicitarProcessamentoSync: () => {},
};
function load(rel) {
  const filename = path.join(root, rel);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  const m = new Module(filename, module);
  cache.set(filename, m);
  m.filename = filename;
  m.require = (request) => {
    if (request === "@/lib/db") return dbMock;
    if (request === "@/lib/sync/enfileirarOperacao") return syncMock;
    if (request.startsWith("@/")) return load(request.slice(2) + ".ts");
    if (request.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), request)) + ".ts");
    return require(request);
  };
  m._compile(compiled.outputText, filename);
  return m.exports;
}
const core = load("lib/health-intelligence/brain-v5.ts");
const feedback = load("lib/health-intelligence/feedback-v4.ts");
const shared = load("lib/health-intelligence/experience-feedback.ts");
const repo = load("lib/repositories/brainV5AlertLedger.ts").brainV5AlertLedgerRepository;
const insight = (id, extra = {}) => ({ id, kind: "pattern", categoria: "rotina", titulo: id, mensagem: "Registro observado", urgencia: "baixa", confianca: "media", amostra: 8, gravidadeSeguranca: "informativa", ...extra });
(async () => {
  const a = insight("a"), b = insight("b");
  await repo.reconcile("u", "p", [a, b]);
  assert.equal(queue[0].id, stored.id, "fila usa ID efetivamente salvo");
  let records = await repo.getAll("u");
  const key = core.brainV5Key("p", a);
  await Promise.all([
    repo.feedback("u", "p", key, "dismissed"),
    repo.reconcile("u", "p", [{ ...a, amostra: 9 }, b]),
  ]);
  records = await repo.getAll("u");
  const saved = records.find((item) => item.key === key);
  assert.equal(saved.feedback, "dismissed", "recalcular não perde feedback");
  assert.ok(saved.feedback_updated_at);
  const merged = shared.mergeExperienceFeedback("p", [
    { personId: "p", insightId: "a", feedback: "useful", updatedAt: "2000-01-01" },
    { personId: "foreign", insightId: "b", feedback: "hide", updatedAt: "2099-01-01" },
  ], records);
  assert.equal(merged.find((item) => item.insightId === "a").feedback, "hide");
  assert.equal(merged.some((item) => item.personId === "foreign"), false);
  assert.deepEqual(feedback.selectExperienceInsightsV4([a, b], merged, 3).map((item) => item.id), ["b"]);
  const critical = insight("critical", { kind: "alert", gravidadeSeguranca: "critica" });
  const hideCritical = [{ personId: "p", insightId: "critical", feedback: "hide", updatedAt: "2026-01-01" }];
  assert.equal(feedback.selectExperienceInsightsV4([a, critical], hideCritical)[0].id, "critical", "preferência não oculta sinal prioritário");
  const before = clone(stored), beforeQueue = queue.length;
  failQueue = true;
  await assert.rejects(repo.feedback("u", "p", key, "useful"));
  assert.deepEqual(stored, before, "falha na fila desfaz a alteração da memória");
  assert.equal(queue.length, beforeQueue);
  failQueue = false;
  await repo.feedback("u", "foreign", key, "useful");
  assert.equal((await repo.getAll("u")).find((item) => item.key === key).feedback, "dismissed");
  const unchanged = queue.length;
  await repo.reconcile("u", "p", [{ ...a, amostra: 9 }, b]);
  assert.equal(queue.length, unchanged, "contexto idêntico não cria nova escrita");
  await repo.reconcile("u", "p", [{ ...a, gravidadeSeguranca: "critica" }, b]);
  const escalated = await repo.getAll("u");
  assert.equal(escalated.find((item) => item.key === key).feedback, undefined, "agravamento pede nova revisão");
  const staleLegacy = [{personId:"p",insightId:"a",feedback:"hide",updatedAt:saved.feedback_updated_at}];
  assert.equal(shared.mergeExperienceFeedback("p",staleLegacy,escalated).length,0,"agravamento invalida também a dispensa legada");
  console.log("BRAIN V119 OK: feedback entre experiências, concorrência, isolamento, ID salvo, rollback e prioridade.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
