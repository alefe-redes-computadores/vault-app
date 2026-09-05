// lib/medication-catalog/regulatory.ts

import type {
  TipoReceita,
} from "@/lib/types";

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
export function isMedicationRegulatoryRuleActive(
  rule:
    MedicationRegulatoryRule,
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
