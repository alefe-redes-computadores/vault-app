const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function load(file) {
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", js)(require, module, module.exports);
  return module.exports;
}

const { buildDocumentMedicationIndexesByOwner } = load("lib/health-documents/relations.ts");
const own = { user_id: "u", person_id: "p" };
const otherPerson = { user_id: "u", person_id: "other" };
const foreign = { user_id: "foreign", person_id: "p" };
const documents = [
  { ...own, id: "shared", category_id: "saude", metadata: { medicamento_ids: '["m1","m2"]' } },
  { ...otherPerson, id: "other-doc", category_id: "saude", entidade_tipo: "medicamento", entidade_id: "other-med" },
  { ...foreign, id: "foreign-doc", category_id: "saude", entidade_tipo: "medicamento", entidade_id: "foreign-med" },
];
const medications = [
  { ...own, id: "m1", nome: "A" },
  { ...own, id: "m2", nome: "B" },
  { ...otherPerson, id: "other-med", nome: "Outra pessoa" },
  { ...foreign, id: "foreign-med", nome: "Outra conta" },
];
const indexes = buildDocumentMedicationIndexesByOwner(documents, medications, []);
assert.deepEqual(indexes.get("u:p").get("shared").map((item) => item.id), ["m1", "m2"]);
assert.deepEqual(indexes.get("u:other").get("other-doc").map((item) => item.id), ["other-med"]);
assert.deepEqual(indexes.get("foreign:p").get("foreign-doc").map((item) => item.id), ["foreign-med"]);
assert.equal(indexes.get("u:p").has("other-doc"), false);

const page = fs.readFileSync("app/saude/documentos/page.tsx", "utf8");
const card = fs.readFileSync("components/DocumentCard.tsx", "utf8");
const exportButton = fs.readFileSync("components/ExportCardButton.tsx", "utf8");
assert(page.includes("buildDocumentMedicationIndexesByOwner"));
assert(!page.includes("periodDocuments.filter(d => d.user_id === doc.user_id"));
assert(page.includes("exportSurfaceReady && uniqueDocumentViewModels.length"));
assert(page.includes("onBeforeExport={prepareExportSurface}"));
assert(page.includes("onAfterExport={releaseExportSurface}"));
assert(exportButton.includes("await onBeforeExport?.()"));
assert(exportButton.includes("onAfterExport?.()"));
assert(card.includes("[content-visibility:auto]"));
assert(page.includes("[contain-intrinsic-size:0_160px]"));

console.log("V176 document command: isolated relations, lazy export, compact density and deferred rendering OK");
