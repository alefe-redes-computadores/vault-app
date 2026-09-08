// scripts/medication-catalog/test-regulatory-provider-contract.js

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const FILE =
  path.join(
    ROOT,
    "lib/medication-catalog/supabase-provider.ts"
  );

const source =
  fs.readFileSync(
    FILE,
    "utf8"
  );

function assertIncludes(
  token,
  label
) {
  if (
    !source.includes(
      token
    )
  ) {
    throw new Error(
      label +
        ": token ausente: " +
        token
    );
  }

  console.log(
    "✅ " +
      label
  );
}

console.log(
  "🧠 VAULT — REGULATORY PROVIDER CONTRACT SELF-TEST\n"
);

assertIncludes(
  "condition_schema_version",
  "schema version regulatório"
);

assertIncludes(
  "schemaVersion !==",
  "schema desconhecido é rejeitado"
);

assertIncludes(
  "parseRegulatoryCondition",
  "conditions possuem validação runtime"
);

assertIncludes(
  '"42P01"',
  "Postgres undefined_table reconhecido"
);

assertIncludes(
  '"PGRST205"',
  "PostgREST schema-cache reconhecido"
);

assertIncludes(
  "medication_regulatory_rule_exceptions",
  "tabela de exceções ligada ao provider"
);

assertIncludes(
  "exceptionsByRuleId",
  "exceções vinculadas por rule id"
);

assertIncludes(
  "exception.source_version_id",
  "fonte própria da exceção hidratada"
);

assertIncludes(
  "regulatoryClass:",
  "classe regulatória preservada"
);

assertIncludes(
  "prescriptionModel:",
  "modelo regulatório preservado"
);

assertIncludes(
  "vaultPrescriptionType:",
  "tipo visual do Vault preservado"
);

console.log(
  "\n✅ CONTRATO DO PROVIDER VALIDADO."
);

console.log(
  "🚫 Self-test não acessa Supabase."
);
