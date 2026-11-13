/** SS7 — explicit physical package confirmation; no regulatory or pharmaceutical conversion inferred. */
export const PACKAGE_EVIDENCE_SS7 = '[VAULT:EMBALAGEM-CONFERIDA]';
export type PackageEvidenceSS7 = {
  medicationId: string;
  packages: number;
  unitsPerPackage: number;
  totalUnits: number;
  stockUnit: string;
  confirmedAt: string;
};
const positiveInteger = (n: number, upper: number) => Number.isSafeInteger(n) && n > 0 && n <= upper;

export function calculatePackageUnitsSS7(packages: number, unitsPerPackage: number, unit: string) {
  const trimmed = unit.trim();
  if (!positiveInteger(packages, 500) || !positiveInteger(unitsPerPackage, 1000) || !trimmed || packages * unitsPerPackage > 100000) return null;
  const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Only discrete units. ML, drops, vials, containers and packages require another conversion workflow.
  if (!/(comprimid|capsul)/.test(normalized) || /(caixa|frasco|gota|ampol|ml\b|mililit)/.test(normalized)) return null;
  return { packages, unitsPerPackage, totalUnits: packages * unitsPerPackage, stockUnit: trimmed };
}

export function stripPackageEvidenceSS7(source?: string | null): string {
  return String(source ?? '').split(/\r?\n/).filter(line => !line.startsWith(PACKAGE_EVIDENCE_SS7)).join('\n').trim();
}
export function readPackageEvidenceSS7(source?: string | null): PackageEvidenceSS7 | null {
  const matches = String(source ?? '').split(/\r?\n/).filter(line => line.startsWith(PACKAGE_EVIDENCE_SS7));
  for (const line of matches.reverse()) {
    try {
      const row = JSON.parse(line.slice(PACKAGE_EVIDENCE_SS7.length)) as Partial<PackageEvidenceSS7>;
      if (typeof row.medicationId !== 'string' || !row.medicationId.trim() ||
          typeof row.stockUnit !== 'string' || !row.stockUnit.trim() ||
          typeof row.confirmedAt !== 'string' || !Number.isFinite(Date.parse(row.confirmedAt)) ||
          !positiveInteger(row.packages as number, 500) || !positiveInteger(row.unitsPerPackage as number, 1000) ||
          row.totalUnits !== row.packages! * row.unitsPerPackage! || row.totalUnits > 100000 ||
          !calculatePackageUnitsSS7(row.packages!, row.unitsPerPackage!, row.stockUnit)) continue;
      return row as PackageEvidenceSS7;
    } catch { /* invalid legacy note: never infer units */ }
  }
  return null;
}
export function writePackageEvidenceSS7(source: string | null | undefined, item: PackageEvidenceSS7): string {
  const checked = calculatePackageUnitsSS7(item.packages, item.unitsPerPackage, item.stockUnit);
  if (!item.medicationId.trim() || !checked || checked.totalUnits !== item.totalUnits ||
      !Number.isFinite(Date.parse(item.confirmedAt))) throw new Error('Conferência de embalagem inválida.');
  return [stripPackageEvidenceSS7(source), `${PACKAGE_EVIDENCE_SS7}${JSON.stringify(item)}`].filter(Boolean).join('\n');
}

/** Marker becomes invalid if the medication, unit or quantity changes. No stale stock proof. */
export function packageEvidenceMatchesSS7(source: string | null | undefined, medicationId: string, quantity: number, stockUnit: string): boolean {
  const evidence = readPackageEvidenceSS7(source);
  return !evidence || (evidence.medicationId === medicationId && evidence.totalUnits === quantity && evidence.stockUnit === stockUnit.trim());
}
