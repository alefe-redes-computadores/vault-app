// scripts/test-regulatory-table-fix-v4.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(
    path.join(ROOT, file),
    "utf8"
  );
}

function expect(condition, label) {
  if (!condition) {
    throw new Error("Falhou: " + label);
  }

  console.log("✅ " + label);
}

const provider = read(
  "lib/medication-catalog/supabase-provider.ts"
);

const migration = read(
  "supabase/migrations/20260908_expand_medication_regulatory_models.sql"
);

console.log(
  "\n🏥 REGULATORY TABLE FIX V4\n"
);

expect(
  provider.includes(
    '"medication_regulatory_rule_exceptions"'
  ),
  "provider usa tabela real"
);

expect(
  !provider.includes(
    '"medication_regulatory_exceptions"'
  ),
  "provider não usa tabela inexistente"
);

expect(
  migration.includes(
    "public.medication_regulatory_rule_exceptions"
  ),
  "migration usa tabela real"
);

expect(
  !migration.includes(
    "public.medication_regulatory_exceptions"
  ),
  "migration não usa tabela inexistente"
);

expect(
  migration.includes(
    "add column if not exists prescription_model_code text"
  ),
  "campo estruturado das regras preservado"
);

expect(
  migration.includes(
    "add column if not exists override_prescription_model_code text"
  ),
  "campo estruturado das exceções preservado"
);

console.log(
  "\n✅ REGULATORY TABLE FIX V4 VALIDADO."
);
