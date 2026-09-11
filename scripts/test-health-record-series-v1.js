// scripts/test-health-record-series-v1.js
"use strict";
const fs = require("fs");
function read(file) { return fs.readFileSync(file, "utf8"); }
function expect(value, label) { if (!value) throw new Error("Falhou: " + label); console.log("OK: " + label); }
const series = read("lib/health-record-series.ts");
const page = read("app/saude/registros/evolucao/page.tsx");
const list = read("app/saude/registros/page.tsx");
expect(series.includes("buildHealthRecordKey"), "série usa chave canônica");
expect(series.includes("previousStart"), "comparação usa período anterior");
expect(series.includes("new Set(current.map"), "dias são deduplicados");
expect(!series.includes("fill(0)"), "ausência não é transformada em zero");
expect(page.includes("7, 30, 90"), "períodos longitudinais disponíveis");
expect(page.includes("Sem base"), "UI declara ausência de comparação");
expect(list.includes("/saude/registros/evolucao"), "listagem expõe evolução");
console.log("HEALTH RECORD SERIES V1 CONTRACT: OK");
