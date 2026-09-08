// lib/medication-catalog/regulatory.ts

import type {
  TipoReceita,
} from "@/lib/types";

import type {
  MedicationRegulatoryPrescriptionModelCode,
} from "@/lib/medication-intelligence/types";

export type MedicationRegulatoryRule = {
  id: string;

  substance:
    string;

  /**
   * Classificação oficial quando conhecida.
   *
   * Ex.: código/lista regulatória da fonte de origem.
   * Não confundir com a abstração visual do Vault.
   */
  regulatoryClass?: string;

  /**
   * Modelo regulatório oficial/original quando conhecido.
   *
   * Deve permanecer separado da abstração visual do Vault.
   */
  prescriptionModel?: string;

  prescriptionModelCode?:
    MedicationRegulatoryPrescriptionModelCode;

  /**
   * Tipo visual utilizado atualmente pelo Vault.
   *
   * Deve ser derivado da regra regulatória vigente,
   * nunca tratado como única fonte da verdade.
   */
  vaultPrescriptionType?:
    TipoReceita;

  sourceId:
    string;

  sourceVersion?:
    string;

  effectiveFrom?:
    string;

  effectiveUntil?:
    string;

  verifiedAt:
    string;
};

/**
 * Verifica se uma regra estava vigente em uma determinada data.
 *
 * Não interpreta legislação; apenas respeita os intervalos
 * informados pelo catálogo.
 */
/**
 * Estado produzido ao avaliar uma condição regulatória.
 *
 * UNKNOWN é essencial: ausência de informação nunca deve ser
 * interpretada como se a exceção não existisse.
 */
export type MedicationRegulatoryApplicability =
  | "applicable"
  | "not_applicable"
  | "unknown";

export type MedicationRegulatoryNumericOperator =
  | "eq"
  | "lt"
  | "lte"
  | "gt"
  | "gte";

export type MedicationRegulatoryTextOperator =
  | "eq"
  | "in";

/**
 * Unidades inicialmente suportadas para concentração.
 *
 * O motor não converte automaticamente entre unidades.
 * Uma comparação só acontece quando contexto e condição usam
 * a mesma unidade normalizada.
 */
export type MedicationRegulatoryConcentrationUnit =
  | "percent"
  | "mg_ml"
  | "mg"
  | "mcg";

/**
 * Condições regulatórias estruturadas.
 *
 * Nenhuma condição aceita expressão arbitrária, JavaScript
 * ou texto livre executável.
 */
export type MedicationRegulatoryCondition =
  | {
      kind:
        "ingredient_concentration";

      ingredient:
        string;

      operator:
        MedicationRegulatoryNumericOperator;

      value:
        number;

      unit:
        MedicationRegulatoryConcentrationUnit;
    }
  | {
      kind:
        "pharmaceutical_form";

      operator:
        MedicationRegulatoryTextOperator;

      value:
        string | string[];
    }
  | {
      kind:
        "product_id";

      operator:
        MedicationRegulatoryTextOperator;

      value:
        string | string[];
    }
  | {
      kind:
        "registration_number";

      operator:
        MedicationRegulatoryTextOperator;

      value:
        string | string[];
    };

/**
 * Exceção à regra regulatória base.
 *
 * Todas as condições de uma exceção são avaliadas em conjunto
 * (AND). Se qualquer condição for desconhecida e nenhuma já
 * tiver provado a não aplicação, o resultado é UNKNOWN.
 */
export type MedicationRegulatoryException = {
  id: string;

  label:
    string;

  conditions:
    MedicationRegulatoryCondition[];

  overrideVaultPrescriptionType?:
    TipoReceita;

  overridePrescriptionModel?:
    string;

  overridePrescriptionModelCode?:
    MedicationRegulatoryPrescriptionModelCode;

  effectiveFrom?:
    string;

  effectiveUntil?:
    string;

  sourceId:
    string;

  sourceVersion?:
    string;

  verifiedAt:
    string;

  notes?:
    string;
};

/**
 * Fatos necessários para avaliar exceções.
 *
 * Esses dados devem vir de fonte regulatória/produto conhecido.
 * O motor não tenta inferir concentração a partir do nome.
 */
export type MedicationRegulatoryEvaluationContext = {
  productId?:
    string;

  registrationNumber?:
    string;

  pharmaceuticalForm?:
    string;

  ingredientConcentrations?: Array<{
    ingredient:
      string;

    value:
      number;

    unit:
      MedicationRegulatoryConcentrationUnit;
  }>;
};

export type MedicationRegulatoryConditionEvaluation = {
  condition:
    MedicationRegulatoryCondition;

  applicability:
    MedicationRegulatoryApplicability;

  evidence?:
    string;

  missingFact?:
    string;
};

export type MedicationRegulatoryExceptionEvaluation = {
  exception:
    MedicationRegulatoryException;

  applicability:
    MedicationRegulatoryApplicability;

  conditionEvaluations:
    MedicationRegulatoryConditionEvaluation[];
};

/**
 * Resultado final da resolução regulatória.
 */
export type MedicationRegulatoryResolutionStatus =
  | "resolved"
  | "override_applied"
  | "insufficient_context"
  | "conflict";

export type MedicationRegulatoryResolution = {
  status:
    MedicationRegulatoryResolutionStatus;

  vaultPrescriptionType?:
    TipoReceita;

  prescriptionModel?:
    string;

  prescriptionModelCode?:
    MedicationRegulatoryPrescriptionModelCode;

  baseVaultPrescriptionType?:
    TipoReceita;

  basePrescriptionModel?:
    string;

  basePrescriptionModelCode?:
    MedicationRegulatoryPrescriptionModelCode;

  exceptionEvaluations:
    MedicationRegulatoryExceptionEvaluation[];

  appliedExceptionIds:
    string[];

  evidence:
    string[];

  missingFacts:
    string[];
};

export type MedicationRegulatoryTemporalRule = {
  effectiveFrom?:
    string;

  effectiveUntil?:
    string;
};

export function isMedicationRegulatoryRuleActive(
  rule:
    MedicationRegulatoryTemporalRule,
  at:
    Date =
      new Date()
): boolean {
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
}
