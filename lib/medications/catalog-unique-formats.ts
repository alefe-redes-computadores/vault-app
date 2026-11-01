/**
 * M9 — A apresentação oficial é evidência, não decisão sobre dose ou estoque.
 * A formatação nunca escolhe um formato quando existem múltiplas inferências.
 */
import { inferVaultFormatFromOfficialPresentation } from "@/lib/medications/catalog-presentation";

type FormatEvidence = {
  pharmaceuticalForms?: readonly string[] | null;
  presentations?: readonly { label: string; pharmaceuticalForm?: string | null }[] | null;
};

export function catalogUniquelyInferredFormats(reference: FormatEvidence): string[] {
  const labels = [
    ...(reference.pharmaceuticalForms ?? []),
    ...(reference.presentations ?? []).flatMap(presentation => [
      presentation.label,
      presentation.pharmaceuticalForm ?? "",
    ]),
  ];
  return Array.from(new Set(labels
    .map(value => inferVaultFormatFromOfficialPresentation(value))
    .filter((value): value is string => Boolean(value))));
}
