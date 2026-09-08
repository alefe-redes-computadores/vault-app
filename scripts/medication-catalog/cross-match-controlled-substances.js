// scripts/medication-catalog/cross-match-controlled-substances.js

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
    ".medication-catalog-audit/structured/controlled-lists-update-96.json"
  );

const OUTPUT_DIR =
  path.join(
    ROOT,
    ".medication-catalog-audit/structured"
  );

const OUTPUT_JSON =
  path.join(
    OUTPUT_DIR,
    "controlled-substances-cross-match-update-96.json"
  );

const OUTPUT_TXT =
  path.join(
    OUTPUT_DIR,
    "controlled-substances-cross-match-update-96-summary.txt"
  );

/*
 * Prefixos considerados formas salinas/farmacêuticas
 * explícitas.
 *
 * Regra propositalmente conservadora:
 *
 *   "cloridrato de metadona" -> "metadona"
 *
 * Não removemos palavras arbitrárias nem usamos fuzzy.
 */
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

  /*
   * Primeiro: sal explícito "X de SUBSTÂNCIA".
   */
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

          detail:
            normalizedPrefix,
        };
      }
    }
  }

  /*
   * Segundo: formas como "fenobarbital sódico".
   *
   * Também é conservador: só remove um conjunto explícito
   * de qualificadores iônicos no final.
   */
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

          detail:
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

    detail:
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

  let pageNumber =
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

    const page =
      data ??
      [];

    console.log(
      "   Página " +
        pageNumber +
        ": " +
        page.length +
        " registro(s)"
    );

    output.push(
      ...page
    );

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;

    pageNumber +=
      1;
  }

  return output;
}

function flattenOfficialLists(
  structured
) {
  const output = [];

  for (
    const [
      regulatoryClass,
      list,
    ] of Object.entries(
      structured.lists ??
        {}
    )
  ) {
    for (
      const substance of
        list.substances ??
        []
    ) {
      output.push(
        {
          regulatoryClass,

          number:
            substance.number,

          officialName:
            substance.name,

          normalized:
            normalizeText(
              substance.name
            ),

          mentionedInAdendo:
            Boolean(
              substance.mentionedInAdendo
            ),
        }
      );
    }
  }

  return output;
}

function buildIndexes(
  databaseSubstances
) {
  const exact =
    new Map();

  const pharmaceuticalBase =
    new Map();

  for (
    const row of
      databaseSubstances
  ) {
    const canonicalNormalized =
      normalizeText(
        row.canonical_name_normalized ||
          row.canonical_name
      );

    const exactRows =
      exact.get(
        canonicalNormalized
      ) ??
      [];

    exactRows.push(
      row
    );

    exact.set(
      canonicalNormalized,
      exactRows
    );

    const derived =
      derivePharmaceuticalBase(
        row.canonical_name
      );

    /*
     * Só entra no índice farmacêutico se realmente houve
     * transformação.
     *
     * Isso evita duplicar todo o índice exato.
     */
    if (
      derived.transformation ===
      "none"
    ) {
      continue;
    }

    const baseRows =
      pharmaceuticalBase.get(
        derived.base
      ) ??
      [];

    baseRows.push(
      {
        ...row,

        pharmaceuticalBase:
          derived.base,

        transformation:
          derived.transformation,

        transformationDetail:
          derived.detail,
      }
    );

    pharmaceuticalBase.set(
      derived.base,
      baseRows
    );
  }

  return {
    exact,
    pharmaceuticalBase,
  };
}

function compactMatch(
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

function classifyEntry(
  entry,
  indexes
) {
  /*
   * Nível 1 — igualdade exata.
   */
  const exactMatches =
    indexes.exact.get(
      entry.normalized
    ) ??
      [];

  if (
    exactMatches.length ===
    1
  ) {
    return {
      status:
        "matched",

      matchType:
        "exact",

      confidence:
        "high",

      match:
        compactMatch(
          exactMatches[0]
        ),
    };
  }

  if (
    exactMatches.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      matchType:
        "exact",

      confidence:
        "high",

      candidates:
        exactMatches.map(
          compactMatch
        ),
    };
  }

  /*
   * Nível 2 — equivalência farmacêutica conservadora.
   *
   * Ex.:
   * METADONA
   *   ↔ cloridrato de metadona
   *
   * Se houver mais de uma forma candidata, NÃO escolhemos.
   */
  const saltMatches =
    indexes
      .pharmaceuticalBase
      .get(
        entry.normalized
      ) ??
      [];

  if (
    saltMatches.length ===
    1
  ) {
    const candidate =
      saltMatches[0];

    return {
      status:
        "matched",

      matchType:
        "pharmaceutical_equivalence",

      confidence:
        "medium",

      match: {
        ...compactMatch(
          candidate
        ),

        transformation:
          candidate.transformation,

        transformationDetail:
          candidate.transformationDetail,
      },
    };
  }

  if (
    saltMatches.length >
    1
  ) {
    return {
      status:
        "ambiguous",

      matchType:
        "pharmaceutical_equivalence",

      confidence:
        "medium",

      candidates:
        saltMatches.map(
          (
            candidate
          ) => ({
            ...compactMatch(
              candidate
            ),

            transformation:
              candidate.transformation,

            transformationDetail:
              candidate.transformationDetail,
          })
        ),
    };
  }

  return {
    status:
      "unresolved",

    matchType:
      null,

    confidence:
      null,
  };
}

function formatPercent(
  numerator,
  denominator
) {
  if (
    !denominator
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
    "🧠 VAULT — PHARMACEUTICAL CROSS-MATCH\n"
  );

  console.log(
    "🚫 Somente leitura do Supabase."
  );

  console.log(
    "🚫 Sem fuzzy."
  );

  console.log(
    "🚫 Nenhuma regra regulatória será persistida.\n"
  );

  const structured =
    JSON.parse(
      fs.readFileSync(
        INPUT,
        "utf8"
      )
    );

  const officialEntries =
    flattenOfficialLists(
      structured
    );

  console.log(
    "📜 Itens oficiais: " +
      officialEntries.length
  );

  const supabase =
    createAdminClient();

  console.log(
    "\n📚 Carregando catálogo completo..."
  );

  const databaseSubstances =
    await loadAllActiveSubstances(
      supabase
    );

  console.log(
    "✅ " +
      databaseSubstances.length +
      " substâncias carregadas.\n"
  );

  const indexes =
    buildIndexes(
      databaseSubstances
    );

  const matched = [];

  const ambiguous = [];

  const unresolved = [];

  for (
    const entry of
      officialEntries
  ) {
    const result =
      classifyEntry(
        entry,
        indexes
      );

    if (
      result.status ===
      "matched"
    ) {
      matched.push(
        {
          ...entry,
          ...result,
        }
      );

      continue;
    }

    if (
      result.status ===
      "ambiguous"
    ) {
      ambiguous.push(
        {
          ...entry,
          ...result,
        }
      );

      continue;
    }

    unresolved.push(
      {
        ...entry,
        ...result,
      }
    );
  }

  const exactMatches =
    matched.filter(
      (
        item
      ) =>
        item.matchType ===
        "exact"
    );

  const pharmaceuticalMatches =
    matched.filter(
      (
        item
      ) =>
        item.matchType ===
        "pharmaceutical_equivalence"
    );

  const byClass = {};

  for (
    const entry of
      officialEntries
  ) {
    byClass[
      entry.regulatoryClass
    ] ??= {
      official:
        0,

      matched:
        0,

      exact:
        0,

      pharmaceutical:
        0,

      ambiguous:
        0,

      unresolved:
        0,
    };

    byClass[
      entry.regulatoryClass
    ].official +=
      1;
  }

  for (
    const entry of
      matched
  ) {
    const stats =
      byClass[
        entry.regulatoryClass
      ];

    stats.matched +=
      1;

    if (
      entry.matchType ===
      "exact"
    ) {
      stats.exact +=
        1;
    } else {
      stats.pharmaceutical +=
        1;
    }
  }

  for (
    const entry of
      ambiguous
  ) {
    byClass[
      entry.regulatoryClass
    ].ambiguous +=
      1;
  }

  for (
    const entry of
      unresolved
  ) {
    byClass[
      entry.regulatoryClass
    ].unresolved +=
      1;
  }

  function probe(
    name
  ) {
    const normalized =
      normalizeText(
        name
      );

    return {
      matched:
        matched.filter(
          (
            item
          ) =>
            item.normalized ===
            normalized
        ),

      ambiguous:
        ambiguous.filter(
          (
            item
          ) =>
            item.normalized ===
            normalized
        ),

      unresolved:
        unresolved.filter(
          (
            item
          ) =>
            item.normalized ===
            normalized
        ),
    };
  }

  const probes = {
    METADONA:
      probe(
        "METADONA"
      ),

    MORFINA:
      probe(
        "MORFINA"
      ),

    FENTANILA:
      probe(
        "FENTANILA"
      ),

    LISDEXANFETAMINA:
      probe(
        "LISDEXANFETAMINA"
      ),

    ANFETAMINA:
      probe(
        "ANFETAMINA"
      ),

    CLONAZEPAM:
      probe(
        "CLONAZEPAM"
      ),

    TRAMADOL:
      probe(
        "TRAMADOL"
      ),

    CODEINA:
      probe(
        "CODEÍNA"
      ),

    FENOBARBITAL:
      probe(
        "FENOBARBITAL"
      ),
  };

  const output = {
    generatedAt:
      new Date()
        .toISOString(),

    mode:
      "read_only_pharmaceutical_cross_match",

    source: {
      authority:
        "ANVISA",

      resolution:
        "RDC 985/2025",

      update:
        96,
    },

    algorithm: {
      levels: [
        "exact",
        "pharmaceutical_equivalence",
        "ambiguous",
        "unresolved",
      ],

      fuzzy:
        false,

      exactWins:
        true,
    },

    database: {
      activeSubstances:
        databaseSubstances.length,
    },

    summary: {
      official:
        officialEntries.length,

      matched:
        matched.length,

      exact:
        exactMatches.length,

      pharmaceutical:
        pharmaceuticalMatches.length,

      ambiguous:
        ambiguous.length,

      unresolved:
        unresolved.length,

      matchRate:
        officialEntries.length
          ? matched.length /
            officialEntries.length
          : 0,
    },

    byClass,

    probes,

    matched,

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
      output,
      null,
      2
    ) +
      "\n"
  );

  const summary = [];

  summary.push(
    "VAULT — PHARMACEUTICAL CROSS-MATCH / UPDATE 96"
  );

  summary.push(
    "=".repeat(
      76
    )
  );

  summary.push(
    ""
  );

  summary.push(
    "Oficiais:                 " +
      officialEntries.length
  );

  summary.push(
    "Casamentos totais:        " +
      matched.length +
      " (" +
      formatPercent(
        matched.length,
        officialEntries.length
      ) +
      ")"
  );

  summary.push(
    "  exatos:                 " +
      exactMatches.length
  );

  summary.push(
    "  equivalência farmac.:   " +
      pharmaceuticalMatches.length
  );

  summary.push(
    "Ambíguos:                 " +
      ambiguous.length
  );

  summary.push(
    "Não resolvidos:           " +
      unresolved.length
  );

  summary.push(
    ""
  );

  summary.push(
    "POR LISTA"
  );

  summary.push(
    "-".repeat(
      76
    )
  );

  for (
    const regulatoryClass of
      Object.keys(
        byClass
      ).sort()
  ) {
    const stats =
      byClass[
        regulatoryClass
      ];

    summary.push(
      regulatoryClass.padEnd(
        3
      ) +
        " total=" +
        String(
          stats.official
        ).padStart(
          4
        ) +
        " match=" +
        String(
          stats.matched
        ).padStart(
          4
        ) +
        " exact=" +
        String(
          stats.exact
        ).padStart(
          4
        ) +
        " pharma=" +
        String(
          stats.pharmaceutical
        ).padStart(
          4
        ) +
        " amb=" +
        String(
          stats.ambiguous
        ).padStart(
          3
        ) +
        " unresolved=" +
        String(
          stats.unresolved
        ).padStart(
          4
        )
    );
  }

  summary.push(
    ""
  );

  summary.push(
    "PROBES"
  );

  summary.push(
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
    if (
      result.matched.length ===
      1
    ) {
      const item =
        result.matched[
          0
        ];

      summary.push(
        name +
          ": " +
          item.regulatoryClass +
          " #" +
          item.number +
          " → " +
          item.match.catalogName +
          " [" +
          item.matchType +
          "]"
      );

      continue;
    }

    if (
      result.ambiguous.length >
      0
    ) {
      summary.push(
        name +
          ": AMBIGUOUS (" +
          result.ambiguous[
            0
          ].candidates
            .map(
              (
                candidate
              ) =>
                candidate.catalogName
            )
            .join(
              " | "
            ) +
          ")"
      );

      continue;
    }

    summary.push(
      name +
        ": UNRESOLVED"
    );
  }

  summary.push(
    ""
  );

  summary.push(
    "SEGURANÇA"
  );

  summary.push(
    "- Match exato sempre vence."
  );

  summary.push(
    "- Equivalência farmacêutica usa somente padrões de sal/hidrato explicitamente conhecidos."
  );

  summary.push(
    "- Mais de um candidato = ambíguo; nenhum é escolhido."
  );

  summary.push(
    "- Não há fuzzy nem substring."
  );

  summary.push(
    "- Update 96 ainda não é a versão vigente 102."
  );

  fs.writeFileSync(
    OUTPUT_TXT,
    summary.join(
      "\n"
    ) +
      "\n"
  );

  console.log(
    "📊 PHARMACEUTICAL MATCH"
  );

  console.log(
    "────────────────────────────────────────"
  );

  console.log(
    "Oficiais:              " +
      officialEntries.length
  );

  console.log(
    "Casados:               " +
      matched.length +
      " (" +
      formatPercent(
        matched.length,
        officialEntries.length
      ) +
      ")"
  );

  console.log(
    "  Exatos:              " +
      exactMatches.length
  );

  console.log(
    "  Equiv. farmacêutica: " +
      pharmaceuticalMatches.length
  );

  console.log(
    "Ambíguos:              " +
      ambiguous.length
  );

  console.log(
    "Não resolvidos:        " +
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
    if (
      result.matched.length ===
      1
    ) {
      const item =
        result.matched[
          0
        ];

      console.log(
        "✅ " +
          name +
          " → LISTA " +
          item.regulatoryClass +
          " #" +
          item.number +
          " → " +
          item.match.catalogName +
          " [" +
          item.matchType +
          "]"
      );

      continue;
    }

    if (
      result.ambiguous.length >
      0
    ) {
      console.log(
        "⚠️ " +
          name +
          " → AMBÍGUO:"
      );

      for (
        const candidate of
          result.ambiguous[
            0
          ].candidates
      ) {
        console.log(
          "   • " +
            candidate.catalogName
        );
      }

      continue;
    }

    console.log(
      "❌ " +
        name +
        " → não resolvido"
    );
  }

  /*
   * Probes mínimos da arquitetura.
   *
   * Metadona precisa resolver por equivalência farmacêutica.
   * Clonazepam precisa continuar resolvendo por match exato.
   */
  const metadona =
    probes.METADONA
      .matched[
        0
      ];

  const clonazepam =
    probes.CLONAZEPAM
      .matched[
        0
      ];

  if (
    !metadona ||
    metadona.regulatoryClass !==
      "A1" ||
    metadona.matchType !==
      "pharmaceutical_equivalence"
  ) {
    throw new Error(
      "METADONA não resolveu como A1 por equivalência farmacêutica."
    );
  }

  if (
    !clonazepam ||
    clonazepam.regulatoryClass !==
      "B1" ||
    clonazepam.matchType !==
      "exact"
  ) {
    throw new Error(
      "CLONAZEPAM não resolveu como B1 por match exato."
    );
  }

  /*
   * ANFETAMINA NÃO pode casar com LISDEXANFETAMINA.
   */
  const anfetamina =
    probes.ANFETAMINA;

  if (
    anfetamina.matched.some(
      (
        item
      ) =>
        normalizeText(
          item.match.catalogName
        ) ===
        normalizeText(
          "dimesilato de lisdexanfetamina"
        )
    )
  ) {
    throw new Error(
      "Falso positivo crítico: ANFETAMINA casou com LISDEXANFETAMINA."
    );
  }

  console.log(
    "\n✅ Probe crítico METADONA validado."
  );

  console.log(
    "✅ Probe crítico CLONAZEPAM validado."
  );

  console.log(
    "✅ ANFETAMINA não confundida com LISDEXANFETAMINA."
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
    "\n🚫 Nenhuma escrita no Supabase."
  );

  console.log(
    "✅ Pharmaceutical matcher concluído."
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error(
        "\n❌ PHARMACEUTICAL MATCHER FALHOU:"
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
