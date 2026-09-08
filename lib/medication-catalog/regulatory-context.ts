// lib/medication-catalog/regulatory-context.ts

import {
  normalizeMedicationText,
} from "@/lib/medication-intelligence/normalize";

import type {
  MedicationReference,
} from "@/lib/medication-intelligence/types";

import type {
  MedicationRegulatoryEvaluationContext,
} from "./regulatory";

export type BuildMedicationRegulatoryContextInput = {
  reference:
    MedicationReference;

  /**
   * Formato atualmente selecionado no cadastro.
   *
   * Esse valor nunca é promovido diretamente para contexto
   * regulatório. Ele serve apenas para tentar identificar uma
   * forma farmacêutica oficial já presente na referência.
   */
  selectedFormat?:
    string;
};

function uniqueNonEmptyStrings(
  values:
    Array<
      string | null | undefined
    >
): string[] {
  const map =
    new Map<
      string,
      string
    >();

  for (
    const rawValue of
      values
  ) {
    const value =
      rawValue?.trim();

    if (
      !value
    ) {
      continue;
    }

    const normalized =
      normalizeMedicationText(
        value
      );

    if (
      !normalized ||
      map.has(
        normalized
      )
    ) {
      continue;
    }

    map.set(
      normalized,
      value
    );
  }

  return Array.from(
    map.values()
  );
}

function resolvePharmaceuticalForm(
  reference:
    MedicationReference,
  selectedFormat?:
    string
): string | undefined {
  const officialForms =
    uniqueNonEmptyStrings([
      ...(
        reference
          .pharmaceuticalForms ??
        []
      ),

      ...(
        reference
          .presentations ??
        []
      ).map(
        (
          presentation
        ) =>
          presentation
            .pharmaceuticalForm
      ),
    ]);

  if (
    officialForms.length ===
    0
  ) {
    return undefined;
  }

  /*
   * Se a referência inteira possui uma única forma oficial,
   * ela é inequívoca independentemente do rótulo visual usado
   * pelo formulário do Vault.
   */
  if (
    officialForms.length ===
    1
  ) {
    return officialForms[0];
  }

  const normalizedSelected =
    selectedFormat
      ? normalizeMedicationText(
          selectedFormat
        )
      : "";

  if (
    !normalizedSelected
  ) {
    return undefined;
  }

  /*
   * Com múltiplas formas possíveis só aceitamos correspondência
   * textual exata após normalização.
   *
   * Não tratamos "comprimido" como automaticamente equivalente
   * a "comprimido revestido", por exemplo.
   */
  const exactMatches =
    officialForms.filter(
      (
        form
      ) =>
        normalizeMedicationText(
          form
        ) ===
        normalizedSelected
    );

  return exactMatches.length ===
    1
    ? exactMatches[0]
    : undefined;
}

/**
 * Constrói somente fatos regulatórios que a referência
 * hidratada realmente consegue provar.
 *
 * Não infere:
 * - productId a partir de uma referência de substância;
 * - número de registro a partir de identidade histórica;
 * - concentração do princípio ativo a partir de apresentação;
 * - conversões entre unidades.
 */
export function buildMedicationRegulatoryContext(
  input:
    BuildMedicationRegulatoryContextInput
): MedicationRegulatoryEvaluationContext {
  const {
    reference,
    selectedFormat,
  } =
    input;

  const context:
    MedicationRegulatoryEvaluationContext =
      {};

  const identity =
    reference
      .regulatoryIdentity;

  if (
    identity
      ?.referenceType ===
    "product"
  ) {
    context.productId =
      identity.productId;

    if (
      identity
        .registrationNumber
    ) {
      context.registrationNumber =
        identity.registrationNumber;
    }
  }

  const pharmaceuticalForm =
    resolvePharmaceuticalForm(
      reference,
      selectedFormat
    );

  if (
    pharmaceuticalForm
  ) {
    context.pharmaceuticalForm =
      pharmaceuticalForm;
  }

  /*
   * ingredientConcentrations permanece propositalmente ausente.
   *
   * MedicationPresentation contém valor/unidade, porém ainda
   * não identifica de forma explícita a qual ingrediente cada
   * concentração pertence. Em produtos combinados, inferir isso
   * seria especialmente inseguro.
   */

  return context;
}
