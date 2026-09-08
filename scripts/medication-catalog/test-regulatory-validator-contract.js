// scripts/medication-catalog/test-regulatory-validator-contract.js

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
    "lib/medication-intelligence/validate.ts"
  );

const source =
  fs.readFileSync(
    FILE,
    "utf8"
  );

function expect(
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
  "🧠 VAULT — REGULATORY VALIDATOR CONTRACT SELF-TEST\n"
);

expect(
  "resolveMedicationRegulatoryPrescription",
  "resolver regulatório conectado"
);

expect(
  '"insufficient_context"',
  "contexto insuficiente reconhecido"
);

expect(
  '"conflict"',
  "conflito regulatório reconhecido"
);

expect(
  "expected.length !==\n    1",
  "conclusões divergentes não viram alternativas"
);

expect(
  "input.regulatoryContext",
  "contexto regulatório encaminhado"
);

expect(
  "appliedExceptionIds",
  "exceções aplicadas preservadas"
);

expect(
  "exception.sourceId",
  "proveniência da exceção considerada"
);

expect(
  ".prescriptionTypes ??",
  "fallback legado preservado"
);

expect(
  "regulatoryRules.length ===",
  "fallback limitado à ausência de regras detalhadas"
);

console.log(
  "\n✅ CONTRATO DO VALIDATOR REGULATÓRIO VALIDADO."
);

console.log(
  "🚫 Self-test não acessa Supabase."
);
