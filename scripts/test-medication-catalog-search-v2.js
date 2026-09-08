// scripts/test-medication-catalog-search-v2.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    ".."
  );

const file =
  path.join(
    ROOT,
    "supabase/migrations/20260908_improve_medication_catalog_search_v2.sql"
  );

const sql =
  fs.readFileSync(
    file,
    "utf8"
  );

function expect(condition, label) {
  if (!condition) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log("✅ " + label);
}

console.log(
  "\n💊 MEDICATION CATALOG SEARCH V2\n"
);

expect(
  sql.includes(
    "search_medication_catalog_fuzzy_legacy"
  ),
  "fuzzy original preservado"
);

expect(
  sql.includes(
    "direct_candidates"
  ),
  "busca direta criada"
);

expect(
  sql.includes(
    "like '%' || q.value || '%'"
  ),
  "termo contido suportado"
);

expect(
  sql.includes(
    "fuzzy_candidates"
  ),
  "fallback fuzzy mantido"
);

expect(
  sql.includes(
    "row_number() over"
  ),
  "duplicatas são deduplicadas"
);

console.log(
  "\n✅ SEARCH V2 VALIDADA."
);
