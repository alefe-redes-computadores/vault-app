const fs = require("node:fs");
const assert = require("node:assert/strict");

const page = fs.readFileSync("app/saude/documentos/page.tsx", "utf8");
const sources = [
  ["hooks/useConsultas.ts", "consultas"],
  ["hooks/useExames.ts", "exames"],
  ["hooks/useCirurgias.ts", "cirurgias"],
  ["hooks/useMedicos.ts", "medicos"],
];

for (const [file, variable] of sources) {
  const code = fs.readFileSync(file, "utf8");
  assert.match(code, new RegExp(`${variable} === undefined`), `${variable} must expose first-query loading`);
}

const loadingSources = [
  "documentsLoading", "medicationsLoading", "treatmentsLoading", "cidsLoading",
  "consultationsLoading", "examsLoading", "surgeriesLoading", "doctorsLoading",
  "renewalsLoading", "recordsLoading",
];
for (const source of loadingSources) {
  assert.match(page, new RegExp(`contextLoading[^;]+${source}|${source}[^;]+contextLoading`), `document context must include ${source}`);
}

assert.match(page, /if \(contextLoading\)/, "document tree must wait for the complete relation context");
assert.match(page, /aria-label="Carregando acervo clínico"/, "document context loading must be accessible");
assert.match(page, /Carregando documentos e relações clínicas/, "loading copy must explain the relational wait");

console.log("V294 document context loading contract passed");
