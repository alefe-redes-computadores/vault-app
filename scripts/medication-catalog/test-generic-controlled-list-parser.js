// scripts/medication-catalog/test-generic-controlled-list-parser.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const file =
  fs.readFileSync(
    path.join(
      ROOT,
      "scripts/medication-catalog/parse-controlled-lists.py"
    ),
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

function standalone(
  name
) {
  return new RegExp(
    "(?<![A-Za-z0-9_])" +
    name +
    "(?![A-Za-z0-9_])"
  ).test(file);
}

console.log(
  "🧠 VAULT — GENERIC CONTROLLED LIST PARSER v1\n"
);

expect(
  file.includes(
    "def parse_probe("
  ),
  "parser suporta probes parametrizadas"
);

expect(
  file.includes(
    "def parse_args()"
  ),
  "CLI disponível"
);

expect(
  file.includes(
    "def resolve_config()"
  ),
  "configuração centralizada"
);

expect(
  file.includes(
    "DEFAULT_UPDATE = 96"
  ),
  "default continua update 96"
);

expect(
  file.includes(
    'DEFAULT_RESOLUTION = "RDC 985/2025"'
  ),
  "default continua RDC 985/2025"
);

expect(
  file.includes(
    '"mode": "snapshot_default"'
  ),
  "modo default explícito"
);

expect(
  file.includes(
    '"mode": "custom_snapshot"'
  ),
  "modo customizado explícito"
);

expect(
  !standalone(
    "SOURCE_FILE"
  ),
  "SOURCE_FILE legado removido"
);

expect(
  !standalone(
    "JSON_FILE"
  ),
  "JSON_FILE legado removido"
);

expect(
  !standalone(
    "SUMMARY_FILE"
  ),
  "SUMMARY_FILE legado removido"
);

expect(
  !standalone(
    "EXPECTED_PROBES"
  ),
  "EXPECTED_PROBES legado removido"
);

expect(
  !file.includes(
    "create_client("
  ),
  "parser continua sem Supabase"
);

console.log(
  "\n✅ PARSER GENÉRICO VALIDADO."
);
