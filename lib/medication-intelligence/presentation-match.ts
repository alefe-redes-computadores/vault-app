import { normalizeMedicationText, normalizeMedicationUnit } from "./normalize";
import type { MedicationPresentation } from "./types";

export type ParsedMedicationStrength = {
  numeratorValue: number;
  numeratorUnit: string;
  denominatorValue?: number;
  denominatorUnit?: string;
};

const UNIT_PATTERN = "mg|mcg|µg|ug|g|ui|ml|l|gota|gotas";

function numberValue(value: string): number {
  return Number(value.replace(",", "."));
}

export function parseMedicationStrength(value: string): ParsedMedicationStrength | null {
  const normalized = normalizeMedicationText(value)
    .replace(/μg/g, "mcg")
    .replace(/µg|ug/g, "mcg")
    .replace(/,/g, ".");

  const ratio = normalized.match(
    new RegExp(`(?:^|\\b)(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\s*\\/\\s*(?:(\\d+(?:\\.\\d+)?)\\s*)?(${UNIT_PATTERN})(?:\\b|$)`, "i")
  );

  if (ratio) {
    return {
      numeratorValue: numberValue(ratio[1]),
      numeratorUnit: normalizeMedicationUnit(ratio[2]),
      denominatorValue: ratio[3] ? numberValue(ratio[3]) : 1,
      denominatorUnit: normalizeMedicationUnit(ratio[4]),
    };
  }

  const simple = normalized.match(
    new RegExp(`(?:^|\\b)(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})(?:\\b|$)`, "i")
  );

  if (!simple) return null;

  return {
    numeratorValue: numberValue(simple[1]),
    numeratorUnit: normalizeMedicationUnit(simple[2]),
  };
}

function sameStrength(a: ParsedMedicationStrength, b: ParsedMedicationStrength): boolean {
  return (
    a.numeratorValue === b.numeratorValue &&
    a.numeratorUnit === b.numeratorUnit &&
    a.denominatorValue === b.denominatorValue &&
    a.denominatorUnit === b.denominatorUnit
  );
}

export function presentationMatchesDosage(
  presentation: MedicationPresentation,
  dosage: string
): boolean {
  const expected = parseMedicationStrength(dosage);
  if (!expected) return false;

  if (presentation.value !== undefined && presentation.unit && expected.denominatorUnit === undefined) {
    return (
      presentation.value === expected.numeratorValue &&
      normalizeMedicationUnit(presentation.unit) === expected.numeratorUnit
    );
  }

  const actual = parseMedicationStrength(presentation.label);
  return Boolean(actual && sameStrength(actual, expected));
}

export function dosageMatchesPresentations(
  dosage: string,
  presentations: MedicationPresentation[]
): boolean {
  if (!dosage.trim() || presentations.length === 0) return true;
  return presentations.some((presentation) => presentationMatchesDosage(presentation, dosage));
}
