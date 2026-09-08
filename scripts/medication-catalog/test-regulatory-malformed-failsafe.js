// scripts/medication-catalog/test-regulatory-malformed-failsafe.js

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const types =
  fs.readFileSync(
    path.join(
      ROOT,
      "lib/medication-intelligence/types.ts"
    ),
    "utf8"
  );

const provider =
  fs.readFileSync(
    path.join(
      ROOT,
      "lib/medication-catalog/supabase-provider.ts"
    ),
    "utf8"
  );

const validator =
  fs.readFileSync(
    path.join(
      ROOT,
      "lib/medication-intelligence/validate.ts"
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
  "🧠 VAULT — MALFORMED REGULATORY FAIL-SAFE v2\n"
);

expect(
  count(
    types,
    "hasMalformedExceptions?:"
  ) === 1,
  "contrato de qualidade existe uma vez"
);

expect(
  count(
    provider,
    "const malformedExceptionRuleIds ="
  ) === 2,
  "produto e substância possuem rastreador próprio"
);

expect(
  count(
    provider,
    "malformedExceptionRuleIds.add("
  ) === 2,
  "ambas as hidratações preservam falha de parsing"
);

expect(
  count(
    provider,
    "hasMalformedExceptions:"
  ) === 2,
  "ambas as regras hidratadas expõem o sinal"
);

expect(
  count(
    validator,
    "const hasMalformedExceptionData ="
  ) === 1,
  "validator possui um único gate fail-safe"
);

expect(
  validator.includes(
    "rule.hasMalformedExceptions ==="
  ),
  "validator consulta o sinal"
);

expect(
  validator.includes(
    "if (\n    hasMalformedExceptionData\n  ) {\n    return [];\n  }"
  ),
  "dado estruturalmente incerto não gera mismatch"
);

console.log(
  "\n✅ FAIL-SAFE REGULATÓRIO v2 VALIDADO."
);

console.log(
  "🚫 Self-test não acessa Supabase."
);
