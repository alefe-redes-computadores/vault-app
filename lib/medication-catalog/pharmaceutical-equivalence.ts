import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";

// VAULT_PHARMACEUTICAL_EQUIVALENCE_V97_2_R1
//
// Não é fuzzy authority.
// Apenas reconhece equivalências farmacêuticas determinísticas,
// como "metadona" <-> "cloridrato de metadona".

const SALT_PREFIXES = [
  "cloridrato de",
  "bromidrato de",
  "iodidrato de",
  "sulfato de",
  "bisulfato de",
  "hidrogenossulfato de",
  "fosfato de",
  "difosfato de",
  "citrato de",
  "maleato de",
  "fumarato de",
  "succinato de",
  "mesilato de",
  "dimesilato de",
  "besilato de",
  "tosilato de",
  "tartrato de",
  "bitartarato de",
  "acetato de",
  "lactato de",
  "gluconato de",
  "aspartato de",
  "oxalato de",
  "nitrato de",
  "benzoato de",
  "propionato de",
  "palmitato de",
  "estearato de",
  "hemifumarato de",
  "hemissulfato de",
] as const;

const HYDRATE_SUFFIXES = [
  "monoidratado",
  "monoidratada",
  "diidratado",
  "diidratada",
  "triidratado",
  "triidratada",
  "tetraidratado",
  "tetraidratada",
  "pentaidratado",
  "pentaidratada",
  "hemihidratado",
  "hemihidratada",
  "anidro",
  "anidra",
] as const;

function removeHydration(
  value: string
): string {
  let current =
    normalizeMedicationText(value);

  let changed = true;

  while (changed) {
    changed = false;

    for (
      const suffix of HYDRATE_SUFFIXES
    ) {
      const normalizedSuffix =
        normalizeMedicationText(suffix);

      if (
        current.endsWith(
          " " + normalizedSuffix
        )
      ) {
        current =
          current
            .slice(
              0,
              -(normalizedSuffix.length + 1)
            )
            .trim();

        changed = true;
        break;
      }
    }
  }

  return current;
}

export function pharmaceuticalBaseName(
  value: string
): string {
  const normalized =
    removeHydration(value);

  for (
    const prefix of SALT_PREFIXES
  ) {
    const normalizedPrefix =
      normalizeMedicationText(prefix);

    if (
      normalized.startsWith(
        normalizedPrefix + " "
      )
    ) {
      return normalized
        .slice(
          normalizedPrefix.length + 1
        )
        .trim();
    }
  }

  // Suporta também registros no formato:
  // "clorpromazina cloridrato".
  for (
    const prefix of SALT_PREFIXES
  ) {
    const salt =
      normalizeMedicationText(prefix)
        .replace(
          /\s+de$/,
          ""
        );

    if (
      salt &&
      normalized.endsWith(
        " " + salt
      )
    ) {
      return normalized
        .slice(
          0,
          -(salt.length + 1)
        )
        .trim();
    }
  }

  return normalized;
}

export function isPharmaceuticallyEquivalentName(
  left: string,
  right: string
): boolean {
  const a =
    normalizeMedicationText(left);

  const b =
    normalizeMedicationText(right);

  if (
    !a ||
    !b
  ) {
    return false;
  }

  if (
    a === b
  ) {
    return true;
  }

  const baseA =
    pharmaceuticalBaseName(a);

  const baseB =
    pharmaceuticalBaseName(b);

  return Boolean(
    baseA &&
    baseB &&
    baseA === baseB
  );
}
