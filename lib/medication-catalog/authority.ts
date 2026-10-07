import type { MedicationReference } from "@/lib/medication-intelligence/types";
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";

export type MedicationCatalogAuthorityState =
  | "confirmed"
  | "compatible"
  | "possible_divergence"
  | "unvalidated";

export type MedicationCatalogAuthority = {
  state: MedicationCatalogAuthorityState;
  label: "Confirmado" | "Compatível" | "Possível divergência" | "Não validado";
  detail: string;
  activeIngredients: string[];
  referenceType: "product" | "substance" | null;
  registrationNumber: string | null;
  manufacturer: string | null;
  sourceLabel: string | null;
  presentationCount: number;
};

const unique = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map(v => String(v ?? "").trim()).filter(Boolean)));

export function getMedicationCatalogAuthority(
  userName: string,
  reference?: MedicationReference | null
): MedicationCatalogAuthority {
  if (!reference) {
    return {
      state: "unvalidated",
      label: "Não validado",
      detail: "O catálogo não confirmou uma identidade exata para este cadastro.",
      activeIngredients: [],
      referenceType: null,
      registrationNumber: null,
      manufacturer: null,
      sourceLabel: null,
      presentationCount: 0,
    };
  }

  const current = normalizeMedicationText(userName);
  const canonical = normalizeMedicationText(reference.canonicalName);
  const ingredients = unique([
    ...(reference.activeIngredients ?? []),
    reference.activeIngredient,
  ]);
  const aliases = unique(reference.aliases ?? []);
  const compatibleNames = [...ingredients, ...aliases].map(normalizeMedicationText);

  const state: MedicationCatalogAuthorityState =
    current && current === canonical
      ? "confirmed"
      : current && compatibleNames.includes(current)
        ? "compatible"
        : "possible_divergence";

  const label =
    state === "confirmed" ? "Confirmado" :
    state === "compatible" ? "Compatível" :
    "Possível divergência";

  const referenceType = reference.regulatoryIdentity?.referenceType ?? null;
  const currentCommercial = reference.commercialIdentity?.currentProduct;

  return {
    state,
    label,
    detail:
      state === "confirmed"
        ? "O nome corresponde diretamente à referência selecionada do catálogo."
        : state === "compatible"
          ? "O nome é reconhecido como princípio ativo, alias ou identidade equivalente da referência."
          : "Há uma referência próxima, mas o Vault não deve tratá-la como correção automática.",
    activeIngredients: ingredients,
    referenceType,
    registrationNumber:
      reference.regulatoryIdentity?.referenceType === "product"
        ? reference.regulatoryIdentity.registrationNumber ?? null
        : currentCommercial?.registrationNumber ?? null,
    manufacturer: currentCommercial?.manufacturer ?? null,
    sourceLabel: reference.sources?.[0]?.label ?? null,
    presentationCount: reference.presentations?.length ?? 0,
  };
}

export function shouldShowActiveIngredients(userName: string, ingredients: string[]) {
  const current = normalizeMedicationText(userName);
  return ingredients.some(item => normalizeMedicationText(item) !== current);
}
