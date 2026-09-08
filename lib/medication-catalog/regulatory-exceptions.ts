// lib/medication-catalog/regulatory-exceptions.ts

import type {
  MedicationRegulatoryApplicability,
  MedicationRegulatoryCondition,
  MedicationRegulatoryConditionEvaluation,
  MedicationRegulatoryEvaluationContext,
  MedicationRegulatoryException,
  MedicationRegulatoryExceptionEvaluation,
  MedicationRegulatoryNumericOperator,
  MedicationRegulatoryResolution,
  MedicationRegulatoryTextOperator,
} from "./regulatory";

import {
  isMedicationRegulatoryRuleActive,
} from "./regulatory";

function normalizeText(
  value:
    string
): string {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

function evaluateNumeric(
  actual:
    number,
  operator:
    MedicationRegulatoryNumericOperator,
  expected:
    number
): boolean {
  switch (
    operator
  ) {
    case "eq":
      return (
        actual ===
        expected
      );

    case "lt":
      return (
        actual <
        expected
      );

    case "lte":
      return (
        actual <=
        expected
      );

    case "gt":
      return (
        actual >
        expected
      );

    case "gte":
      return (
        actual >=
        expected
      );
  }
}

function evaluateText(
  actual:
    string,
  operator:
    MedicationRegulatoryTextOperator,
  expected:
    string | string[]
): boolean {
  const normalizedActual =
    normalizeText(
      actual
    );

  const values =
    (
      Array.isArray(
        expected
      )
        ? expected
        : [
            expected,
          ]
    ).map(
      normalizeText
    );

  if (
    operator ===
    "eq"
  ) {
    return (
      values.length ===
        1 &&
      normalizedActual ===
        values[0]
    );
  }

  return values.includes(
    normalizedActual
  );
}

function result(
  condition:
    MedicationRegulatoryCondition,
  applicability:
    MedicationRegulatoryApplicability,
  evidence?:
    string,
  missingFact?:
    string
): MedicationRegulatoryConditionEvaluation {
  return {
    condition,
    applicability,
    evidence,
    missingFact,
  };
}

export function evaluateMedicationRegulatoryCondition(
  condition:
    MedicationRegulatoryCondition,
  context:
    MedicationRegulatoryEvaluationContext
): MedicationRegulatoryConditionEvaluation {
  switch (
    condition.kind
  ) {
    case "ingredient_concentration": {
      const facts =
        context
          .ingredientConcentrations ??
        [];

      const normalizedIngredient =
        normalizeText(
          condition.ingredient
        );

      const sameIngredient =
        facts.filter(
          (
            fact
          ) =>
            normalizeText(
              fact.ingredient
            ) ===
            normalizedIngredient
        );

      if (
        sameIngredient.length ===
        0
      ) {
        return result(
          condition,
          "unknown",
          undefined,
          `Concentração de ${condition.ingredient} não disponível.`
        );
      }

      const sameUnit =
        sameIngredient.filter(
          (
            fact
          ) =>
            fact.unit ===
            condition.unit
        );

      if (
        sameUnit.length ===
        0
      ) {
        return result(
          condition,
          "unknown",
          undefined,
          `Concentração encontrada para ${condition.ingredient}, mas em unidade diferente de ${condition.unit}.`
        );
      }

      /*
       * Mais de uma concentração diferente para o mesmo
       * ingrediente/unidade torna o contexto ambíguo.
       */
      const uniqueValues =
        Array.from(
          new Set(
            sameUnit.map(
              (
                fact
              ) =>
                fact.value
            )
          )
        );

      if (
        uniqueValues.length !==
        1
      ) {
        return result(
          condition,
          "unknown",
          undefined,
          `Mais de uma concentração de ${condition.ingredient} foi fornecida para a mesma unidade.`
        );
      }

      const actual =
        uniqueValues[0];

      const matches =
        evaluateNumeric(
          actual,
          condition.operator,
          condition.value
        );

      return result(
        condition,
        matches
          ? "applicable"
          : "not_applicable",
        `${condition.ingredient}: ${actual} ${condition.unit}; condição ${condition.operator} ${condition.value} ${condition.unit}.`
      );
    }

    case "pharmaceutical_form": {
      if (
        !context
          .pharmaceuticalForm
      ) {
        return result(
          condition,
          "unknown",
          undefined,
          "Forma farmacêutica não disponível."
        );
      }

      const matches =
        evaluateText(
          context.pharmaceuticalForm,
          condition.operator,
          condition.value
        );

      return result(
        condition,
        matches
          ? "applicable"
          : "not_applicable",
        `Forma farmacêutica: ${context.pharmaceuticalForm}.`
      );
    }

    case "product_id": {
      if (
        !context.productId
      ) {
        return result(
          condition,
          "unknown",
          undefined,
          "Produto regulatório não identificado."
        );
      }

      const matches =
        evaluateText(
          context.productId,
          condition.operator,
          condition.value
        );

      return result(
        condition,
        matches
          ? "applicable"
          : "not_applicable",
        `Produto regulatório: ${context.productId}.`
      );
    }

    case "registration_number": {
      if (
        !context
          .registrationNumber
      ) {
        return result(
          condition,
          "unknown",
          undefined,
          "Número de registro regulatório não disponível."
        );
      }

      const matches =
        evaluateText(
          context.registrationNumber,
          condition.operator,
          condition.value
        );

      return result(
        condition,
        matches
          ? "applicable"
          : "not_applicable",
        `Registro regulatório: ${context.registrationNumber}.`
      );
    }
  }
}

export function evaluateMedicationRegulatoryException(
  exception:
    MedicationRegulatoryException,
  context:
    MedicationRegulatoryEvaluationContext,
  at:
    Date =
      new Date()
): MedicationRegulatoryExceptionEvaluation {
  if (
    !isMedicationRegulatoryRuleActive(
      exception,
      at
    )
  ) {
    return {
      exception,

      applicability:
        "not_applicable",

      conditionEvaluations:
        [],
    };
  }

  if (
    exception.conditions.length ===
    0
  ) {
    return {
      exception,

      applicability:
        "unknown",

      conditionEvaluations:
        [],
    };
  }

  const conditionEvaluations =
    exception.conditions.map(
      (
        condition
      ) =>
        evaluateMedicationRegulatoryCondition(
          condition,
          context
        )
    );

  if (
    conditionEvaluations.some(
      (
        evaluation
      ) =>
        evaluation.applicability ===
        "not_applicable"
    )
  ) {
    return {
      exception,

      applicability:
        "not_applicable",

      conditionEvaluations,
    };
  }

  if (
    conditionEvaluations.some(
      (
        evaluation
      ) =>
        evaluation.applicability ===
        "unknown"
    )
  ) {
    return {
      exception,

      applicability:
        "unknown",

      conditionEvaluations,
    };
  }

  return {
    exception,

    applicability:
      "applicable",

    conditionEvaluations,
  };
}

export function evaluateMedicationRegulatoryExceptions(
  exceptions:
    MedicationRegulatoryException[],
  context:
    MedicationRegulatoryEvaluationContext,
  at:
    Date =
      new Date()
): MedicationRegulatoryExceptionEvaluation[] {
  return exceptions.map(
    (
      exception
    ) =>
      evaluateMedicationRegulatoryException(
        exception,
        context,
        at
      )
  );
}


export type ResolveMedicationRegulatoryPrescriptionInput = {
  baseVaultPrescriptionType?:
    import("@/lib/types").TipoReceita;

  basePrescriptionModel?:
    string;

  exceptions:
    MedicationRegulatoryException[];

  context:
    MedicationRegulatoryEvaluationContext;

  at?:
    Date;
};

export function resolveMedicationRegulatoryPrescription(
  input:
    ResolveMedicationRegulatoryPrescriptionInput
): MedicationRegulatoryResolution {
  const at =
    input.at ??
    new Date();

  const evaluations =
    evaluateMedicationRegulatoryExceptions(
      input.exceptions,
      input.context,
      at
    );

  const applicable =
    evaluations.filter(
      (
        evaluation
      ) =>
        evaluation.applicability ===
        "applicable"
    );

  const unknown =
    evaluations.filter(
      (
        evaluation
      ) =>
        evaluation.applicability ===
        "unknown"
    );

  if (
    applicable.length >
    0
  ) {
    const overrideKeys =
      new Map<
        string,
        {
          vaultPrescriptionType?:
            import("@/lib/types").TipoReceita;

          prescriptionModel?:
            string;

          exceptionIds:
            string[];
        }
      >();

    for (
      const evaluation of
        applicable
    ) {
      const exception =
        evaluation.exception;

      const type =
        exception
          .overrideVaultPrescriptionType;

      const model =
        exception
          .overridePrescriptionModel;

      if (
        !type &&
        !model
      ) {
        return {
          status:
            "insufficient_context",

          baseVaultPrescriptionType:
            input.baseVaultPrescriptionType,

          basePrescriptionModel:
            input.basePrescriptionModel,

          exceptionEvaluations:
            evaluations,

          appliedExceptionIds:
            [],

          evidence: [
            `A exceção ${exception.label} é aplicável, mas não possui resultado regulatório estruturado.`,
          ],

          missingFacts: [
            `Resultado regulatório da exceção ${exception.id}.`,
          ],
        };
      }

      const key =
        JSON.stringify(
          [
            type ??
              null,
            model ??
              null,
          ]
        );

      const current =
        overrideKeys.get(
          key
        );

      if (
        current
      ) {
        current.exceptionIds.push(
          exception.id
        );
      } else {
        overrideKeys.set(
          key,
          {
            vaultPrescriptionType:
              type,

            prescriptionModel:
              model,

            exceptionIds: [
              exception.id,
            ],
          }
        );
      }
    }

    if (
      overrideKeys.size >
      1
    ) {
      return {
        status:
          "conflict",

        baseVaultPrescriptionType:
          input.baseVaultPrescriptionType,

        basePrescriptionModel:
          input.basePrescriptionModel,

        exceptionEvaluations:
          evaluations,

        appliedExceptionIds:
          [],

        evidence: [
          "Mais de uma exceção regulatória aplicável produz resultados diferentes.",

          ...applicable.map(
            (
              evaluation
            ) => {
              const exception =
                evaluation.exception;

              return (
                exception.label +
                ": " +
                (
                  exception
                    .overrideVaultPrescriptionType ??
                  "tipo não informado"
                ) +
                (
                  exception
                    .overridePrescriptionModel
                    ? ` / ${exception.overridePrescriptionModel}`
                    : ""
                )
              );
            }
          ),
        ],

        missingFacts:
          [],
      };
    }

    const resolvedOverride =
      Array.from(
        overrideKeys.values()
      )[0];

    if (
      unknown.length >
      0
    ) {
      const missingFacts =
        Array.from(
          new Set(
            unknown.flatMap(
              (
                evaluation
              ) =>
                evaluation
                  .conditionEvaluations
                  .map(
                    (
                      condition
                    ) =>
                      condition.missingFact
                  )
                  .filter(
                    (
                      fact
                    ): fact is string =>
                      Boolean(
                        fact
                      )
                  )
            )
          )
        );

      return {
        status:
          "insufficient_context",

        baseVaultPrescriptionType:
          input.baseVaultPrescriptionType,

        basePrescriptionModel:
          input.basePrescriptionModel,

        exceptionEvaluations:
          evaluations,

        appliedExceptionIds:
          [],

        evidence: [
          "Existe ao menos uma exceção aplicável, mas outra exceção ativa não pôde ser avaliada com segurança.",
        ],

        missingFacts,
      };
    }

    return {
      status:
        "override_applied",

      vaultPrescriptionType:
        resolvedOverride
          .vaultPrescriptionType,

      prescriptionModel:
        resolvedOverride
          .prescriptionModel,

      baseVaultPrescriptionType:
        input.baseVaultPrescriptionType,

      basePrescriptionModel:
        input.basePrescriptionModel,

      exceptionEvaluations:
        evaluations,

      appliedExceptionIds:
        resolvedOverride
          .exceptionIds,

      evidence: [
        ...applicable.map(
          (
            evaluation
          ) =>
            `Exceção aplicável: ${evaluation.exception.label}.`
        ),

        ...applicable.flatMap(
          (
            evaluation
          ) =>
            evaluation
              .conditionEvaluations
              .map(
                (
                  condition
                ) =>
                  condition.evidence
              )
              .filter(
                (
                  evidence
                ): evidence is string =>
                  Boolean(
                    evidence
                  )
              )
        ),
      ],

      missingFacts:
        [],
    };
  }

  if (
    unknown.length >
    0
  ) {
    const missingFacts =
      Array.from(
        new Set(
          unknown.flatMap(
            (
              evaluation
            ) =>
              evaluation
                .conditionEvaluations
                .map(
                  (
                    condition
                  ) =>
                    condition.missingFact
                )
                .filter(
                  (
                    fact
                  ): fact is string =>
                    Boolean(
                      fact
                    )
                )
          )
        )
      );

    return {
      status:
        "insufficient_context",

      baseVaultPrescriptionType:
        input.baseVaultPrescriptionType,

      basePrescriptionModel:
        input.basePrescriptionModel,

      exceptionEvaluations:
        evaluations,

      appliedExceptionIds:
        [],

      evidence: [
        "Existe exceção regulatória ativa que não pôde ser avaliada com os dados disponíveis.",
      ],

      missingFacts,
    };
  }

  if (
    input.baseVaultPrescriptionType ||
    input.basePrescriptionModel
  ) {
    return {
      status:
        "resolved",

      vaultPrescriptionType:
        input.baseVaultPrescriptionType,

      prescriptionModel:
        input.basePrescriptionModel,

      baseVaultPrescriptionType:
        input.baseVaultPrescriptionType,

      basePrescriptionModel:
        input.basePrescriptionModel,

      exceptionEvaluations:
        evaluations,

      appliedExceptionIds:
        [],

      evidence: [
        input.exceptions.length ===
        0
          ? "Nenhuma exceção regulatória foi informada; regra-base utilizada."
          : "Todas as exceções regulatórias foram consideradas não aplicáveis; regra-base utilizada.",
      ],

      missingFacts:
        [],
    };
  }

  return {
    status:
      "insufficient_context",

    exceptionEvaluations:
      evaluations,

    appliedExceptionIds:
      [],

    evidence: [
      "Nenhuma regra-base ou exceção aplicável forneceu resultado regulatório suficiente.",
    ],

    missingFacts: [
      "Regra-base regulatória.",
    ],
  };
}
