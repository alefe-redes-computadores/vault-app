const fs = require("node:fs");
const assert = require("node:assert/strict");

const treatmentsHook = fs.readFileSync("hooks/useTratamentos.ts", "utf8");
const medicationsHook = fs.readFileSync("hooks/useMedicamentos.ts", "utf8");
const documentsHook = fs.readFileSync("hooks/useDocuments.ts", "utf8");
const treatmentsPage = fs.readFileSync("app/saude/tratamentos/page.tsx", "utf8");
const documentsPage = fs.readFileSync("app/saude/documentos/page.tsx", "utf8");

assert.match(treatmentsHook, /tratamentos === undefined/, "treatments must preserve first-query loading truth");
assert.doesNotMatch(treatmentsHook, /activePersonId,\s*\],\s*\[\]/, "treatments must not hide loading behind a default array");
assert.match(medicationsHook, /medicamentos === undefined/, "medications must expose first-query loading");
assert.match(medicationsHook, /medicamentosIncluindoDescontinuados === undefined/, "the complete medication query must participate in loading");
assert.match(documentsHook, /export function useDocumentsState/, "documents need a non-breaking stateful hook");
assert.match(documentsHook, /Boolean\(targetPersonId\) && documentos === undefined/, "documents must distinguish no person from loading");
assert.match(treatmentsPage, /aria-label="Carregando tratamentos"/, "treatments need an accessible loading surface");
assert.match(documentsPage, /aria-label="Carregando documentos"/, "documents need an accessible loading surface");
assert.doesNotMatch(documentsPage, /const documents =\s*useDocuments\(\)/, "documents page must consume the stateful query only once");

console.log("V291 health loading truth contract passed");
