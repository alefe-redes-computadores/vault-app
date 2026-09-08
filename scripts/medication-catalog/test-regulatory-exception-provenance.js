// scripts/medication-catalog/test-regulatory-exception-provenance.js

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const provider =
  fs.readFileSync(
    path.join(
      ROOT,
      "lib/medication-catalog/supabase-provider.ts"
    ),
    "utf8"
  );

function count(
  source,
  token
) {
  return source
    .split(token)
    .length - 1;
}

function expect(
  condition,
  label
) {
  if (!condition) {
    throw new Error(
      "Falhou: " +
        label
    );
  }

  console.log(
    "✅ " +
      label
  );
}

console.log(
  "🧠 VAULT — REGULATORY EXCEPTION PROVENANCE v2\n"
);

expect(
  provider.includes(
    "const source =\n    sourceMap.get("
  ),
  "mapper resolve fonte via sourceMap"
);

expect(
  provider.includes(
    "sourceId:\n      row.source_version_id"
  ),
  "sourceId continua sendo o ID real"
);

expect(
  provider.includes(
    "sourceVersion:\n      source?.version"
  ),
  "sourceVersion vem da versão carregada"
);

expect(
  count(
    provider,
    "regulatoryExceptionRowToReference(\n          row,\n          sourceMap\n        )"
  ) === 2,
  "produto e substância passam sourceMap"
);

const mapperStart =
  provider.indexOf(
    "function regulatoryExceptionRowToReference("
  );

const mapperEnd =
  provider.indexOf(
    "\nfunction regulatoryRuleRowToReference(",
    mapperStart
  );

expect(
  mapperStart !== -1 &&
  mapperEnd !== -1,
  "mapper pode ser isolado"
);

const mapperBody =
  provider.slice(
    mapperStart,
    mapperEnd
  );

expect(
  !mapperBody.includes("await "),
  "mapper não faz await"
);

expect(
  !mapperBody.includes(".from("),
  "mapper não abre query Supabase"
);

expect(
  !mapperBody.includes("loadSources("),
  "mapper reutiliza sourceMap existente"
);

console.log(
  "\n✅ PROVENIÊNCIA DE EXCEÇÕES v2 VALIDADA."
);

console.log(
  "🚫 Self-test não acessa Supabase."
);
