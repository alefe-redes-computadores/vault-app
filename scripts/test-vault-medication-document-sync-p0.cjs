const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

const read = (path) => fs.readFileSync(path, "utf8");
const parse = (path) => {
  const source = read(path);
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: path,
    reportDiagnostics: true,
  });
  assert.equal((result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0, `parse ${path}`);
};

parse("hooks/useSyncQueue.ts");
parse("lib/sync/medication-document-dependency.ts");
parse("lib/repositories/documents.ts");

const queue = read("hooks/useSyncQueue.ts");
assert.match(queue, /resolveMedicationDocumentDependency/);
assert.match(queue, /SyncDependencyDeferredError/);
assert.match(queue, /db\.medicamentos\.get\(med\.id\)/);
assert.match(queue, /\.from\("documents"\)/);
assert.match(queue, /delete repairedMedication\.document_id/);
assert.match(queue, /aDelete !== bDelete/);
assert.match(queue, /aDelete \? -dependencyOrder : dependencyOrder/);

const dependency = read("lib/sync/medication-document-dependency.ts");
assert.match(dependency, /"enqueue_parent"/);
assert.match(dependency, /"unlink_orphan"/);
assert.match(dependency, /mesma conta e pessoa/);

const dependencyModule = new Module("medication-document-dependency");
dependencyModule._compile(
  ts.transpileModule(dependency, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  "medication-document-dependency.js"
);
const decide = dependencyModule.exports.resolveMedicationDocumentDependency;
const base = { documentId: "doc-1", medicationUserId: "user-1", medicationPersonId: "person-1" };
assert.equal(decide({ ...base, localDocument: null, remoteExists: true }), "ready");
assert.equal(decide({ ...base, localDocument: null, remoteExists: false }), "unlink_orphan");
assert.equal(decide({ ...base, localDocument: { id: "doc-1", user_id: "user-1", person_id: "person-1" }, remoteExists: false }), "enqueue_parent");
assert.throws(
  () => decide({ ...base, localDocument: { id: "doc-1", user_id: "user-2", person_id: "person-1" }, remoteExists: false }),
  /mesma conta e pessoa/
);

const documents = read("lib/repositories/documents.ts");
assert.match(documents, /linkedMedications/);
assert.match(documents, /medication\.document_id === safeId/);

const integrity = read("lib/integridadeReferencial.ts");
assert.match(integrity, /med\.document_id && !documentIds\.has\(med\.document_id\)/);

const migration = read("supabase/migrations/20261117133133_medication_document_sync_p0.sql");
assert.match(migration, /create index if not exists medicamentos_document_id_idx/);
assert.doesNotMatch(migration, /drop\s+constraint|disable\s+row\s+level|delete\s+from/i);

console.log("VAULT MEDICATION DOCUMENT SYNC P0: OK");
