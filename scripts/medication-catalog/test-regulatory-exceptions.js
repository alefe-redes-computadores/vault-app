// scripts/medication-catalog/test-regulatory-exceptions.js

"use strict";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const FILE =
  path.join(
    ROOT,
    "lib/medication-catalog/regulatory-exceptions.ts"
  );

function assert(
  condition,
  message
) {
  if (
    !condition
  ) {
    throw new Error(
      message
    );
  }
}

function loadTsModule(
  filename
) {
  const source =
    fs.readFileSync(
      filename,
      "utf8"
    );

  const transpiled =
    ts.transpileModule(
      source,
      {
        compilerOptions: {
          module:
            ts.ModuleKind.CommonJS,

          target:
            ts.ScriptTarget.ES2020,

          esModuleInterop:
            true,
        },

        fileName:
          filename,
      }
    ).outputText;

  const instance =
    new Module(
      filename,
      module
    );

  instance.filename =
    filename;

  instance.paths =
    Module._nodeModulePaths(
      path.dirname(
        filename
      )
    );

  /*
   * regulatory-exceptions.ts possui um import runtime de
   * ./regulatory. Para o self-test, fornecemos somente a
   * função temporal necessária.
   */
  const originalRequire =
    instance.require.bind(
      instance
    );

  instance.require =
    function customRequire(
      request
    ) {
      if (
        request ===
        "./regulatory"
      ) {
        return {
          isMedicationRegulatoryRuleActive(
            rule,
            at =
              new Date()
          ) {
            const timestamp =
              at.getTime();

            if (
              rule.effectiveFrom
            ) {
              const from =
                new Date(
                  rule.effectiveFrom
                ).getTime();

              if (
                Number.isFinite(
                  from
                ) &&
                timestamp <
                  from
              ) {
                return false;
              }
            }

            if (
              rule.effectiveUntil
            ) {
              const until =
                new Date(
                  rule.effectiveUntil
                ).getTime();

              if (
                Number.isFinite(
                  until
                ) &&
                timestamp >
                  until
              ) {
                return false;
              }
            }

            return true;
          },
        };
      }

      return originalRequire(
        request
      );
    };

  instance._compile(
    transpiled,
    filename
  );

  return instance.exports;
}

const {
  evaluateMedicationRegulatoryException,
  resolveMedicationRegulatoryPrescription,
} =
  loadTsModule(
    FILE
  );

const exception = {
  id:
    "cannabis-thc-lte-02",

  label:
    "Produto de Cannabis com THC até 0,2%",

  conditions: [
    {
      kind:
        "ingredient_concentration",

      ingredient:
        "THC",

      operator:
        "lte",

      value:
        0.2,

      unit:
        "percent",
    },
  ],

  overrideVaultPrescriptionType:
    "branca",

  overridePrescriptionModel:
    "Receita de Controle Especial",

  effectiveFrom:
    "2026-05-11",

  sourceId:
    "anvisa-voto-97-2026",

  verifiedAt:
    "2026-09-07T00:00:00.000Z",
};

console.log(
  "🧠 VAULT — REGULATORY EXCEPTION SELF-TEST\n"
);

const applicable =
  evaluateMedicationRegulatoryException(
    exception,
    {
      ingredientConcentrations: [
        {
          ingredient:
            "THC",

          value:
            0.2,

          unit:
            "percent",
        },
      ],
    },
    new Date(
      "2026-09-07T12:00:00"
    )
  );

assert(
  applicable.applicability ===
    "applicable",
  "THC 0,2% deveria aplicar exceção lte 0,2%."
);

console.log(
  "✅ THC 0,2% → applicable"
);

const below =
  evaluateMedicationRegulatoryException(
    exception,
    {
      ingredientConcentrations: [
        {
          ingredient:
            "tetrahidrocanabinol",

          value:
            0.1,

          unit:
            "percent",
        },
      ],
    },
    new Date(
      "2026-09-07T12:00:00"
    )
  );

/*
 * Ingrediente diferente NÃO deve ser presumido sinônimo.
 */
assert(
  below.applicability ===
    "unknown",
  "Sinônimo não cadastrado não deve ser inferido automaticamente."
);

console.log(
  "✅ ingrediente diferente → unknown"
);

const notApplicable =
  evaluateMedicationRegulatoryException(
    exception,
    {
      ingredientConcentrations: [
        {
          ingredient:
            "THC",

          value:
            0.3,

          unit:
            "percent",
        },
      ],
    },
    new Date(
      "2026-09-07T12:00:00"
    )
  );

assert(
  notApplicable.applicability ===
    "not_applicable",
  "THC 0,3% não deveria satisfazer lte 0,2%."
);

console.log(
  "✅ THC 0,3% → not_applicable"
);

const missing =
  evaluateMedicationRegulatoryException(
    exception,
    {},
    new Date(
      "2026-09-07T12:00:00"
    )
  );

assert(
  missing.applicability ===
    "unknown",
  "Ausência de concentração deveria produzir unknown."
);

console.log(
  "✅ concentração ausente → unknown"
);

const wrongUnit =
  evaluateMedicationRegulatoryException(
    exception,
    {
      ingredientConcentrations: [
        {
          ingredient:
            "THC",

          value:
            2,

          unit:
            "mg_ml",
        },
      ],
    },
    new Date(
      "2026-09-07T12:00:00"
    )
  );

assert(
  wrongUnit.applicability ===
    "unknown",
  "Unidade incompatível não pode ser convertida automaticamente."
);

console.log(
  "✅ unidade incompatível → unknown"
);

const historical =
  evaluateMedicationRegulatoryException(
    exception,
    {
      ingredientConcentrations: [
        {
          ingredient:
            "THC",

          value:
            0.1,

          unit:
            "percent",
        },
      ],
    },
    new Date(
      "2026-04-01T12:00:00"
    )
  );

assert(
  historical.applicability ===
    "not_applicable",
  "Exceção não deveria valer antes de effectiveFrom."
);

console.log(
  "✅ antes da vigência → not_applicable"
);

const multiCondition = {
  ...exception,

  id:
    "multi-condition",

  conditions: [
    {
      kind:
        "ingredient_concentration",

      ingredient:
        "THC",

      operator:
        "lte",

      value:
        0.2,

      unit:
        "percent",
    },

    {
      kind:
        "pharmaceutical_form",

      operator:
        "eq",

      value:
        "solução oral",
    },
  ],
};

const partialUnknown =
  evaluateMedicationRegulatoryException(
    multiCondition,
    {
      ingredientConcentrations: [
        {
          ingredient:
            "THC",

          value:
            0.1,

          unit:
            "percent",
        },
      ],
    },
    new Date(
      "2026-09-07T12:00:00"
    )
  );

assert(
  partialUnknown.applicability ===
    "unknown",
  "Uma condição aplicável + outra desconhecida deve resultar unknown."
);

console.log(
  "✅ condição parcial → unknown"
);

const falseWins =
  evaluateMedicationRegulatoryException(
    multiCondition,
    {
      pharmaceuticalForm:
        "cápsula",

      ingredientConcentrations: [],
    },
    new Date(
      "2026-09-07T12:00:00"
    )
  );

assert(
  falseWins.applicability ===
    "not_applicable",
  "Condição comprovadamente falsa deve tornar a exceção não aplicável."
);

console.log(
  "✅ false + unknown → not_applicable"
);

console.log(
  "\n🧠 TESTANDO RESOLUÇÃO REGRA-BASE + EXCEÇÕES\n"
);

const baseRule = {
  baseVaultPrescriptionType:
    "amarela",

  basePrescriptionModel:
    "Notificação de Receita A",
};

const resolvedBase =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions: [
        exception,
      ],

      context: {
        ingredientConcentrations: [
          {
            ingredient:
              "THC",

            value:
              0.3,

            unit:
              "percent",
          },
        ],
      },

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  resolvedBase.status ===
    "resolved",
  "THC 0,3% deveria manter regra-base."
);

assert(
  resolvedBase.vaultPrescriptionType ===
    "amarela",
  "Regra-base deveria permanecer amarela."
);

console.log(
  "✅ exceção não aplicável → resolved / regra-base"
);

const resolvedOverride =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions: [
        exception,
      ],

      context: {
        ingredientConcentrations: [
          {
            ingredient:
              "THC",

            value:
              0.2,

            unit:
              "percent",
          },
        ],
      },

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  resolvedOverride.status ===
    "override_applied",
  "THC 0,2% deveria aplicar override."
);

assert(
  resolvedOverride.vaultPrescriptionType ===
    "branca",
  "Override deveria resultar branca."
);

console.log(
  "✅ exceção aplicável → override_applied"
);

const unresolvedContext =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions: [
        exception,
      ],

      context:
        {},

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  unresolvedContext.status ===
    "insufficient_context",
  "Concentração ausente deveria bloquear fallback."
);

assert(
  !unresolvedContext.vaultPrescriptionType,
  "insufficient_context não deve retornar tipo resolvido."
);

console.log(
  "✅ contexto ausente → insufficient_context"
);

const conflictingException = {
  ...exception,

  id:
    "conflicting-test-rule",

  label:
    "Regra conflitante de teste",

  overrideVaultPrescriptionType:
    "azul",

  overridePrescriptionModel:
    "Notificação de Receita B",
};

const conflict =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions: [
        exception,
        conflictingException,
      ],

      context: {
        ingredientConcentrations: [
          {
            ingredient:
              "THC",

            value:
              0.2,

            unit:
              "percent",
          },
        ],
      },

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  conflict.status ===
    "conflict",
  "Overrides diferentes deveriam produzir conflict."
);

assert(
  !conflict.vaultPrescriptionType,
  "Conflict não deve escolher tipo."
);

console.log(
  "✅ overrides divergentes → conflict"
);

const sameOverrideException = {
  ...exception,

  id:
    "same-result-test-rule",

  label:
    "Segunda evidência com mesmo resultado",
};

const sameOverride =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions: [
        exception,
        sameOverrideException,
      ],

      context: {
        ingredientConcentrations: [
          {
            ingredient:
              "THC",

            value:
              0.2,

            unit:
              "percent",
          },
        ],
      },

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  sameOverride.status ===
    "override_applied",
  "Mesmo override não deve gerar conflito."
);

assert(
  sameOverride.appliedExceptionIds.length ===
    2,
  "Ambas as exceções deveriam ser preservadas."
);

console.log(
  "✅ múltiplas exceções com mesmo resultado → override_applied"
);

const unknownSecondException = {
  ...exception,

  id:
    "requires-form",

  label:
    "Exceção dependente da forma",

  conditions: [
    {
      kind:
        "pharmaceutical_form",

      operator:
        "eq",

      value:
        "solução oral",
    },
  ],

  overrideVaultPrescriptionType:
    "branca",

  overridePrescriptionModel:
    "Receita de Controle Especial",
};

const applicablePlusUnknown =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions: [
        exception,
        unknownSecondException,
      ],

      context: {
        ingredientConcentrations: [
          {
            ingredient:
              "THC",

            value:
              0.2,

            unit:
              "percent",
          },
        ],
      },

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  applicablePlusUnknown.status ===
    "insufficient_context",
  "Aplicável + unknown deve permanecer conservador."
);

console.log(
  "✅ applicable + unknown → insufficient_context"
);

const noExceptions =
  resolveMedicationRegulatoryPrescription(
    {
      ...baseRule,

      exceptions:
        [],

      context:
        {},

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  noExceptions.status ===
    "resolved",
  "Regra-base sem exceções deveria resolver."
);

assert(
  noExceptions.vaultPrescriptionType ===
    "amarela",
  "Tipo-base deveria ser preservado."
);

console.log(
  "✅ sem exceções → resolved"
);

const noBase =
  resolveMedicationRegulatoryPrescription(
    {
      exceptions:
        [],

      context:
        {},

      at:
        new Date(
          "2026-09-07T12:00:00"
        ),
    }
  );

assert(
  noBase.status ===
    "insufficient_context",
  "Sem regra-base deveria retornar insufficient_context."
);

console.log(
  "✅ sem regra-base → insufficient_context"
);

console.log(
  "\n✅ TODOS OS TESTES DO CONTRATO + RESOLUÇÃO PASSARAM."
);

console.log(
  "🚫 Nenhuma conexão com Supabase."
);
