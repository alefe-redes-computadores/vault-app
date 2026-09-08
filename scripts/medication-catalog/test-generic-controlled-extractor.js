// scripts/medication-catalog/test-generic-controlled-extractor.js
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const source =
  fs.readFileSync(
    path.join(
      ROOT,
      "scripts/medication-catalog/extract-controlled-pdf.py"
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
  ).test(source);
}

console.log(
  "🧠 VAULT — GENERIC CONTROLLED PDF EXTRACTOR v3\n"
);

expect(
  source.includes(
    "def parse_args()"
  ),
  "argumentos disponíveis"
);

expect(
  source.includes(
    "def resolve_config()"
  ),
  "configuração centralizada"
);

expect(
  source.includes(
    "DEFAULT_UPDATE = 96"
  ),
  "default preserva update 96"
);

expect(
  source.includes(
    '"mode": "snapshot_default"'
  ),
  "modo legado explícito"
);

expect(
  source.includes(
    '"mode": "custom_verified_pdf"'
  ),
  "modo customizado explícito"
);

expect(
  source.includes(
    "actual_hash.lower() != expected_hash.lower()"
  ),
  "SHA obrigatório"
);

expect(
  source.includes(
    '"outputText": str(\n            text_file'
  ),
  "relatório referencia TXT parametrizado"
);

expect(
  !standalone("PDF_FILE"),
  "PDF_FILE legado removido"
);

expect(
  !standalone("TEXT_FILE"),
  "TEXT_FILE legado removido"
);

expect(
  !standalone("REPORT_FILE"),
  "REPORT_FILE legado removido"
);

expect(
  !source.includes(
    "create_client("
  ),
  "sem cliente Supabase"
);

console.log(
  "\n✅ EXTRACTOR GENÉRICO v3 VALIDADO."
);
