const fs = require("node:fs");
const assert = require("node:assert/strict");

const treatments = fs.readFileSync("app/saude/tratamentos/page.tsx", "utf8");
const documents = fs.readFileSync("app/saude/documentos/page.tsx", "utf8");
const records = fs.readFileSync("app/saude/registros/page.tsx", "utf8");

assert.match(treatments, /useDeferredValue\(search\)/, "treatment search must defer expensive filtering");
assert.match(treatments, /Histórico de tratamentos/, "treatment history needs an explicit progressive section");
assert.match(treatments, /tratamento\.status === "ativo"/, "current care must lead the default list");
assert.match(documents, /useDeferredValue\(searchQuery\)/, "document tree search must be deferred");
assert.match(documents, /next\.add\(domainGroups\[0\]\.id\)/, "only the primary document domain should open initially");
assert.doesNotMatch(documents, /domainGroups\.forEach\([\s\S]{0,180}next\.add\([\s\S]{0,80}group\.id/, "all document domains must not mount expanded by default");
assert.match(records, /<details key=\{week\.key\}/, "records must retain progressive weekly groups");
assert.match(records, /\[content-visibility:auto\]/, "record groups must retain off-screen rendering containment");

console.log("V290 progressive health collections contract passed");
