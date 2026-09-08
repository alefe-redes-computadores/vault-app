// scripts/test-regulatory-rules-foundation-v3.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(
  __dirname,
  ".."
);

function read(file) {
  return fs.readFileSync(
    path.join(ROOT, file),
    "utf8"
  );
}

function expect(condition, label) {
  if (!condition) {
    throw new Error(
      "Falhou: " + label
    );
  }

  console.log(
    "✅ " + label
  );
}

const types =
  read(
    "lib/medication-intelligence/types.ts"
  );

const regulatory =
  read(
    "lib/medication-catalog/regulatory.ts"
  );

const provider =
  read(
    "lib/medication-catalog/supabase-provider.ts"
  );

const validator =
  read(
    "lib/medication-intelligence/validate.ts"
  );

const migration =
  read(
    "supabase/migrations/20260908_expand_medication_regulatory_models.sql"
  );

console.log(
  "\n🏥 REGULATORY RULES FOUNDATION V3\n"
);

expect(
  types.includes(
    "MedicationRegulatoryPrescriptionModelCode"
  ),
  "model code existe"
);

expect(
  regulatory.includes(
    "overridePrescriptionModelCode?:"
  ),
  "exception model code existe"
);

expect(
  provider.includes(
    '"medication_regulatory_exceptions"'
  ),
  "provider usa tabela correta"
);

expect(
  !provider.includes(
    '"medication_regulatory_rule_exceptions"'
  ),
  "nome antigo eliminado"
);

expect(
  !provider.includes(
    "type MedicationRegulatoryPrescriptionModelCode,"
  ),
  "import type não possui modifier duplicado"
);

expect(
  provider.includes(
    "prescription_model_code"
  ),
  "provider lê prescription_model_code"
);

expect(
  validator.includes(
    "suggestedValue:\n        expectedType"
  ),
  "validator sugere correção"
);

expect(
  migration.includes(
    "add column if not exists prescription_model_code"
  ),
  "migration prepara regras"
);

console.log(
  "\n✅ FOUNDATION V3 VALIDADA."
);
