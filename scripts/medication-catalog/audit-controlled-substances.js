// scripts/medication-catalog/audit-controlled-substances.js

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

const REPORT_DIR =
  path.join(
    ROOT,
    ".medication-catalog-audit"
  );

const REPORT_FILE =
  path.join(
    REPORT_DIR,
    "controlled-substances-report.json"
  );

const ANVISA_LIST_URL =
  "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/lista-substancias";

/*
 * Traduções que o modelo atual do Vault consegue representar
 * sem inferência clínica/regulatória adicional.
 *
 * IMPORTANTE:
 * isto NÃO é a lista de substâncias.
 * É somente a tradução de CLASSE -> abstração visual do Vault.
 */
const CLASS_RULES = {
  A1: {
    supported:
      true,

    prescriptionModel:
      "Notificação de Receita A",

    vaultPrescriptionType:
      "amarela",
  },

  A2: {
    supported:
      true,

    prescriptionModel:
      "Notificação de Receita A",

    vaultPrescriptionType:
      "amarela",
  },

  A3: {
    supported:
      true,

    prescriptionModel:
      "Notificação de Receita A",

    vaultPrescriptionType:
      "amarela",
  },

  B1: {
    supported:
      true,

    prescriptionModel:
      "Notificação de Receita B",

    vaultPrescriptionType:
      "azul",
  },

  B2: {
    supported:
      true,

    prescriptionModel:
      "Notificação de Receita B2",

    vaultPrescriptionType:
      "azul",
  },

  C1: {
    supported:
      true,

    prescriptionModel:
      "Receita de Controle Especial",

    vaultPrescriptionType:
      "branca",
  },

  /*
   * Não reduzimos automaticamente essas listas aos quatro
   * tipos atuais do Vault.
   *
   * Há regimes próprios, notificações especiais, proscrição
   * ou controle administrativo que exigem modelagem separada.
   */
  C2: {
    supported:
      false,

    reason:
      "Notificação de Receita Especial / retinoides.",
  },

  C3: {
    supported:
      false,

    reason:
      "Regime especial próprio.",
  },

  C4: {
    supported:
      false,

    reason:
      "Regime regulatório próprio.",
  },

  C5: {
    supported:
      false,

    reason:
      "Regime regulatório próprio.",
  },

  D1: {
    supported:
      false,

    reason:
      "Precursor; não deve ser reduzido automaticamente ao modelo visual atual.",
  },

  D2: {
    supported:
      false,

    reason:
      "Controle administrativo específico.",
  },

  E: {
    supported:
      false,

    reason:
      "Lista proscrita/especial.",
  },

  F1: {
    supported:
      false,

    reason:
      "Substância proscrita.",
  },

  F2: {
    supported:
      false,

    reason:
      "Substância proscrita.",
  },

  F3: {
    supported:
      false,

    reason:
      "Substância proscrita.",
  },

  F4: {
    supported:
      false,

    reason:
      "Substância proscrita.",
  },
};

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

function htmlToText(
  html
) {
  return String(
    html
  )
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

async function fetchText(
  url
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          "user-agent":
            "VaultMedicationCatalogAudit/1.0",
        },
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `HTTP ${response.status} ao consultar ${url}`
    );
  }

  return response.text();
}

function detectCurrentVersion(
  html
) {
  const text =
    htmlToText(
      html
    );

  /*
   * Procuramos a linha/trecho que contenha a indicação
   * pública de "Versão vigente".
   *
   * O parser é deliberadamente conservador.
   */
  const match =
    text.match(
      /RDC\s*(?:n[ºo°.]*)?\s*([0-9.]+)[^0-9]{0,80}(?:de\s*)?(\d{1,2}\s+de\s+[A-Za-zçÇãÃéÉ]+\s+de\s+\d{4})[^]{0,120}?Vers[aã]o\s+vigente/i
    ) ||
    text.match(
      /RDC\s*(?:n[ºo°.]*)?\s*([0-9.]+)[^]{0,180}?Vers[aã]o\s+vigente/i
    );

  if (
    !match
  ) {
    return null;
  }

  return {
    raw:
      match[0],

    rdcNumber:
      match[1],

    publishedText:
      match[2] ??
      null,
  };
}

function parseLocalSourceFile(
  filePath
) {
  const text =
    fs.readFileSync(
      filePath,
      "utf8"
    );

  /*
   * Formato esperado:
   *
   * LISTA A1
   * METADONA
   * MORFINA
   *
   * LISTA B1
   * CLONAZEPAM
   *
   * O arquivo pode ser produzido futuramente por extrator
   * específico da fonte oficial.
   *
   * Este auditor NÃO tenta interpretar adendos automaticamente.
   */
  const lines =
    text
      .split(
        /\r?\n/
      )
      .map(
        (
          line
        ) =>
          line.trim()
      )
      .filter(
        Boolean
      );

  const entries = [];

  let currentClass =
    null;

  for (
    const line of
      lines
  ) {
    const listMatch =
      line.match(
        /^LISTA\s+["']?([A-F][1-5]?)["']?\b/i
      );

    if (
      listMatch
    ) {
      currentClass =
        listMatch[1]
          .toUpperCase();

      continue;
    }

    /*
     * Adendos/exceções nunca viram regra automática.
     */
    if (
      /\badendo\b/i.test(
        line
      ) ||
      /\bexcet/i.test(
        line
      ) ||
      /\bconcentra/i.test(
        line
      ) ||
      /\bforma\s+farmac/i.test(
        line
      ) ||
      /\bprepara/i.test(
        line
      )
    ) {
      entries.push(
        {
          kind:
            "exception",

          regulatoryClass:
            currentClass,

          raw:
            line,
        }
      );

      continue;
    }

    if (
      !currentClass
    ) {
      continue;
    }

    entries.push(
      {
        kind:
          "substance",

        regulatoryClass:
          currentClass,

        raw:
          line,

        normalized:
          normalizeText(
            line
          ),
      }
    );
  }

  return entries;
}

function buildIndex(
  substances
) {
  const byNormalized =
    new Map();

  for (
    const substance of
      substances
  ) {
    const normalized =
      normalizeText(
        substance.canonical_name_normalized ||
        substance.canonical_name
      );

    if (
      !normalized
    ) {
      continue;
    }

    const current =
      byNormalized.get(
        normalized
      ) ??
      [];

    current.push(
      substance
    );

    byNormalized.set(
      normalized,
      current
    );
  }

  return byNormalized;
}

async function loadAllActiveSubstances(
  supabase
) {
  const PAGE_SIZE =
    1000;

  const all = [];

  let from =
    0;

  while (
    true
  ) {
    const to =
      from +
      PAGE_SIZE -
      1;

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
          to
        );

    if (
      error
    ) {
      throw new Error(
        "Falha ao carregar medication_substances " +
          `[${from}-${to}]: ` +
          error.message
      );
    }

    const page =
      data ??
      [];

    all.push(
      ...page
    );

    console.log(
      "   Página " +
        String(
          Math.floor(
            from /
              PAGE_SIZE
          ) +
            1
        ) +
        ": " +
        String(
          page.length
        ) +
        " registro(s)"
    );

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return all;
}

async function main() {
  console.log(
    "🧠 VAULT — AUDITORIA DE SUBSTÂNCIAS CONTROLADAS\n"
  );

  console.log(
    "🚫 MODO SOMENTE LEITURA"
  );

  console.log(
    "🚫 Nenhum INSERT/UPDATE/DELETE será executado.\n"
  );

  const supabase =
    createAdminClient();

  console.log(
    "🌐 Consultando página oficial da Anvisa..."
  );

  const officialHtml =
    await fetchText(
      ANVISA_LIST_URL
    );

  const currentVersion =
    detectCurrentVersion(
      officialHtml
    );

  if (
    !currentVersion
  ) {
    throw new Error(
      "Não foi possível confirmar uma versão vigente na página oficial da Anvisa."
    );
  }

  console.log(
    "✅ Versão vigente detectada:"
  );

  console.log(
    "   RDC " +
      currentVersion.rdcNumber
  );

  if (
    currentVersion.publishedText
  ) {
    console.log(
      "   " +
        currentVersion.publishedText
    );
  }

  console.log(
    "\n📚 Carregando substâncias existentes no Supabase..."
  );

  const substances =
    await loadAllActiveSubstances(
      supabase
    );

  const {
    count:
      currentRuleCount,
    error:
      ruleCountError,
  } =
    await supabase
      .from(
        "medication_regulatory_rules"
      )
      .select(
        "*",
        {
          count:
            "exact",

          head:
            true,
        }
      );

  if (
    ruleCountError
  ) {
    throw new Error(
      "Falha ao contar medication_regulatory_rules: " +
        ruleCountError.message
    );
  }

  console.log(
    "✅ " +
      String(
        substances?.length ??
        0
      ) +
      " substâncias ativas."
  );

  console.log(
    "✅ " +
      String(
        currentRuleCount ??
        0
      ) +
      " regras regulatórias atuais no banco.\n"
  );

  const localSourceArg =
    process.argv[2]
      ? path.resolve(
          process.cwd(),
          process.argv[2]
        )
      : null;

  const report = {
    generatedAt:
      new Date()
        .toISOString(),

    mode:
      "read_only",

    officialSource: {
      authority:
        "ANVISA",

      url:
        ANVISA_LIST_URL,

      currentVersion,
    },

    database: {
      substanceCount:
        substances?.length ??
        0,

      regulatoryRuleCount:
        currentRuleCount ??
        0,
    },

    supportedClassMappings:
      CLASS_RULES,

    localSource: null,

    summary: {
      parsedSubstances:
        0,

      exactMatches:
        0,

      missing:
        0,

      ambiguous:
        0,

      unsupported:
        0,

      exceptions:
        0,

      safeCandidates:
        0,
    },

    safeCandidates:
      [],

    missing:
      [],

    ambiguous:
      [],

    unsupported:
      [],

    exceptions:
      [],
  };

  if (
    !localSourceArg
  ) {
    console.log(
      "ℹ️ Nenhum arquivo de texto oficial foi informado."
    );

    console.log(
      "   Esta execução valida infraestrutura, versão vigente e banco."
    );

    console.log(
      "   Nenhuma regra candidata será produzida ainda.\n"
    );
  } else {
    if (
      !fs.existsSync(
        localSourceArg
      )
    ) {
      throw new Error(
        "Arquivo informado não encontrado: " +
          localSourceArg
      );
    }

    console.log(
      "📄 Auditando fonte local:"
    );

    console.log(
      "   " +
        localSourceArg +
        "\n"
    );

    const parsed =
      parseLocalSourceFile(
        localSourceArg
      );

    report.localSource = {
      path:
        localSourceArg,

      parsedEntries:
        parsed.length,
    };

    const dbIndex =
      buildIndex(
        substances ??
        []
      );

    for (
      const entry of
        parsed
    ) {
      if (
        entry.kind ===
        "exception"
      ) {
        report.summary.exceptions +=
          1;

        report.exceptions.push(
          entry
        );

        continue;
      }

      report.summary.parsedSubstances +=
        1;

      const classRule =
        CLASS_RULES[
          entry.regulatoryClass
        ];

      if (
        !classRule ||
        !classRule.supported
      ) {
        report.summary.unsupported +=
          1;

        report.unsupported.push(
          {
            ...entry,

            reason:
              classRule?.reason ??
              "Classe regulatória desconhecida pelo auditor.",
          }
        );

        continue;
      }

      const matches =
        dbIndex.get(
          entry.normalized
        ) ??
        [];

      if (
        matches.length ===
        0
      ) {
        report.summary.missing +=
          1;

        report.missing.push(
          entry
        );

        continue;
      }

      if (
        matches.length >
        1
      ) {
        report.summary.ambiguous +=
          1;

        report.ambiguous.push(
          {
            ...entry,

            matches:
              matches.map(
                (
                  item
                ) => ({
                  id:
                    item.id,

                  canonicalName:
                    item.canonical_name,
                })
              ),
          }
        );

        continue;
      }

      report.summary.exactMatches +=
        1;

      report.summary.safeCandidates +=
        1;

      report.safeCandidates.push(
        {
          substanceId:
            matches[0].id,

          canonicalName:
            matches[0].canonical_name,

          regulatoryClass:
            entry.regulatoryClass,

          prescriptionModel:
            classRule.prescriptionModel,

          vaultPrescriptionType:
            classRule.vaultPrescriptionType,

          source:
            "ANVISA",

          sourceVersion:
            currentVersion.rdcNumber,
        }
      );
    }
  }

  fs.mkdirSync(
    REPORT_DIR,
    {
      recursive:
        true,
    }
  );

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(
      report,
      null,
      2
    ) +
      "\n"
  );

  console.log(
    "📊 RESUMO"
  );

  console.log(
    "────────────────────────────────────────"
  );

  console.log(
    "Substâncias analisadas: " +
      report.summary.parsedSubstances
  );

  console.log(
    "Matches exatos:         " +
      report.summary.exactMatches
  );

  console.log(
    "Candidatas seguras:     " +
      report.summary.safeCandidates
  );

  console.log(
    "Não encontradas:        " +
      report.summary.missing
  );

  console.log(
    "Ambíguas:               " +
      report.summary.ambiguous
  );

  console.log(
    "Não representáveis:     " +
      report.summary.unsupported
  );

  console.log(
    "Adendos/exceções:       " +
      report.summary.exceptions
  );

  console.log(
    "────────────────────────────────────────\n"
  );

  console.log(
    "📝 Relatório:"
  );

  console.log(
    "   " +
      REPORT_FILE
  );

  console.log(
    "\n🚫 Nenhuma escrita no Supabase foi executada."
  );

  console.log(
    "✅ Auditoria concluída."
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error(
        "\n❌ AUDITORIA FALHOU:"
      );

      console.error(
        error instanceof
          Error
          ? error.stack ||
              error.message
          : error
      );

      process.exit(
        1
      );
    }
  );
