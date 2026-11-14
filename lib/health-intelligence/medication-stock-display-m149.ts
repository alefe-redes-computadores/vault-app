/**
 * M149: display only, sourced from the raw registered stock quantity.
 * Never convert packages, cartons, drops or bottles without recorded units.
 * A negative balance is evidence of divergence, not zero available.
 */
import type { ClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";

function showNumber(value: number): string {
  return String(value).replace(".", ",");
}

function recordedUnit(unit: string | null | undefined, quantity: number): string {
  const value = (unit || "").trim();
  if (!value) return "";
  // The units are from the actual medication record; never guess a unit.
  return value.replace(/\(s\)/gi, quantity === 1 ? "" : "s");
}

export function medicationStockLabelM149(
  snapshot: Pick<ClinicalStockSnapshot, "state" | "registeredQuantity">,
  unit?: string | null,
  legacyLabel?: string,
): string {
  if (snapshot.state === "unknown" || snapshot.registeredQuantity === null ||
      !Number.isFinite(snapshot.registeredQuantity)) return "Não informado";
  const quantity = snapshot.registeredQuantity;
  const value = showNumber(quantity);
  const knownUnit = recordedUnit(unit, quantity);
  // A pre-existing label may be reused only if it starts with the exact value
  // and contains no additional derived estimate. The raw count always wins.
  if (!knownUnit && legacyLabel && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(legacyLabel) &&
      Number(legacyLabel.trim().replace(",", ".")) === quantity) {
    return legacyLabel.trim();
  }
  const factual = `${value}${knownUnit ? ` ${knownUnit}` : ""}`;
  return snapshot.state === "negative" ? `Saldo divergente: ${factual}` : factual;
}
