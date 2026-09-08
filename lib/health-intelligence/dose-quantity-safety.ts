// lib/health-intelligence/dose-quantity-safety.ts

export type DoseQuantitySafetyLevel =
  | "normal"
  | "review"
  | "high";

export type DoseQuantityBaselineSource =
  | "configured"
  | "history"
  | "configured_and_history";

export interface DoseQuantitySafetyInput {
  quantity:
    number;

  configuredQuantity?:
    number | null;

  historicalQuantities?:
    number[];

  unitLabel?:
    string;
}

export interface DoseQuantitySafetyAssessment {
  level:
    DoseQuantitySafetyLevel;

  quantity:
    number;

  baseline:
    number | null;

  baselineSource:
    DoseQuantityBaselineSource | null;

  ratio:
    number | null;

  suggestedQuantity:
    number | null;

  historicalSample:
    number;

  unitLabel:
    string;

  reason:
    string | null;
}

function isPositiveFinite(
  value:
    unknown
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >
      0
  );
}

function median(
  values:
    number[]
): number | null {
  const safe =
    values
      .filter(
        isPositiveFinite
      )
      .sort(
        (
          a,
          b
        ) =>
          a -
          b
      );

  if (
    safe.length ===
    0
  ) {
    return null;
  }

  const middle =
    Math.floor(
      safe.length /
        2
    );

  if (
    safe.length %
      2 ===
    1
  ) {
    return safe[
      middle
    ];
  }

  return (
    safe[
      middle -
        1
    ] +
    safe[
      middle
    ]
  ) /
    2;
}

function roundQuantity(
  value:
    number
): number {
  return Number(
    value.toFixed(
      3
    )
  );
}

/**
 * Proteção contra possível erro de digitação.
 *
 * IMPORTANTE:
 *
 * isto NÃO calcula:
 *
 * - dose máxima;
 * - dose tóxica;
 * - dose letal;
 * - segurança clínica.
 *
 * A comparação é somente contra:
 *
 * - dose configurada;
 * - histórico da própria pessoa.
 */
export function assessDoseQuantitySafety({
  quantity,
  configuredQuantity,
  historicalQuantities = [],
  unitLabel = "unidade(s)",
}: DoseQuantitySafetyInput): DoseQuantitySafetyAssessment {
  const safeQuantity =
    Number(
      quantity
    );

  const history =
    historicalQuantities
      .filter(
        isPositiveFinite
      )
      .slice(
        -30
      );

  const historicalMedian =
    history.length >=
    3
      ? median(
          history
        )
      : null;

  const configured =
    isPositiveFinite(
      configuredQuantity
    )
      ? configuredQuantity
      : null;

  const baselines =
    [
      configured,
      historicalMedian,
    ].filter(
      isPositiveFinite
    );

  /*
   * Usamos a MAIOR referência existente para reduzir
   * falso positivo quando cadastro e histórico divergem.
   */
  const baseline =
    baselines.length >
    0
      ? Math.max(
          ...baselines
        )
      : null;

  const baselineSource:
    DoseQuantityBaselineSource | null =
    configured !==
      null &&
    historicalMedian !==
      null
      ? "configured_and_history"
      : configured !==
          null
        ? "configured"
        : historicalMedian !==
            null
          ? "history"
          : null;

  if (
    !isPositiveFinite(
      safeQuantity
    ) ||
    baseline ===
      null
  ) {
    return {
      level:
        "normal",

      quantity:
        safeQuantity,

      baseline,

      baselineSource,

      ratio:
        null,

      suggestedQuantity:
        baseline,

      historicalSample:
        history.length,

      unitLabel,

      reason:
        null,
    };
  }

  if (
    safeQuantity <=
    baseline
  ) {
    return {
      level:
        "normal",

      quantity:
        roundQuantity(
          safeQuantity
        ),

      baseline:
        roundQuantity(
          baseline
        ),

      baselineSource,

      ratio:
        Number(
          (
            safeQuantity /
            baseline
          ).toFixed(
            1
          )
        ),

      suggestedQuantity:
        roundQuantity(
          baseline
        ),

      historicalSample:
        history.length,

      unitLabel,

      reason:
        null,
    };
  }

  const ratio =
    safeQuantity /
    baseline;

  const difference =
    safeQuantity -
    baseline;

  /*
   * Estes limites são heurísticas de UX,
   * NÃO limites médicos.
   */
  const review =
    ratio >=
      3 &&
    difference >=
      Math.max(
        1,
        baseline
      );

  const high =
    ratio >=
      8 &&
    difference >=
      Math.max(
        4,
        baseline *
          4
      );

  const level:
    DoseQuantitySafetyLevel =
    high
      ? "high"
      : review
        ? "review"
        : "normal";

  return {
    level,

    quantity:
      roundQuantity(
        safeQuantity
      ),

    baseline:
      roundQuantity(
        baseline
      ),

    baselineSource,

    ratio:
      Number(
        ratio.toFixed(
          1
        )
      ),

    suggestedQuantity:
      roundQuantity(
        baseline
      ),

    historicalSample:
      history.length,

    unitLabel,

    reason:
      high
        ? "Quantidade extremamente acima das referências internas conhecidas."
        : review
          ? "Quantidade bastante acima das referências internas conhecidas."
          : null,
  };
}
