// lib/medication-intelligence/validate.ts

import {
  findMedicationReference,
  LOCAL_MEDICATION_CATALOG,
} from "./catalog";

import {
  normalizeMedicationInput,
  normalizeMedicationText,
  normalizeMedicationUnit,
} from "./normalize";

import type {
  MedicationPresentation,
  MedicationReference,
  MedicationReferenceMatch,
  MedicationValidationInput,
  MedicationValidationIssue,
  MedicationValidationResult,
} from "./types";

import type {
  MedicationCatalogProvider,
} from "@/lib/medication-catalog/provider";

import {
  isMedicationRegulatoryRuleActive,
} from "@/lib/medication-catalog/regulatory";

import {
  resolveMedicationRegulatoryPrescription,
} from "@/lib/medication-catalog/regulatory-exceptions";

function buildIssueId(
  field: string,
  code: string,
  referenceId?: string
) {
  return [
    field,
    code,
    referenceId ??
      "no-reference",
  ].join(
    ":"
  );
}

function presentationsMatch(
  presentation:
    MedicationPresentation,
  dosageValue: number,
  dosageUnit: string
): boolean {
  if (
    presentation.value !==
      undefined &&
    presentation.unit
  ) {
    return (
      presentation.value ===
        dosageValue &&
      normalizeMedicationUnit(
        presentation.unit
      ) ===
        dosageUnit
    );
  }

  const normalizedLabel =
    normalizeMedicationText(
      presentation.label
    ).replace(
      /\s+/g,
      ""
    );

  const expected =
    normalizeMedicationText(
      `${dosageValue} ${dosageUnit}`
    ).replace(
      /\s+/g,
      ""
    );

  return (
    normalizedLabel ===
    expected
  );
}

function validateName(
  match:
    MedicationReferenceMatch
): MedicationValidationIssue[] {
  if (
    match.matchedBy !==
      "similarity"
  ) {
    return [];
  }

  return [
    {
      id:
        buildIssueId(
          "nome",
          "possible_name_typo",
          match.reference.id
        ),

      code:
        "possible_name_typo",

      field:
        "nome",

      severity:
        "warning",

      confidence:
        match.score >=
        0.9
          ? "high"
          : "medium",

      title:
        "Nome merece revisão",

      message:
        `O nome informado é parecido com "${match.matchedText}", encontrado na referência disponível.`,

      evidence: [
        `Nome informado: "${match.reference.canonicalName === match.matchedText ? match.matchedText : match.matchedText}"`,
        `Similaridade textual aproximada: ${Math.round(match.score * 100)}%`,
      ],

      suggestedValue:
        match.matchedText,

      referenceId:
        match.reference.id,

      sources:
        match.reference.sources,
    },
  ];
}

function validatePresentation(
  input:
    ReturnType<
      typeof normalizeMedicationInput
    >,
  match:
    MedicationReferenceMatch
): MedicationValidationIssue[] {
  if (
    input.dosageValue ===
      undefined ||
    !input.dosageUnit
  ) {
    return [];
  }

  const presentations =
    match.reference
      .presentations ??
    [];

  if (
    presentations.length ===
    0
  ) {
    return [];
  }

  const found =
    presentations.some(
      (
        presentation
      ) =>
        presentationsMatch(
          presentation,
          input.dosageValue!,
          input.dosageUnit!
        )
    );

  if (
    found
  ) {
    return [];
  }

  return [
    {
      id:
        buildIssueId(
          "dosagem",
          "presentation_not_found",
          match.reference.id
        ),

      code:
        "presentation_not_found",

      field:
        "dosagem",

      severity:
        "warning",

      confidence:
        "high",

      title:
        "Concentração não encontrada na referência",

      message:
        "O Vault não encontrou a concentração informada entre as apresentações disponíveis nesta referência. Confira a prescrição antes de alterar o cadastro.",

      evidence: [
        `Informado: ${input.originalDosage ?? ""}`,

        `Referência possui: ${presentations
          .map(
            (
              presentation
            ) =>
              presentation.label
          )
          .join(", ")}`,
      ],

      referenceId:
        match.reference.id,

      sources:
        match.reference.sources,
    },
  ];
}

function getPrescriptionReferenceDate(
  prescriptionDate?:
    string
): Date {
  if (
    prescriptionDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      prescriptionDate
    )
  ) {
    const parsed =
      new Date(
        `${prescriptionDate}T12:00:00`
      );

    if (
      Number.isFinite(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return new Date();
}

function uniqueSources(
  sources:
    MedicationReference["sources"]
): MedicationReference["sources"] {
  const map =
    new Map(
      sources.map(
        (
          source
        ) => [
          source.id,
          source,
        ]
      )
    );

  return Array.from(
    map.values()
  );
}

function validatePrescriptionType(
  input:
    ReturnType<
      typeof normalizeMedicationInput
    >,
  match:
    MedicationReferenceMatch,
  prescriptionDate?:
    string,
  regulatoryContext?:
    MedicationValidationInput["regulatoryContext"]
): MedicationValidationIssue[] {
  if (
    !input.tipoReceita
  ) {
    return [];
  }

  const regulatoryRules =
    match.reference
      .regulatoryRules ??
    [];

  const referenceDate =
    getPrescriptionReferenceDate(
      prescriptionDate
    );

  /*
   * Sem regras regulatórias detalhadas, mantemos apenas o
   * fallback legado já existente.
   *
   * Importante:
   * ausência de prescriptionTypes também significa
   * ausência de conclusão — nunca assumimos "comum".
   */
  if (
    regulatoryRules.length ===
    0
  ) {
    const expected =
      match.reference
        .prescriptionTypes ??
      [];

    if (
      expected.length ===
        0 ||
      expected.includes(
        input.tipoReceita
      )
    ) {
      return [];
    }

    return [
      {
        id:
          buildIssueId(
            "tipo_receita",
            "prescription_type_mismatch",
            match.reference.id
          ),

        code:
          "prescription_type_mismatch",

        field:
          "tipo_receita",

        severity:
          "important",

        confidence:
          "high",

        title:
          "Tipo de receita merece revisão",

        message:
          "O tipo de receita selecionado não corresponde à referência disponível. Confira a receita original e a fonte citada antes de alterar o cadastro.",

        evidence: [
          `Selecionado no Vault: ${input.tipoReceita}`,
          `Referência disponível: ${expected.join(", ")}`,
        ],

        referenceId:
          match.reference.id,

        sources:
          match.reference.sources,
      },
    ];
  }

  const activeRules =
    regulatoryRules.filter(
      (
        rule
      ) =>
        isMedicationRegulatoryRuleActive(
          rule,
          referenceDate
        )
    );

  /*
   * Temos histórico regulatório, mas nenhuma regra conhecida
   * estava vigente na data consultada.
   *
   * Não usamos classificação atual como substituta.
   */
  if (
    activeRules.length ===
    0
  ) {
    return [];
  }

  /*
   * Fail-safe de qualidade regulatória.
   *
   * Se uma regra vigente possui ao menos uma exceção que o
   * provider não conseguiu interpretar, não sabemos se a regra
   * base realmente representa o produto/apresentação atual.
   *
   * Nesse cenário o Vault não acusa mismatch.
   */
  const hasMalformedExceptionData =
    activeRules.some(
      (
        rule
      ) =>
        rule.hasMalformedExceptions ===
        true
    );

  if (
    hasMalformedExceptionData
  ) {
    return [];
  }

  const resolutions =
    activeRules.map(
      (
        rule
      ) => ({
        rule,

        resolution:
          resolveMedicationRegulatoryPrescription(
            {
              baseVaultPrescriptionType:
                rule.vaultPrescriptionType,

              basePrescriptionModel:
                rule.prescriptionModel,

              exceptions:
                rule.exceptions ??
                [],

              context:
                regulatoryContext ??
                {},

              at:
                referenceDate,
            }
          ),
      })
    );

  /*
   * Qualquer regra vigente sem resolução segura impede uma
   * acusação de mismatch.
   *
   * Isso é intencionalmente conservador:
   * a informação que falta pode justamente ser a condição
   * que altera o modelo/tipo de receita.
   */
  const hasUnresolvedRule =
    resolutions.some(
      (
        item
      ) =>
        item.resolution.status ===
          "insufficient_context" ||
        item.resolution.status ===
          "conflict"
    );

  if (
    hasUnresolvedRule
  ) {
    return [];
  }

  const conclusive =
    resolutions
      .map(
        (
          item
        ) => ({
          ...item,

          vaultPrescriptionType:
            item.resolution
              .vaultPrescriptionType,
        })
      )
      .filter(
        (
          item
        ): item is
          typeof item & {
            vaultPrescriptionType:
              NonNullable<
                typeof item.vaultPrescriptionType
              >;
          } =>
            Boolean(
              item.vaultPrescriptionType
            )
      );

  /*
   * Uma regra pode possuir somente prescriptionModel oficial
   * sem tradução segura para a abstração visual do Vault.
   *
   * Nesse caso também não acusamos mismatch.
   */
  if (
    conclusive.length !==
    activeRules.length
  ) {
    return [];
  }

  const expected =
    Array.from(
      new Set(
        conclusive.map(
          (
            item
          ) =>
            item.vaultPrescriptionType
        )
      )
    );

  /*
   * Produto com múltiplas regras/princípios ativos:
   *
   * conclusões diferentes NÃO são tratadas como uma lista de
   * alternativas aceitáveis.
   *
   * É conflito de contexto regulatório do produto e portanto
   * insuficiente para acusar o cadastro.
   */
  if (
    expected.length !==
    1
  ) {
    return [];
  }

  const expectedType =
    expected[0];

  if (
    !expectedType ||
    expectedType ===
      input.tipoReceita
  ) {
    return [];
  }

  const regulatorySources =
    uniqueSources(
      [
        ...conclusive.flatMap(
          (
            item
          ) =>
            item.rule.sources
        ),

        ...conclusive.flatMap(
          (
            item
          ) => {
            const sourceIds =
              new Set(
                (
                  item.rule
                    .exceptions ??
                  []
                )
                  .filter(
                    (
                      exception
                    ) =>
                      item.resolution
                        .appliedExceptionIds
                        .includes(
                          exception.id
                        )
                  )
                  .map(
                    (
                      exception
                    ) =>
                      exception.sourceId
                  )
              );

            return match.reference
              .sources
              .filter(
                (
                  source
                ) =>
                  sourceIds.has(
                    source.id
                  )
              );
          }
        ),
      ]
    );

  const evidence: string[] = [
    `Selecionado no Vault: ${input.tipoReceita}`,
    `Referência regulatória resolvida: ${expectedType}`,
  ];

  const models =
    Array.from(
      new Set(
        conclusive
          .map(
            (
              item
            ) =>
              item.resolution
                .prescriptionModel
          )
          .filter(
            (
              model
            ): model is string =>
              Boolean(
                model
              )
          )
      )
    );

  if (
    models.length ===
    1
  ) {
    evidence.push(
      `Modelo regulatório: ${models[0]}`
    );
  }

  const appliedExceptionLabels =
    Array.from(
      new Set(
        conclusive.flatMap(
          (
            item
          ) =>
            (
              item.rule
                .exceptions ??
              []
            )
              .filter(
                (
                  exception
                ) =>
                  item.resolution
                    .appliedExceptionIds
                    .includes(
                      exception.id
                    )
              )
              .map(
                (
                  exception
                ) =>
                  exception.label
              )
        )
      )
    );

  if (
    appliedExceptionLabels.length >
    0
  ) {
    evidence.push(
      `Exceção regulatória considerada: ${appliedExceptionLabels.join(", ")}`
    );
  }

  if (
    prescriptionDate
  ) {
    evidence.push(
      `Data considerada: ${prescriptionDate}`
    );
  }

  return [
    {
      id:
        buildIssueId(
          "tipo_receita",
          "prescription_type_mismatch",
          match.reference.id
        ),

      code:
        "prescription_type_mismatch",

      field:
        "tipo_receita",

      severity:
        "important",

      confidence:
        "high",

      title:
        "Tipo de receita merece revisão",

      message:
        prescriptionDate
          ? "O tipo de receita selecionado não corresponde à regra regulatória que pôde ser resolvida com segurança para a data informada. Confira a receita original e a fonte citada antes de alterar o cadastro."
          : "O tipo de receita selecionado não corresponde à regra regulatória vigente que pôde ser resolvida com segurança. Confira a receita original e a fonte citada antes de alterar o cadastro.",

      evidence,

      referenceId:
        match.reference.id,

      sources:
        regulatorySources.length >
        0
          ? regulatorySources
          : match.reference
              .sources,
    },
  ];
}

function validateForm(
  input:
    ReturnType<
      typeof normalizeMedicationInput
    >,
  match:
    MedicationReferenceMatch
): MedicationValidationIssue[] {
  if (
    !input.formato
  ) {
    return [];
  }

  const forms =
    match.reference
      .pharmaceuticalForms ??
    [];

  if (
    forms.length ===
    0
  ) {
    return [];
  }

  const normalizedForm =
    normalizeMedicationText(
      input.formato
    );

  const matches =
    forms.some(
      (
        form
      ) =>
        normalizeMedicationText(
          form
        ) ===
        normalizedForm
    );

  if (
    matches
  ) {
    return [];
  }

  return [
    {
      id:
        buildIssueId(
          "formato",
          "pharmaceutical_form_mismatch",
          match.reference.id
        ),

      code:
        "pharmaceutical_form_mismatch",

      field:
        "formato",

      severity:
        "warning",

      confidence:
        "medium",

      title:
        "Forma farmacêutica merece revisão",

      message:
        "A forma cadastrada não foi encontrada entre as formas disponíveis na referência consultada.",

      evidence: [
        `Informado: ${input.formato}`,
        `Referência: ${forms.join(", ")}`,
      ],

      referenceId:
        match.reference.id,

      sources:
        match.reference.sources,
    },
  ];
}

/**
 * Valida um cadastro contra as referências fornecidas.
 *
 * IMPORTANTE:
 *
 * - ausência de issue não significa que o medicamento foi
 *   considerado correto por um profissional;
 *
 * - ausência de referência não gera erro;
 *
 * - nenhuma correção é aplicada automaticamente;
 *
 * - o catálogo precisa ter fonte/versão próprias para regras
 *   farmacêuticas ou regulatórias.
 */
export function validateMedication(
  input:
    MedicationValidationInput,
  catalog:
    readonly MedicationReference[] =
      LOCAL_MEDICATION_CATALOG
): MedicationValidationResult {
  const normalized =
    normalizeMedicationInput(
      input
    );

  const match =
    findMedicationReference(
      input.nome,
      catalog
    );

  if (
    !match
  ) {
    return {
      input,
      normalized,
      match:
        null,
      issues:
        [],
      noIssuesFound:
        true,
      referenceAvailable:
        false,
    };
  }

  const issues = [
    ...validateName(
      match
    ),

    ...validatePresentation(
      normalized,
      match
    ),

    ...validatePrescriptionType(
      normalized,
      match,
      input.prescriptionDate,
      input.regulatoryContext
    ),

    ...validateForm(
      normalized,
      match
    ),
  ];

  return {
    input,
    normalized,
    match,
    issues,
    noIssuesFound:
      issues.length ===
      0,
    referenceAvailable:
      true,
  };
}


/**
 * Versão assíncrona da validação para catálogos externos.
 *
 * O provider pode futuramente buscar referências no Supabase,
 * cache local ou outra fonte sem acoplar o Medication
 * Intelligence ao transporte.
 */
export async function validateMedicationWithProvider(
  input:
    MedicationValidationInput,
  provider:
    MedicationCatalogProvider
): Promise<MedicationValidationResult> {
  const normalized =
    normalizeMedicationInput(
      input
    );

  const results =
    await provider.search(
      input.nome,
      {
        limit:
          1,
      }
    );

  const first =
    results[0];

  if (
    !first
  ) {
    return {
      input,
      normalized,
      match:
        null,
      issues:
        [],
      noIssuesFound:
        true,
      referenceAvailable:
        false,
    };
  }

  const exactCanonical =
    normalizeMedicationText(
      first.reference
        .canonicalName
    ) ===
    normalized.normalizedName;

  const exactAlias =
    (
      first.reference
        .aliases ??
      []
    ).some(
      (
        alias
      ) =>
        normalizeMedicationText(
          alias
        ) ===
        normalized.normalizedName
    );

  const activeIngredients =
    first.reference
      .activeIngredients &&
    first.reference
      .activeIngredients.length >
      0
      ? first.reference
          .activeIngredients
      : first.reference
          .activeIngredient
        ? [
            first.reference
              .activeIngredient,
          ]
        : [];

  const exactIngredient =
    activeIngredients.some(
      (
        ingredient
      ) =>
        normalizeMedicationText(
          ingredient
        ) ===
        normalized.normalizedName
    );

  const match:
    MedicationReferenceMatch = {
      reference:
        first.reference,

      matchedBy:
        exactCanonical
          ? "canonical_name"
          : exactAlias
            ? "alias"
            : exactIngredient
              ? "active_ingredient"
              : "similarity",

      matchedText:
        first.matchedText,

      score:
        first.score,
    };

  const issues = [
    ...validateName(
      match
    ),

    ...validatePresentation(
      normalized,
      match
    ),

    ...validatePrescriptionType(
      normalized,
      match,
      input.prescriptionDate,
      input.regulatoryContext
    ),

    ...validateForm(
      normalized,
      match
    ),
  ];

  return {
    input,
    normalized,
    match,
    issues,
    noIssuesFound:
      issues.length ===
      0,
    referenceAvailable:
      true,
  };
}
