const fs = require("node:fs");
const assert = require("node:assert/strict");

const page = fs.readFileSync("app/saude/fornecimento/page.tsx", "utf8");
const cids = fs.readFileSync("hooks/useCids.ts", "utf8");
const pharmacies = fs.readFileSync("hooks/useFarmacias.ts", "utf8");
const places = fs.readFileSync("hooks/useLocais.ts", "utf8");

assert.match(cids, /Boolean\(activePersonId\) && cids === undefined/, "CID loading must remain person-aware");
assert.match(pharmacies, /isLoading: farmacias === undefined/, "pharmacy catalog loading must be explicit");
assert.match(places, /isLoading: locais === undefined/, "place catalog loading must be explicit");
assert.match(page, /useDocumentsState\(\)/, "supply must use one stateful document subscription");
for (const source of ["loading", "medicationsLoading", "treatmentsLoading", "cidsLoading", "withdrawalsLoading", "renewalsLoading", "documentsLoading", "pharmaciesLoading", "placesLoading"]) {
  assert.match(page, new RegExp(`contextLoading[^;]+${source}|${source}[^;]+contextLoading`), `supply context must include ${source}`);
}
assert.match(page, /aria-label="Carregando contexto de fornecimento"/, "supply loading must be accessible");
assert.doesNotMatch(page, /documents\s*=\s*useDocuments\(\)/, "supply must not duplicate document subscriptions");

console.log("V293 supply context loading contract passed");
