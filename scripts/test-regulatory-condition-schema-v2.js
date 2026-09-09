// scripts/test-regulatory-condition-schema-v2.js
"use strict";

const fs =
  require("fs");

const file =
  fs.readFileSync(
    "lib/medication-catalog/supabase-provider.ts",
    "utf8"
  );

function expect(
  condition,
  label
) {
  if (!condition) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

console.log(
  "\n🏥 REGULATORY CONDITION SCHEMA V2\n"
);

expect(
  file.includes(
    'case "pharmaceutical_form_category"'
  ),
  "provider reconhece a nova condição"
);

expect(
  file.includes(
    'schemaVersion !==\n          2'
  ),
  "nova condição exige schema V2"
);

expect(
  file.includes(
    'row.value !==\n          "topical"'
  ),
  "valor categórico é validado"
);

expect(
  file.includes(
    'schemaVersion !==\n        1 &&'
  ),
  "schema V1 continua aceito"
);

expect(
  file.includes(
    'schemaVersion !==\n        2'
  ),
  "schema V2 é aceito"
);

expect(
  file.includes(
    "parseRegulatoryCondition(\n          condition,\n          schemaVersion"
  ),
  "versão do schema chega ao parser individual"
);

console.log(
  "\n✅ PROVIDER V2 VALIDADO."
);
