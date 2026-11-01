// VAULT M3 — catálogo é evidência de referência hidratada, nunca prescrição ou aquisição.
// Sem chamadas ao provider, persistência, ações clínicas ou inferência de estoque.
import type { MedicationReference } from "@/lib/medication-intelligence/types";
import type { CatalogPresentationSuggestion } from "@/lib/medications/form-presentation";
import {
  extractCatalogPresentationDosage,
  getCatalogFormatLabel,
  inferVaultFormatFromOfficialPresentation,
} from "@/lib/medications/catalog-presentation";

export function projectMedicationCatalogChoices(
  catalogReference: MedicationReference | null,
  normalizeCatalogKey: (value: string) => string,
) {
  const catalogPresentations = catalogReference?.presentations ?? [];

  const catalogForms =
    Array.from(
      new Set(
        [
          ...(
            catalogReference
              ?.pharmaceuticalForms ??
            []
          ),

          ...catalogPresentations
            .map(
              (
                presentation
              ) =>
                presentation
                  .pharmaceuticalForm
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            ),

          ...catalogPresentations.map(
            (
              presentation
            ) =>
              presentation.label
          ),
        ]
      )
    );

  const catalogPresentationSuggestions =
    Array.from(
      new Map<
        string,
        CatalogPresentationSuggestion
      >(
        catalogPresentations
          .map(
            (
              presentation
            ):
              CatalogPresentationSuggestion | null => {
              const dosage =
                extractCatalogPresentationDosage(
                  presentation.label
                );

              if (
                !dosage
              ) {
                return null;
              }

              const inferredFormat =
                inferVaultFormatFromOfficialPresentation(
                  [
                    presentation.label,
                    presentation.pharmaceuticalForm ??
                      "",
                  ].join(
                    " "
                  )
                );

              const formatLabel =
                getCatalogFormatLabel(
                  inferredFormat
                );

              const key =
                [
                  normalizeCatalogKey(
                    dosage
                  ),
                  inferredFormat ??
                    "unknown",
                ].join(
                  "|"
                );

              return {
                key,
                dosage,
                format:
                  inferredFormat,
                formatLabel,
                officialLabel:
                  presentation.label,
                packageDescription:
                  presentation.packageDescription ??
                  null,
              };
            }
          )
          .filter(
            (
              item
            ): item is CatalogPresentationSuggestion =>
              item !==
              null
          )
          .map(
            (
              item
            ) => [
              item.key,
              item,
            ]
          )
      ).values()
    )
      .sort(
        (
          a,
          b
        ) =>
          a.dosage.localeCompare(
            b.dosage,
            "pt-BR",
            {
              numeric:
                true,
            }
          )
      )
      .slice(
        0,
        10
      );

  return { catalogForms, catalogPresentationSuggestions };
}
