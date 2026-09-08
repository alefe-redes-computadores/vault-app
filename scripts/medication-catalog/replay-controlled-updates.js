// scripts/medication-catalog/replay-controlled-updates.js

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT =
  path.resolve(
    __dirname,
    "../.."
  );

const BASE_FILE =
  path.join(
    ROOT,
    ".medication-catalog-audit/structured/controlled-lists-update-96.json"
  );

const OFFICIAL_PAGE_FILE =
  path.join(
    ROOT,
    ".medication-catalog-audit/sources/anvisa-controlled-substances-current.html"
  );

const OUTPUT_DIR =
  path.join(
    ROOT,
    ".medication-catalog-audit/structured"
  );

const OUTPUT_JSON =
  path.join(
    OUTPUT_DIR,
    "controlled-lists-update-102-nominal.json"
  );

const OUTPUT_TXT =
  path.join(
    OUTPUT_DIR,
    "controlled-lists-update-102-nominal-summary.txt"
  );

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

function clone(
  value
) {
  return JSON.parse(
    JSON.stringify(
      value
    )
  );
}

function findByName(
  list,
  name
) {
  const normalized =
    normalizeText(
      name
    );

  return (
    list.substances ??
      []
  ).find(
    (
      item
    ) =>
      normalizeText(
        item.name
      ) ===
      normalized
  );
}

function addSubstance(
  state,
  regulatoryClass,
  name,
  update,
  aliases = []
) {
  const list =
    state.lists[
      regulatoryClass
    ];

  if (
    !list
  ) {
    throw new Error(
      "Lista inexistente: " +
        regulatoryClass
    );
  }

  const existing =
    findByName(
      list,
      name
    );

  if (
    existing
  ) {
    throw new Error(
      "Inclusão duplicada em " +
        regulatoryClass +
        ": " +
        name
    );
  }

  const maxNumber =
    Math.max(
      0,
      ...(
        list.substances ??
          []
      ).map(
        (
          item
        ) =>
          Number(
            item.number
          ) ||
          0
      )
    );

  list.substances.push(
    {
      number:
        maxNumber +
        1,

      name,

      normalized:
        normalizeText(
          name
        ),

      aliases,

      mentionedInAdendo:
        false,

      addedByUpdate:
        update,

      syntheticSequenceNumber:
        true,
    }
  );
}

function removeSubstance(
  state,
  regulatoryClass,
  name,
  update
) {
  const list =
    state.lists[
      regulatoryClass
    ];

  if (
    !list
  ) {
    throw new Error(
      "Lista inexistente: " +
        regulatoryClass
    );
  }

  const normalized =
    normalizeText(
      name
    );

  const matches =
    list.substances.filter(
      (
        item
      ) =>
        normalizeText(
          item.name
        ) ===
        normalized
    );

  if (
    matches.length !==
    1
  ) {
    throw new Error(
      "Exclusão esperava exatamente 1 ocorrência de " +
        name +
        " em " +
        regulatoryClass +
        "; encontrou " +
        matches.length
    );
  }

  list.substances =
    list.substances.filter(
      (
        item
      ) =>
        normalizeText(
          item.name
        ) !==
        normalized
    );

  state.removedSubstances.push(
    {
      regulatoryClass,

      name,

      normalized,

      removedByUpdate:
        update,
    }
  );
}

function markAdendoChanged(
  state,
  regulatoryClass,
  update,
  change
) {
  const list =
    state.lists[
      regulatoryClass
    ];

  if (
    !list
  ) {
    throw new Error(
      "Lista inexistente para adendo: " +
        regulatoryClass
    );
  }

  list.adendoFreshness ??= {
    snapshotUpdate:
      96,

    current:
      true,

    changedAfterSnapshot:
      [],
  };

  list.adendoFreshness.current =
    false;

  list.adendoFreshness.changedAfterSnapshot.push(
    {
      update,
      change,
    }
  );
}

function countSubstances(
  state
) {
  return Object.values(
    state.lists
  ).reduce(
    (
      total,
      list
    ) =>
      total +
      (
        list.substances ??
          []
      ).length,
    0
  );
}

function findProbe(
  state,
  name
) {
  const normalized =
    normalizeText(
      name
    );

  const matches = [];

  for (
    const [
      regulatoryClass,
      list,
    ] of Object.entries(
      state.lists
    )
  ) {
    for (
      const item of
        list.substances ??
        []
    ) {
      const names = [
        item.name,
        ...(
          item.aliases ??
            []
        ),
      ];

      if (
        names.some(
          (
            candidate
          ) =>
            normalizeText(
              candidate
            ) ===
            normalized
        )
      ) {
        matches.push(
          {
            regulatoryClass,
            number:
              item.number,
            name:
              item.name,
            aliases:
              item.aliases ??
                [],
            addedByUpdate:
              item.addedByUpdate ??
                96,
          }
        );
      }
    }
  }

  return matches;
}

function assertProbe(
  state,
  name,
  expectedClass,
  expectedCount = 1
) {
  const matches =
    findProbe(
      state,
      name
    );

  if (
    matches.length !==
    expectedCount
  ) {
    throw new Error(
      name +
        ": esperado " +
        expectedCount +
        " match(es), encontrado " +
        matches.length
    );
  }

  if (
    expectedCount >
      0 &&
    matches[0]
      .regulatoryClass !==
      expectedClass
  ) {
    throw new Error(
      name +
        ": esperado " +
        expectedClass +
        ", encontrado " +
        matches[0]
          .regulatoryClass
    );
  }
}

function main() {
  console.log(
    "🧠 VAULT — REPLAY NOMINAL ANVISA 97 → 102\n"
  );

  console.log(
    "🚫 Offline."
  );

  console.log(
    "🚫 Não acessa Supabase."
  );

  console.log(
    "🚫 Adendos alterados não serão considerados vigentes automaticamente.\n"
  );

  const base =
    JSON.parse(
      fs.readFileSync(
        BASE_FILE,
        "utf8"
      )
    );

  if (
    base?.source?.update !==
    96
  ) {
    throw new Error(
      "Base não corresponde ao update 96."
    );
  }

  const officialHtml =
    fs.readFileSync(
      OFFICIAL_PAGE_FILE,
      "utf8"
    );

  const pageNormalized =
    normalizeText(
      officialHtml.replace(
        /<[^>]+>/g,
        " "
      )
    );

  const pageChecks = [
    "carisoprodol",
    "estiripentol",
    "fenfluramina",
    "cenobamato",
    "protodesnitazeno",
    "desalquilgidazepam",
    "nmdmsb",
    "fenibut",
    "mmdppa",
    "dimetocaina",
  ];

  for (
    const check of
      pageChecks
  ) {
    if (
      !pageNormalized.includes(
        normalizeText(
          check
        )
      )
    ) {
      throw new Error(
        "Página oficial congelada não contém: " +
          check
      );
    }
  }

  const state =
    clone(
      base
    );

  state.source = {
    authority:
      "ANVISA",

    baseResolution:
      "RDC 985/2025",

    baseUpdate:
      96,

    currentResolution:
      "RDC 1.036/2026",

    update:
      102,

    reconstruction:
      "official_page_nominal_delta_replay",

    importantLimitation:
      "Nominal list membership was replayed through update 102. Adenda changed after update 96 remain explicitly stale until their full official text is reconstructed.",
  };

  state.removedSubstances =
    [];

  for (
    const list of
      Object.values(
        state.lists
      )
  ) {
    list.adendoFreshness = {
      snapshotUpdate:
        96,

      current:
        true,

      changedAfterSnapshot:
        [],
    };
  }

  state.appliedUpdates = [];

  // ==========================================================
  // UPDATE 97 — RDC 999/2025
  // ==========================================================

  addSubstance(
    state,
    "B1",
    "Carisoprodol",
    97
  );

  addSubstance(
    state,
    "C1",
    "Estiripentol",
    97
  );

  markAdendoChanged(
    state,
    "B1",
    97,
    "Inclusão do adendo 16"
  );

  state.appliedUpdates.push(
    {
      update:
        97,

      resolution:
        "RDC 999/2025",

      resolutionDate:
        "2025-11-24",

      effectiveDate:
        null,

      effectiveDateVerified:
        false,

      nominalChanges: [
        "B1 + Carisoprodol",
        "C1 + Estiripentol",
      ],

      adendoChanges: [
        "B1: inclusão do adendo 16",
      ],
    }
  );

  // ==========================================================
  // UPDATE 98 — RDC 1.011/2026
  // ==========================================================

  markAdendoChanged(
    state,
    "C1",
    98,
    "Inclusão do adendo 15"
  );

  markAdendoChanged(
    state,
    "E",
    98,
    "Inclusão dos adendos 13, 14 e 15"
  );

  state.appliedUpdates.push(
    {
      update:
        98,

      resolution:
        "RDC 1.011/2026",

      resolutionDate:
        "2026-01-30",

      effectiveDate:
        "2026-08-04",

      effectiveDateVerified:
        true,

      nominalChanges:
        [],

      adendoChanges: [
        "C1: inclusão do adendo 15",
        "E: inclusão dos adendos 13, 14 e 15",
      ],
    }
  );

  // ==========================================================
  // UPDATE 99 — RDC 1.017/2026
  // ==========================================================

  addSubstance(
    state,
    "A3",
    "Fenfluramina",
    99
  );

  addSubstance(
    state,
    "C1",
    "Cenobamato",
    99
  );

  removeSubstance(
    state,
    "F4",
    "Fenfluramina",
    99
  );

  markAdendoChanged(
    state,
    "A3",
    99,
    "Alteração do adendo 4"
  );

  state.appliedUpdates.push(
    {
      update:
        99,

      resolution:
        "RDC 1.017/2026",

      resolutionDate:
        "2026-02-20",

      effectiveDate:
        null,

      effectiveDateVerified:
        false,

      nominalChanges: [
        "A3 + Fenfluramina",
        "C1 + Cenobamato",
        "F4 - Fenfluramina",
      ],

      adendoChanges: [
        "A3: alteração do adendo 4",
      ],
    }
  );

  // ==========================================================
  // UPDATE 100 — RDC 1.021/2026
  // ==========================================================

  addSubstance(
    state,
    "F1",
    "Protodesnitazeno",
    100
  );

  addSubstance(
    state,
    "F2",
    "Desalquilgidazepam",
    100
  );

  addSubstance(
    state,
    "F2",
    "NMDMSB",
    100
  );

  addSubstance(
    state,
    "F4",
    "Fenibut",
    100
  );

  markAdendoChanged(
    state,
    "F2",
    100,
    "Alteração do adendo 16"
  );

  state.appliedUpdates.push(
    {
      update:
        100,

      resolution:
        "RDC 1.021/2026",

      resolutionDate:
        "2026-04-09",

      effectiveDate:
        null,

      effectiveDateVerified:
        false,

      nominalChanges: [
        "F1 + Protodesnitazeno",
        "F2 + Desalquilgidazepam",
        "F2 + NMDMSB",
        "F4 + Fenibut",
      ],

      adendoChanges: [
        "F2: alteração do adendo 16",
      ],
    }
  );

  // ==========================================================
  // UPDATE 101 — RDC 1.023/2026
  // ==========================================================

  for (
    const [
      regulatoryClass,
      change,
    ] of [
      [
        "A3",
        "Exclusão dos adendos 7, 8 e 9; inclusão dos adendos 10, 11 e 12",
      ],
      [
        "B1",
        "Exclusão do adendo 13",
      ],
      [
        "C1",
        "Inclusão do adendo 15",
      ],
      [
        "E",
        "Exclusão dos adendos 10 e 11; inclusão dos adendos 13, 14, 15, 16 e 17",
      ],
    ]
  ) {
    markAdendoChanged(
      state,
      regulatoryClass,
      101,
      change
    );
  }

  state.appliedUpdates.push(
    {
      update:
        101,

      resolution:
        "RDC 1.023/2026",

      resolutionDate:
        "2026-05-11",

      effectiveDate:
        null,

      effectiveDateVerified:
        false,

      nominalChanges:
        [],

      adendoChanges: [
        "A3: substituição de adendos",
        "B1: exclusão do adendo 13",
        "C1: inclusão do adendo 15",
        "E: substituição/inclusão de adendos",
      ],
    }
  );

  // ==========================================================
  // UPDATE 102 — RDC 1.036/2026
  // ==========================================================

  addSubstance(
    state,
    "D1",
    "MMDPPA ou alfa-metil-3,4-metilenodioxifenilpropionamida",
    102,
    [
      "MMDPPA",
      "alfa-metil-3,4-metilenodioxifenilpropionamida",
    ]
  );

  addSubstance(
    state,
    "F1",
    "Dimetocaína",
    102
  );

  state.appliedUpdates.push(
    {
      update:
        102,

      resolution:
        "RDC 1.036/2026",

      resolutionDate:
        "2026-07-09",

      effectiveDate:
        null,

      effectiveDateVerified:
        false,

      nominalChanges: [
        "D1 + MMDPPA / alfa-metil-3,4-metilenodioxifenilpropionamida",
        "F1 + Dimetocaína",
      ],

      adendoChanges:
        [],
    }
  );

  // ==========================================================
  // PROBES / INVARIANTES
  // ==========================================================

  assertProbe(
    state,
    "Metadona",
    "A1"
  );

  assertProbe(
    state,
    "Clonazepam",
    "B1"
  );

  assertProbe(
    state,
    "Carisoprodol",
    "B1"
  );

  assertProbe(
    state,
    "Estiripentol",
    "C1"
  );

  assertProbe(
    state,
    "Fenfluramina",
    "A3"
  );

  assertProbe(
    state,
    "Cenobamato",
    "C1"
  );

  assertProbe(
    state,
    "Protodesnitazeno",
    "F1"
  );

  assertProbe(
    state,
    "Desalquilgidazepam",
    "F2"
  );

  assertProbe(
    state,
    "NMDMSB",
    "F2"
  );

  assertProbe(
    state,
    "Fenibut",
    "F4"
  );

  assertProbe(
    state,
    "MMDPPA",
    "D1"
  );

  assertProbe(
    state,
    "Dimetocaína",
    "F1"
  );

  const f4Fenfluramine =
    (
      state.lists
        .F4
        .substances ??
        []
    ).filter(
      (
        item
      ) =>
        normalizeText(
          item.name
        ) ===
        normalizeText(
          "Fenfluramina"
        )
    );

  if (
    f4Fenfluramine.length !==
    0
  ) {
    throw new Error(
      "Fenfluramina ainda existe em F4 após update 99."
    );
  }

  const staleAdendoClasses =
    Object.entries(
      state.lists
    )
      .filter(
        (
          [
            ,
            list,
          ]
        ) =>
          list
            .adendoFreshness
            ?.current ===
          false
      )
      .map(
        (
          [
            regulatoryClass,
          ]
        ) =>
          regulatoryClass
      )
      .sort();

  state.validation = {
    nominalState:
      "update_102",

    nominalReplayComplete:
      true,

    adendoState:
      "partially_stale",

    staleAdendoClasses,

    safeForAutomaticPrescriptionRules:
      false,
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
      state,
      null,
      2
    ) +
      "\n"
  );

  const summary = [];

  summary.push(
    "VAULT — ANVISA NOMINAL STATE / UPDATE 102"
  );

  summary.push(
    "=".repeat(
      72
    )
  );

  summary.push(
    ""
  );

  summary.push(
    "Base:     Update 96 / RDC 985/2025"
  );

  summary.push(
    "Current:  Update 102 / RDC 1.036/2026"
  );

  summary.push(
    ""
  );

  summary.push(
    "Itens nominais update 96: " +
      countSubstances(
        base
      )
  );

  summary.push(
    "Itens nominais update 102: " +
      countSubstances(
        state
      )
  );

  summary.push(
    ""
  );

  summary.push(
    "UPDATES APLICADOS"
  );

  summary.push(
    "-".repeat(
      72
    )
  );

  for (
    const update of
      state.appliedUpdates
  ) {
    summary.push(
      update.update +
        " | " +
        update.resolution +
        " | nominal=" +
        update.nominalChanges.length +
        " | adendo=" +
        update.adendoChanges.length
    );
  }

  summary.push(
    ""
  );

  summary.push(
    "ADENDOS NÃO CONSIDERADOS VIGENTES AUTOMATICAMENTE"
  );

  summary.push(
    "-".repeat(
      72
    )
  );

  for (
    const regulatoryClass of
      staleAdendoClasses
  ) {
    const freshness =
      state.lists[
        regulatoryClass
      ].adendoFreshness;

    summary.push(
      regulatoryClass +
        ": updates " +
        freshness
          .changedAfterSnapshot
          .map(
            (
              item
            ) =>
              item.update
          )
          .join(
            ", "
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
      72
    )
  );

  for (
    const probe of [
      "Metadona",
      "Clonazepam",
      "Carisoprodol",
      "Estiripentol",
      "Fenfluramina",
      "Cenobamato",
      "Protodesnitazeno",
      "Desalquilgidazepam",
      "NMDMSB",
      "Fenibut",
      "MMDPPA",
      "Dimetocaína",
    ]
  ) {
    const matches =
      findProbe(
        state,
        probe
      );

    summary.push(
      probe +
        ": " +
        matches
          .map(
            (
              match
            ) =>
              match.regulatoryClass +
              " / update " +
              match.addedByUpdate
          )
          .join(
            " | "
          )
    );
  }

  summary.push(
    ""
  );

  summary.push(
    "SEGURANÇA"
  );

  summary.push(
    "- Estado nominal reconstruído até update 102."
  );

  summary.push(
    "- Adendos modificados depois do snapshot 96 foram marcados como stale."
  );

  summary.push(
    "- Este artefato NÃO autoriza persistência automática de tipo de receita."
  );

  summary.push(
    "- Datas efetivas não foram inferidas quando a página oficial não as declara explicitamente."
  );

  fs.writeFileSync(
    OUTPUT_TXT,
    summary.join(
      "\n"
    ) +
      "\n"
  );

  console.log(
    "📊 REPLAY NOMINAL"
  );

  console.log(
    "────────────────────────────────────────"
  );

  console.log(
    "Update base:          96"
  );

  console.log(
    "Update reconstruído: 102"
  );

  console.log(
    "Itens base:          " +
      countSubstances(
        base
      )
  );

  console.log(
    "Itens atuais:        " +
      countSubstances(
        state
      )
  );

  console.log(
    "Adendos stale:       " +
      staleAdendoClasses.join(
        ", "
      )
  );

  console.log(
    "────────────────────────────────────────\n"
  );

  console.log(
    "🔬 PROBES VIGENTES"
  );

  for (
    const probe of [
      "METADONA",
      "CLONAZEPAM",
      "CARISOPRODOL",
      "ESTIRIPENTOL",
      "FENFLURAMINA",
      "CENOBAMATO",
      "PROTODESNITAZENO",
      "FENIBUT",
      "MMDPPA",
      "DIMETOCAÍNA",
    ]
  ) {
    const matches =
      findProbe(
        state,
        probe
      );

    console.log(
      "✅ " +
        probe +
        " → " +
        matches
          .map(
            (
              match
            ) =>
              "LISTA " +
              match.regulatoryClass +
              " [update " +
              match.addedByUpdate +
              "]"
          )
          .join(
            " | "
          )
    );
  }

  console.log(
    "\n⚠️ Classes com adendo alterado depois do snapshot 96:"
  );

  console.log(
    "   " +
      staleAdendoClasses.join(
        ", "
      )
  );

  console.log(
    "\n🚫 safeForAutomaticPrescriptionRules = false"
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
    "\n✅ Replay nominal 97 → 102 concluído."
  );
}

try {
  main();
} catch (
  error
) {
  console.error(
    "\n❌ REPLAY FALHOU:"
  );

  console.error(
    error instanceof
      Error
      ? error.stack ||
          error.message
      : error
  );

  console.error(
    "\n🚫 Nenhum Supabase write."
  );

  process.exit(
    1
  );
}
