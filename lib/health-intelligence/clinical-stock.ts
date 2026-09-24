// lib/health-intelligence/clinical-stock.ts
// VAULT_CLINICAL_STOCK_V47
//
// Contrato clínico de estoque:
// - unknown: não existe saldo confiável registrado;
// - empty: saldo conhecido exatamente em zero;
// - available: saldo conhecido acima de zero;
// - negative: saldo matemático abaixo de zero (não mascarar com Math.max).
//
// Este módulo NÃO movimenta estoque. DoseLog/repositories continuam sendo
// a única autoridade de persistência e movimentação.

import type { Medicamento } from "@/lib/types";
import {
  computeEstoqueInfo,
  type EstoqueInfo,
} from "@/lib/health-utils";

export type ClinicalStockState =
  | "unknown"
  | "empty"
  | "available"
  | "negative";

export interface ClinicalStockSnapshot {
  state: ClinicalStockState;
  registeredQuantity: number | null;
  displayQuantity: number | null;
  info: EstoqueInfo | null;
  hasReliableDoseEstimate: boolean;
  daysRemaining: number | null;
  dosesRemaining: number | null;
}

export function getClinicalStockSnapshot(
  medicamento: Medicamento
): ClinicalStockSnapshot {
  const raw = medicamento.estoque_quantidade;
  const registeredQuantity =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : null;

  if (registeredQuantity === null) {
    return {
      state: "unknown",
      registeredQuantity: null,
      displayQuantity: null,
      info: null,
      hasReliableDoseEstimate: false,
      daysRemaining: null,
      dosesRemaining: null,
    };
  }

  const info = computeEstoqueInfo(medicamento);
  const state: ClinicalStockState =
    registeredQuantity < 0
      ? "negative"
      : registeredQuantity === 0
        ? "empty"
        : "available";

  return {
    state,
    registeredQuantity,
    displayQuantity: Math.max(0, registeredQuantity),
    info,
    hasReliableDoseEstimate: Boolean(info?.estimativaDosesDisponivel),
    daysRemaining: info?.diasRestantes ?? null,
    dosesRemaining:
      info?.estimativaDosesDisponivel
        ? info.dosesRestantes
        : null,
  };
}

export function isClinicalStockKnown(
  snapshot: ClinicalStockSnapshot
): boolean {
  return snapshot.state !== "unknown";
}

export function isClinicalStockDepleted(
  snapshot: ClinicalStockSnapshot
): boolean {
  return snapshot.state === "empty" || snapshot.state === "negative";
}
