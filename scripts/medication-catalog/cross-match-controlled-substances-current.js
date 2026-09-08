// scripts/medication-catalog/cross-match-controlled-substances-current.js

"use strict";

const fs = require("fs");
const path = require("path");

const {
  createAdminClient,
} = require("./admin-client");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const INPUT =
  path.join(
    ROOT,
    ".medication-catalog-audit/structured/controlled-lists-update-102-nominal.json"
  );

const OUTPUT_DIR =
  path.join(
    ROOT,
    ".medication-catalog-audit/structured"
  );

const OUTPUT_JSON =
  path.join(
    OUTPUT_DIR,
    "controlled-substances-current-safe-match.json"
  );

const OUTPUT_TXT =
  path.join(
    OUTPUT_DIR,
    "controlled-substances-current-safe-match-summary.txt"
  );

/*
 * Traduções que o modelo atual do Vault consegue representar.
 *
 * Isto NÃO significa que uma substância será automaticamente
 * persistida com esse tipo.
 *
 * A tradução só é uma propriedade da classe regulatória.
 */
const SUPPORTED_CLASS_MAP = {
  A1: {
    prescriptionModel:
      "Notificação de Receita A",

    vaultPrescriptionType:
      "amarela",
  },

  A2: {
    prescriptionModel:
      "Notificação de Receita A",

    vaultPrescriptionType:
      "amarela",
  },

  A3: {
    prescriptionModel:
      "Notificação de Receita A",

    vaultPrescriptionType:
      "amarela",
  },

  B1: {
    prescriptionModel:
      "Notificação de Receita B",

    vaultPrescriptionType:
      "azul",
  },

  B2: {
    prescriptionModel:
      "Notificação de Receita B2",

    vaultPrescriptionType:
      "azul",
  },

  C1: {
    prescriptionModel:
      "Receita de Controle Especial",

    vaultPrescriptionType:
      "branca",
  },
};

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
];

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
  "hemi hidratado",
  "hemi hidratada",
  "hemihidratado",
  "hemihidratada",
  "anidro",
  "anidra",
];

const IONIC_SUFFIXES = [
  "sodico",
  "sodica",
  "potassico",
  "potassica",
  "calcico",
  "calcica",
  "magnesico",
  "magnesica",
];

function normalizeText(
  value
) {
  return String(
    value ??
      ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /ﬁ/g,
      "fi"
    )
    .replace(
      /ﬂ/g,
      "fl"
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
}

function removeHydrateSuffixes(
  value
) {
  let current =
    normalizeText(
      value
    );

  let changed =
    true;

  while (
    changed
  ) {
    changed =
      false;

    for (
      const suffix of
        HYDRATE_SUFFIXES
    ) {
      const normalizedSuffix =
        normalizeText(
          suffix
        );

      if (
        current.endsWith(
          " " +
            normalizedSuffix
        )
      ) {
        current =
          current.slice(
            0,
            -(
              normalizedSuffix.length +
              1
            )
          );

        changed =
          true;

        break;
      }
    }
  }

  return current.trim();
}

function derivePharmaceuticalBase(
  canonicalName
) {
  const normalized =
    removeHydrateSuffixes(
      canonicalName
    );

  for (
    const prefix of
      SALT_PREFIXES
  ) {
    const normalizedPrefix =
      normalizeText(
        prefix
      );

    if (
      normalized.startsWith(
        normalizedPrefix +
          " "
      )
    ) {
      const base =
        normalized
          .slice(
            normalizedPrefix.length +
              1
          )
          .trim();

      if (
        base
      ) {
        return {
          base,

          transformation:
            "salt_prefix",

          transformationDetail:
            normalizedPrefix,
        };
      }
    }
  }

  for (
    const suffix of
      IONIC_SUFFIXES
  ) {
    const normalizedSuffix =
      normalizeText(
        suffix
      );

    if (
      normalized.endsWith(
        " " +
          normalizedSuffix
      )
    ) {
      const base =
        normalized
          .slice(
            0,
            -(
              normalizedSuffix.length +
              1
            )
          )
          .trim();

      if (
        base
      ) {
        return {
          base,

          transformation:
            "ionic_suffix",

          transformationDetail:
            normalizedSuffix,
        };
      }
    }
  }

  return {
    base:
      normalized,

    transformation:
      "none",

    transformationDetail:
      null,
  };
}

async function loadAllActiveSubstances(
  supabase
) {
  const PAGE_SIZE =
    1000;

  const output = [];

  let from =
    0;

  let page =
    1;

  while (
    true
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "medication_substances"
        )
        .select(
          "id, canonical_name, canonical_name_normalized, external_id, active"
        )
        .eq(
          "active",
          true
        )
        .order(
          "canonical_name",
          {
            ascending:
              true,
          }
        )
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );

    if (
      error
    ) {
      throw new Error(
        "Falha ao carregar medication_substances: " +
          error.message
      );
    }

    const rows =
      data ??
      [];

    console.log(
      "   Página " +
        page +
        ": " +
        rows.length +
        " registro(s)"
    );

    output.push(
      ...rows
    );

    if (
      rows.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;

    page +=
      1;
  }

  return output;
}

function buildIndexes(
  rows
) {
  const exact =
    new Map();

  const pharmaceutical =
    new Map();

  for (
    const row of
      rows
  ) {
    const normalized =
      normalizeText(
        row.canonical_name_normalized ||
          row.canonical_name
      );

    const exactRows =
      exact.get(
        normalized
      ) ??
      [];

    exactRows.push(
      row
    );

    exact.set(
      normalized,
      exactRows
    );

    const derived =
      derivePharmaceuticalBase(
        row.canonical_name
      );

    if (
      derived.transformation ===
      "none"
    ) {
      continue;
    }

    const baseRows =
      pharmaceutical.get(
        derived.base
      ) ??
      [];

    baseRows.push(
      {
        ...row,

        ...derived,
      }
    );

    pharmaceutical.set(
      derived.base,
      baseRows
    );
  }

  return {
    exact,
    pharmaceutical,
  };
}

function compact(
  row
) {
  return {
    substanceId:
      row.id,

    catalogName:
      row.canonical_name,

    externalId:
      row.external_id,
  };
}

function classifyMatch(
  official,
  indexes
) {
  const exact =
    indexes.exact.get(
      official.normalized
    ) ??
      [];

  if (
    exact.length ===
    1
  ) {
    return {
      status:
        "matched",

      matchType:
        "exact",

      match:
        compact(
          exact[0]
        ),
    };
  }

  if (
    exact.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      matchType:
        "exact",

      candidates:
        exact.map(
          compact
        ),
    };
  }

  const pharmaceutical =
    indexes.pharmaceutical.get(
      official.normalized
    ) ??
      [];

  if (
    pharmaceutical.length ===
    1
  ) {
    const row =
      pharmaceutical[0];

    return {
      status:
        "matched",

      matchType:
        "pharmaceutical_equivalence",

      match: {
        ...compact(
          row
        ),

        transformation:
          row.transformation,

        transformationDetail:
          row.transformationDetail,
      },
    };
  }

  if (
    pharmaceutical.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      matchType:
        "pharmaceutical_equivalence",

      candidates:
        pharmaceutical.map(
          (
            row
          ) => ({
            ...compact(
              row
            ),

            transformation:
              row.transformation,

            transformationDetail:
              row.transformationDetail,
          })
        ),
    };
  }

  return {
    status:
      "unresolved",

    matchType:
      null,
  };
}

function flattenCurrentState(
  state
) {
  const output = [];

  for (
    const [
      regulatoryClass,
      list,
    ] of Object.entries(
      state.lists ??
        {}
    )
  ) {
    for (
      const substance of
        list.substances ??
          []
    ) {
      const aliases =
        substance.aliases ??
          [];

      const primary = {
        regulatoryClass,

        number:
          substance.number,

        officialName:
          substance.name,

        normalized:
          normalizeText(
            substance.name
          ),

        aliases,

        mentionedInAdendo:
          Boolean(
            substance.mentionedInAdendo
          ),

        addedByUpdate:
          substance.addedByUpdate ??
            96,
      };

      output.push(
        primary
      );
    }
  }

  return output;
}

function resolveByAliases(
  entry,
  indexes
) {
  const primary =
    classifyMatch(
      entry,
      indexes
    );

  if (
    primary.status !==
    "unresolved"
  ) {
    return primary;
  }

  const aliasMatches = [];

  for (
    const alias of
      entry.aliases ??
        []
  ) {
    const aliasEntry = {
      ...entry,

      normalized:
        normalizeText(
          alias
        ),
    };

    const result =
      classifyMatch(
        aliasEntry,
        indexes
      );

    if (
      result.status ===
      "matched"
    ) {
      aliasMatches.push(
        {
          alias,

          result,
        }
      );
    }

    if (
      result.status ===
      "ambiguous"
    ) {
      return {
        status:
          "ambiguous",

        matchType:
          "alias",

        candidates:
          result.candidates,

        alias,
      };
    }
  }

  if (
    aliasMatches.length ===
    1
  ) {
    return {
      ...aliasMatches[0]
        .result,

      matchType:
        "alias_" +
        aliasMatches[0]
          .result
          .matchType,

      matchedAlias:
        aliasMatches[0]
          .alias,
    };
  }

  if (
    aliasMatches.length >
    1
  ) {
    const uniqueIds =
      new Set(
        aliasMatches.map(
          (
            item
          ) =>
            item.result
              .match
              .substanceId
        )
      );

    if (
      uniqueIds.size ===
      1
    ) {
      return {
        ...aliasMatches[0]
          .result,

        matchType:
          "alias_" +
          aliasMatches[0]
            .result
            .matchType,

        matchedAlias:
          aliasMatches
            .map(
              (
                item
              ) =>
                item.alias
            )
            .join(
              " | "
            ),
      };
    }

    return {
      status:
        "ambiguous",

      matchType:
        "alias",

      candidates:
        aliasMatches.map(
          (
            item
          ) => ({
            alias:
              item.alias,

            ...item.result
              .match,
          })
        ),
    };
  }

  return primary;
}

function formatPercent(
  numerator,
  denominator
) {
  if (
    denominator <=
    0
  ) {
    return "0,0%";
  }

  return (
    (
      numerator /
        denominator *
        100
    ).toFixed(
      1
    ) +
    "%"
  ).replace(
    ".",
    ","
  );
}

async function main() {
  console.log(
    "🧠 VAULT — CURRENT SAFE REGULATORY CROSS-MATCH\n"
  );

  console.log(
    "🚫 Somente leitura do Supabase."
  );

  console.log(
    "🚫 Nenhuma regra será persistida."
  );

  console.log(
    "🚫 Classe stale/adendo explícito bloqueia candidatura automática.\n"
  );

  const state =
    JSON.parse(
      fs.readFileSync(
        INPUT,
        "utf8"
      )
    );

  if (
    state?.source?.update !==
    102
  ) {
    throw new Error(
      "Fonte não corresponde ao update 102."
    );
  }

  const staleClasses =
    new Set(
      state?.validation
        ?.staleAdendoClasses ??
        []
    );

  const entries =
    flattenCurrentState(
      state
    );

  console.log(
    "📜 Substâncias nominais update 102: " +
      entries.length
  );

  console.log(
    "⚠️ Classes stale: " +
      (
        [
          ...staleClasses,
        ].join(
          ", "
        ) ||
        "nenhuma"
      )
  );

  const supabase =
    createAdminClient();

  console.log(
    "\n📚 Carregando catálogo completo..."
  );

  const database =
    await loadAllActiveSubstances(
      supabase
    );

  console.log(
    "✅ " +
      database.length +
      " substâncias ativas carregadas.\n"
  );

  const indexes =
    buildIndexes(
      database
    );

  const provisionalCandidates = [];

  const blockedStaleAdendo = [];

  const blockedExplicitAdendo = [];

  const unsupportedRegulatoryModel = [];

  const ambiguous = [];

  const unresolved = [];

  const allMatched = [];

  for (
    const entry of
      entries
  ) {
    const matchResult =
      resolveByAliases(
        entry,
        indexes
      );

    if (
      matchResult.status ===
      "ambiguous"
    ) {
      ambiguous.push(
        {
          ...entry,

          ...matchResult,
        }
      );

      continue;
    }

    if (
      matchResult.status ===
      "unresolved"
    ) {
      unresolved.push(
        {
          ...entry,

          ...matchResult,
        }
      );

      continue;
    }

    const classRule =
      SUPPORTED_CLASS_MAP[
        entry.regulatoryClass
      ] ??
      null;

    const matchedEntry = {
      ...entry,

      ...matchResult,

      prescriptionModel:
        classRule
          ?.prescriptionModel ??
          null,

      vaultPrescriptionType:
        classRule
          ?.vaultPrescriptionType ??
          null,
    };

    allMatched.push(
      matchedEntry
    );

    if (
      !classRule
    ) {
      unsupportedRegulatoryModel.push(
        {
          ...matchedEntry,

          blockReason:
            "regulatory_class_not_representable_in_current_vault_model",
        }
      );

      continue;
    }

    if (
      staleClasses.has(
        entry.regulatoryClass
      )
    ) {
      blockedStaleAdendo.push(
        {
          ...matchedEntry,

          blockReason:
            "class_adendo_changed_after_snapshot_96",
        }
      );

      continue;
    }

    if (
      entry.mentionedInAdendo
    ) {
      blockedExplicitAdendo.push(
        {
          ...matchedEntry,

          blockReason:
            "substance_explicitly_mentioned_in_adendo",
        }
      );

      continue;
    }

    provisionalCandidates.push(
      {
        ...matchedEntry,

        candidateStatus:
          "provisional_only",

        safeForAutomaticPersistence:
          false,

        remainingReview:
          "prescription_semantics_and_effective_date",
      }
    );
  }

  function probe(
    name
  ) {
    const normalized =
      normalizeText(
        name
      );

    const collections = {
      provisionalCandidates,
      blockedStaleAdendo,
      blockedExplicitAdendo,
      unsupportedRegulatoryModel,
      ambiguous,
      unresolved,
    };

    for (
      const [
        bucket,
        items,
      ] of Object.entries(
        collections
      )
    ) {
      const match =
        items.find(
          (
            item
          ) =>
            item.normalized ===
              normalized ||
            (
              item.aliases ??
                []
            ).some(
              (
                alias
              ) =>
                normalizeText(
                  alias
                ) ===
                normalized
            )
        );

      if (
        match
      ) {
        return {
          bucket,
          item:
            match,
        };
      }
    }

    return {
      bucket:
        "not_found",

      item:
        null,
    };
  }

  const probes = {
    METADONA:
      probe(
        "Metadona"
      ),

    CLONAZEPAM:
      probe(
        "Clonazepam"
      ),

    CARISOPRODOL:
      probe(
        "Carisoprodol"
      ),

    ESTIRIPENTOL:
      probe(
        "Estiripentol"
      ),

    FENFLURAMINA:
      probe(
        "Fenfluramina"
      ),

    CENOBAMATO:
      probe(
        "Cenobamato"
      ),

    MMDPPA:
      probe(
        "MMDPPA"
      ),

    DIMETOCAINA:
      probe(
        "Dimetocaína"
      ),
  };

  /*
   * Invariantes de segurança.
   */
  if (
    probes.METADONA.bucket !==
    "provisionalCandidates"
  ) {
    throw new Error(
      "METADONA deveria estar entre candidatas provisórias."
    );
  }

  if (
    probes.CLONAZEPAM.bucket !==
    "blockedStaleAdendo"
  ) {
    throw new Error(
      "CLONAZEPAM deveria estar bloqueado por B1 stale."
    );
  }

  if (
    probes.CARISOPRODOL.bucket !==
      "blockedStaleAdendo" &&
    probes.CARISOPRODOL.bucket !==
      "unresolved"
  ) {
    throw new Error(
      "CARISOPRODOL caiu em bucket inesperado."
    );
  }

  if (
    provisionalCandidates.some(
      (
        item
      ) =>
        staleClasses.has(
          item.regulatoryClass
        )
    )
  ) {
    throw new Error(
      "Falha crítica: candidata provisória pertence a classe stale."
    );
  }

  if (
    provisionalCandidates.some(
      (
        item
      ) =>
        item.mentionedInAdendo
    )
  ) {
    throw new Error(
      "Falha crítica: candidata provisória é citada explicitamente em adendo."
    );
  }

  const result = {
    generatedAt:
      new Date()
        .toISOString(),

    mode:
      "read_only_current_regulatory_screening",

    source: {
      authority:
        "ANVISA",

      resolution:
        "RDC 1.036/2026",

      update:
        102,

      nominalState:
        "replayed_from_update_96",
    },

    safety: {
      automaticPersistence:
        false,

      staleAdendoClasses: [
        ...staleClasses,
      ].sort(),

      supportedClassMap:
        SUPPORTED_CLASS_MAP,
    },

    database: {
      activeSubstances:
        database.length,
    },

    summary: {
      officialNominal:
        entries.length,

      matched:
        allMatched.length,

      matchRate:
        entries.length
          ? allMatched.length /
            entries.length
          : 0,

      provisionalCandidates:
        provisionalCandidates.length,

      blockedStaleAdendo:
        blockedStaleAdendo.length,

      blockedExplicitAdendo:
        blockedExplicitAdendo.length,

      unsupportedRegulatoryModel:
        unsupportedRegulatoryModel.length,

      ambiguous:
        ambiguous.length,

      unresolved:
        unresolved.length,
    },

    probes,

    provisionalCandidates,

    blockedStaleAdendo,

    blockedExplicitAdendo,

    unsupportedRegulatoryModel,

    ambiguous,

    unresolved,
  };

  fs.mkdirSync(
    OUTPUT_DIR,
    {
      recursive:
        true,
    }
  );

  fs.writeFileSync(
    OUTPUT_JSON,
    JSON.stringify(
      result,
      null,
      2
    ) +
      "\n"
  );

  const lines = [];

  lines.push(
    "VAULT — CURRENT SAFE REGULATORY MATCH / UPDATE 102"
  );

  lines.push(
    "=".repeat(
      76
    )
  );

  lines.push(
    ""
  );

  lines.push(
    "Nominais oficiais:          " +
      entries.length
  );

  lines.push(
    "Matches de catálogo:        " +
      allMatched.length +
      " (" +
      formatPercent(
        allMatched.length,
        entries.length
      ) +
      ")"
  );

  lines.push(
    ""
  );

  lines.push(
    "Candidatas provisórias:     " +
      provisionalCandidates.length
  );

  lines.push(
    "Bloqueadas — adendo stale:  " +
      blockedStaleAdendo.length
  );

  lines.push(
    "Bloqueadas — adendo nominal:" +
      String(
        blockedExplicitAdendo.length
      ).padStart(
        5
      )
  );

  lines.push(
    "Modelo não representável:   " +
      unsupportedRegulatoryModel.length
  );

  lines.push(
    "Ambíguas:                   " +
      ambiguous.length
  );

  lines.push(
    "Não resolvidas:             " +
      unresolved.length
  );

  lines.push(
    ""
  );

  lines.push(
    "CLASSES STALE"
  );

  lines.push(
    "-".repeat(
      76
    )
  );

  lines.push(
    [
      ...staleClasses,
    ]
      .sort()
      .join(
        ", "
      )
  );

  lines.push(
    ""
  );

  lines.push(
    "PROBES"
  );

  lines.push(
    "-".repeat(
      76
    )
  );

  for (
    const [
      name,
      result,
    ] of Object.entries(
      probes
    )
  ) {
    const item =
      result.item;

    lines.push(
      name +
        ": " +
        result.bucket +
        (
          item
            ? " | " +
              item.regulatoryClass +
              " | " +
              (
                item.match
                  ?.catalogName ??
                "sem-match"
              )
            : ""
        )
    );
  }

  lines.push(
    ""
  );

  lines.push(
    "IMPORTANTE"
  );

  lines.push(
    "- provisionalCandidates NÃO significa autorização de persistência."
  );

  lines.push(
    "- Ainda falta interpretar semanticamente os adendos e datas de vigência."
  );

  lines.push(
    "- Classes stale nunca entram nas candidatas provisórias."
  );

  lines.push(
    "- Substâncias citadas nominalmente em adendo também ficam bloqueadas."
  );

  lines.push(
    "- Classes sem tradução segura para o modelo atual do Vault ficam separadas."
  );

  fs.writeFileSync(
    OUTPUT_TXT,
    lines.join(
      "\n"
    ) +
      "\n"
  );

  console.log(
    "📊 CURRENT SAFE MATCH"
  );

  console.log(
    "────────────────────────────────────────"
  );

  console.log(
    "Nominais update 102:       " +
      entries.length
  );

  console.log(
    "Matches catálogo:          " +
      allMatched.length +
      " (" +
      formatPercent(
        allMatched.length,
        entries.length
      ) +
      ")"
  );

  console.log(
    "Candidatas provisórias:    " +
      provisionalCandidates.length
  );

  console.log(
    "Bloq. adendo stale:        " +
      blockedStaleAdendo.length
  );

  console.log(
    "Bloq. adendo explícito:    " +
      blockedExplicitAdendo.length
  );

  console.log(
    "Modelo não representável:  " +
      unsupportedRegulatoryModel.length
  );

  console.log(
    "Ambíguas:                  " +
      ambiguous.length
  );

  console.log(
    "Não resolvidas:            " +
      unresolved.length
  );

  console.log(
    "────────────────────────────────────────\n"
  );

  console.log(
    "🔬 PROBES"
  );

  for (
    const [
      name,
      result,
    ] of Object.entries(
      probes
    )
  ) {
    const item =
      result.item;

    console.log(
      (
        result.bucket ===
        "provisionalCandidates"
          ? "🟡"
          : result.bucket.startsWith(
              "blocked"
            )
          ? "⚠️"
          : result.bucket ===
            "unsupportedRegulatoryModel"
          ? "🔒"
          : "❌"
      ) +
        " " +
        name +
        " → " +
        result.bucket +
        (
          item
            ? " → LISTA " +
              item.regulatoryClass +
              (
                item.match
                  ?.catalogName
                  ? " → " +
                    item.match
                      .catalogName
                  : ""
              )
            : ""
        )
    );
  }

  console.log(
    "\n🟡 Candidata provisória ≠ regra autorizada."
  );

  console.log(
    "🚫 automaticPersistence = false"
  );

  console.log(
    "🚫 Nenhuma escrita no Supabase."
  );

  console.log(
    "\n📝 JSON:"
  );

  console.log(
    "   " +
      OUTPUT_JSON
  );

  console.log(
    "\n📝 Resumo:"
  );

  console.log(
    "   " +
      OUTPUT_TXT
  );

  console.log(
    "\n✅ Current safe matcher concluído."
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error(
        "\n❌ CURRENT SAFE MATCHER FALHOU:"
      );

      console.error(
        error instanceof
          Error
          ? error.stack ||
              error.message
          : error
      );

      console.error(
        "\n🚫 Nenhuma escrita no Supabase."
      );

      process.exit(
        1
      );
    }
  );
