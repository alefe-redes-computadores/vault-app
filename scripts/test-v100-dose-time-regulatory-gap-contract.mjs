import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, label) => {
  if (!value) throw new Error(`V100: ${label}`);
  console.log(`OK: ${label}`);
};

const utils = read("lib/health-utils.ts");
const insights = read("lib/health-insights.ts");
const migration = read(
  "supabase/migrations/20261009_add_desvenlafaxina_regulatory_rule_v100.sql"
);

ok(
  utils.includes("export function parseRecordedDateTime") &&
    utils.includes("new Date(") &&
    !/parseRecordedDateTime[\s\S]{0,500}parseDateParts/.test(utils),
  "instantes preservam hora e fuso sem normalização para meia-noite"
);
ok(
  insights.includes("parseRecordedDateTime(") &&
    !/ultimaTomada[\s\S]{0,400}\? parseLocalDate\(/.test(insights),
  "resumo de medicamentos formata o instante real da tomada"
);
ok(
  /where substance\.canonical_name_normalized\s*=\s*\n?\s*'succinato de desvenlafaxina monoidratado'/.test(
    migration
  ) && migration.includes("'C1'") &&
    migration.includes("'receita_controle_especial'"),
  "Pristiq herda a regra C1 pela substância canônica"
);
ok(
  migration.includes("not exists") &&
    migration.includes("source_key = 'anvisa_controlled_substances'") &&
    !migration.includes("ddb40b70-f097-4462-9ae3-c694cc7905db"),
  "migração é idempotente, versionada e não depende do ID do produto"
);
ok(
  !migration.toLowerCase().includes("prometazina"),
  "Fenergan não recebe classificação regulatória sem fonte comprovada"
);

console.log("VAULT V100 DOSE TIME + REGULATORY GAP: CONTRACT OK");
