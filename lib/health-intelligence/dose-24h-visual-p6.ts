/** P6 — barras de 24h somente quando total, comparador e unidade têm equivalência confirmada. */
export type Dose24hComparisonP6 =
  | {status: "verified"; recordedMg: number; referenceMg: number; barPercent: number; ratio: number; referenceLabel: string}
  | {status: "unavailable"; reason: string};
export function dose24hComparisonP6(input: {
  confirmedTotalMg?: number | null;
  officialReferenceMg?: number | null;
  comparable?: boolean;
  officialSourceVerified?: boolean;
  referenceLabel?: string | null;
}): Dose24hComparisonP6 {
  const a = input.confirmedTotalMg, b = input.officialReferenceMg;
  if (input.comparable !== true || input.officialSourceVerified !== true ||
      typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) ||
      !Number.isFinite(b) || a < 0 || b <= 0 || !input.referenceLabel?.trim()) {
    return {status: "unavailable", reason: "Sem equivalência e referência oficial confirmadas para comparação em mg."};
  }
  const ratio = a / b;
  if (!Number.isFinite(ratio)) return {status:"unavailable",reason:"Comparação de unidades indisponível."};
  return {status: "verified", recordedMg:a,referenceMg:b,ratio,
    barPercent:Math.min(100,Math.max(0,Math.round(ratio*100))),referenceLabel:input.referenceLabel.trim()};
}
