// scripts/medication-catalog/import-anvisa-initial.js

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const { reconcileOfficialRows } = require("./catalog-integrity-r01.cjs");
// Keep dry-run module load offline. The initial empty-database writer remains separate.

const ROOT = path.resolve(__dirname, "../..");

const CA_BUNDLE = path.join(
  ROOT,
  ".certs/anvisa-ca-bundle.pem"
);

const BATCH_SIZE = 400;

const APPLY_CONFIRMATION =
  "IMPORT_ANVISA_INITIAL";

const SOURCES = {
  consulta: {
    key: "anvisa_consulta_medicamentos",
    name: "TA_CONSULTA_MEDICAMENTOS.CSV",
    url:
      "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV",
  },

  precos: {
    key: "anvisa_precos_medicamentos",
    name: "TA_PRECOS_MEDICAMENTOS.csv",
    url:
      "https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv",
  },

  restricoes: {
    key: "anvisa_restricao_medicamento",
    name: "TA_RESTRICAO_MEDICAMENTO.csv",
    url:
      "https://dados.anvisa.gov.br/dados/TA_RESTRICAO_MEDICAMENTO.csv",
  },
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanValue(value) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D+/g, "");
}

function splitCodes(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlaceholderProductName(value) {
  const normalized = normalizeText(value);

  return (
    normalized === "n o declarado" ||
    normalized === "nao declarado" ||
    normalized === "nc ni"
  );
}

function productKind(row) {
  const category =
    normalizeText(
      row.DS_TIPO_CATEGORIA_REGULATORIA
    );

  if (category === "generico") {
    return "generic";
  }

  if (category === "similar") {
    return "similar";
  }

  if (category === "novo") {
    return "brand";
  }

  return "other";
}

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

// One encoding, delimiter and parser authority for both real consumers.
const {parseCsv,rowsToObjects,decodeBuffer,detectDelimiter} = require("./build-anvisa-canonical-package.js");

function download(source, tempDir) {
  const destination =
    path.join(
      tempDir,
      source.name
    );

  console.log(
    "⬇️ " + source.name
  );

  execFileSync(
    "curl",
    [
      "--cacert",
      CA_BUNDLE,
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "3",
      "--retry-delay",
      "2",
      "--connect-timeout",
      "30",
      "--max-time",
      "300",
      "-o",
      destination,
      source.url,
    ],
    {
      stdio: "inherit",
    }
  );

  return destination;
}

function loadSource(source, tempDir) {
  const file =
    download(
      source,
      tempDir
    );

  const buffer =
    fs.readFileSync(file);

  const decoded =
    decodeBuffer(buffer);

  const text =
    decoded.text.replace(
      /^\uFEFF/,
      ""
    );

  const firstBreak =
    text.search(/\r?\n/);

  if (firstBreak === -1) {
    throw new Error(
      "CSV sem cabeçalho: " +
      source.name
    );
  }

  const delimiter =
    detectDelimiter(
      text.slice(
        0,
        firstBreak
      )
    );

  return {
    source,
    sha256: sha256(buffer),
    bytes: buffer.length,
    encoding: decoded.encoding,
    rows: rowsToObjects(
      parseCsv(
        text,
        delimiter
      )
    ),
  };
}

function buildCanonicalPackage(
  consultaRows,
  precoRows
) {
  const products =
    new Map();

  const registrations =
    new Map();

  const substanceCandidates =
    new Map();

  const relations =
    new Map();

  const diagnostics = {
    multipleSubstanceCodes: 0,
    noSubstanceName: 0,
    placeholderProducts: 0,
    substanceExternalIdConflicts: 0,
    duplicateProductRegistrations: 0,
    presentationUnlinked: 0,
    presentationAmbiguous: 0,
    invalidPresentationIdentifiers: 0,
  };

  for (
    const row of consultaRows
  ) {
    const externalId =
      cleanValue(
        row.CO_SEQ_PRODUTO
      );

    const productName =
      cleanValue(
        row.NO_PRODUTO
      );

    if (
      !externalId ||
      !productName
    ) {
      continue;
    }

    const registration =
      digitsOnly(
        row.NU_REGISTRO_PRODUTO
      ) || null;

    const placeholder =
      isPlaceholderProductName(
        productName
      );

    if (placeholder) {
      diagnostics
        .placeholderProducts += 1;
    }

    products.set(
      externalId,
      {
        externalId,
        productName,
        productNameNormalized:
          normalizeText(
            productName
          ),
        productKind:
          productKind(row),
        manufacturer:
          cleanValue(
            row.NO_RAZAO_SOCIAL_EMPRESA
          ),
        registrationNumber:
          registration,
        active:
          (
            normalizeText(
              row.VALIDADE_SITUACAO
            ) === "ativo"
          ) &&
          !placeholder,
      }
    );

    if (registration) {
      if (
        !registrations.has(
          registration
        )
      ) {
        registrations.set(
          registration,
          new Set()
        );
      }

      registrations
        .get(registration)
        .add(externalId);
    }

    const rawSubstance =
      cleanValue(
        row.SUBSTANCIAS_MEDICAMENTOS
      );

    if (!rawSubstance) {
      diagnostics
        .noSubstanceName += 1;
      continue;
    }

    const codes =
      splitCodes(
        row.CO_SUBSTANCIA
      );

    if (codes.length !== 1) {
      diagnostics
        .multipleSubstanceCodes += 1;
      continue;
    }

    // Counters only. Never align codes and names by position.
  }
  const composition = reconcileOfficialRows(consultaRows);
  for (const item of composition.substances.values()) {
    substanceCandidates.set(item.normalizedName, {canonicalName:item.canonicalName, normalizedName:item.normalizedName, externalIds:new Set([item.externalId])});
  }
  for (const [key,item] of composition.relations) {
    relations.set(key, {productExternalId:item.productExternalId, substanceNormalizedName:item.substanceNormalizedName, externalSubstanceId:item.substanceExternalId});
  }
  diagnostics.compositionComplete = composition.reports.filter(r=>r.status==="complete").length;
  diagnostics.compositionPartial = composition.reports.filter(r=>r.status==="partial").length;
  diagnostics.compositionAmbiguous = composition.reports.filter(r=>r.status==="ambiguous").length;
  diagnostics.compositionInconclusive = composition.reports.filter(r=>r.status==="inconclusive").length;
  diagnostics.codeDictionaryConflicts = composition.conflicts.length;

  for (
    const ids of
    registrations.values()
  ) {
    if (ids.size > 1) {
      diagnostics
        .duplicateProductRegistrations += 1;
    }
  }

  const substances = [];

  for (
    const candidate of
    substanceCandidates.values()
  ) {
    const externalIds =
      Array.from(
        candidate.externalIds
      );

    if (
      externalIds.length > 1
    ) {
      diagnostics
        .substanceExternalIdConflicts += 1;
    }

    substances.push({
      canonicalName:
        candidate.canonicalName,
      normalizedName:
        candidate.normalizedName,
      externalId:
        externalIds.length === 1
          ? externalIds[0]
          : null,
      active: true,
    });
  }

  const presentations =
    new Map();

  for (
    const row of precoRows
  ) {
    const externalRegistration =
      digitsOnly(
        row.NU_REGISTRO
      );

    if (
      !externalRegistration
    ) {
      continue;
    }

    const baseRegistration =
      externalRegistration
        .slice(0, 9);

    const productIds =
      registrations.get(
        baseRegistration
      );

    if (
      !productIds ||
      productIds.size === 0
    ) {
      diagnostics
        .presentationUnlinked += 1;
      continue;
    }

    if (
      productIds.size !== 1
    ) {
      diagnostics
        .presentationAmbiguous += 1;
      continue;
    }

    const productExternalId =
      Array.from(
        productIds
      )[0];

    const product =
      products.get(
        productExternalId
      );

    if (!product) {
      diagnostics
        .presentationUnlinked += 1;
      continue;
    }

    const label =
      cleanValue(
        row.DS_APRESENTACAO
      );

    if (!label) {
      continue;
    }

    let ggrem =
      cleanValue(
        row.CO_GGREM
      );

    let ean =
      cleanValue(
        row.CO_EAN
      );

    if (
      ggrem &&
      normalizeText(ggrem) ===
        "si nc"
    ) {
      ggrem = null;

      diagnostics
        .invalidPresentationIdentifiers += 1;
    }

    if (
      ean &&
      (
        normalizeText(ean) ===
          "si nc" ||
        /^0+$/.test(
          digitsOnly(ean)
        )
      )
    ) {
      ean = null;

      diagnostics
        .invalidPresentationIdentifiers += 1;
    }

    const key = [
      productExternalId,
      externalRegistration,
      ggrem || "",
      label,
    ].join("|");

    presentations.set(
      key,
      {
        productExternalId,
        presentationLabel:
          label,
        externalRegistration,
        ggremCode: ggrem,
        ean,
        active:
          product.active,
      }
    );
  }

  return {
    products:
      Array.from(
        products.values()
      ),

    substances,

    relations:
      Array.from(
        relations.values()
      ),

    presentations:
      Array.from(
        presentations.values()
      ),

    diagnostics,
  };
}

function chunk(values, size) {
  const chunks = [];

  for (
    let i = 0;
    i < values.length;
    i += size
  ) {
    chunks.push(
      values.slice(
        i,
        i + size
      )
    );
  }

  return chunks;
}

async function assertInitialDatabaseEmpty(
  supabase
) {
  const tables = [
    "medication_catalog_versions",
    "medication_substances",
    "medication_products",
    "medication_product_substances",
    "medication_aliases",
    "medication_presentations",
    "medication_regulatory_rules",
  ];

  for (const table of tables) {
    const {
      count,
      error,
    } = await supabase
      .from(table)
      .select(
        "*",
        {
          head: true,
          count: "exact",
        }
      );

    if (error) {
      throw new Error(
        "Falha ao verificar " +
        table +
        ": " +
        error.message
      );
    }

    if ((count ?? 0) !== 0) {
      throw new Error(
        "IMPORTAÇÃO INICIAL BLOQUEADA: " +
        table +
        " possui " +
        String(count) +
        " registros."
      );
    }
  }
}

async function insertBatches(
  supabase,
  table,
  rows,
  options = {}
) {
  const batches =
    chunk(
      rows,
      BATCH_SIZE
    );

  const returned = [];

  for (
    let index = 0;
    index < batches.length;
    index += 1
  ) {
    const batch =
      batches[index];

    process.stdout.write(
      "\r📦 " +
      table +
      " " +
      String(index + 1) +
      "/" +
      String(batches.length) +
      " (" +
      String(
        Math.min(
          (index + 1) *
            BATCH_SIZE,
          rows.length
        )
      ) +
      "/" +
      String(rows.length) +
      ")"
    );

    let query =
      supabase
        .from(table)
        .insert(batch);

    if (options.select) {
      query =
        query.select(
          options.select
        );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      process.stdout.write("\n");

      throw new Error(
        "Falha em " +
        table +
        " lote " +
        String(index + 1) +
        ": " +
        error.message
      );
    }

    if (
      Array.isArray(data)
    ) {
      returned.push(
        ...data
      );
    }
  }

  process.stdout.write("\n");

  return returned;
}

async function createVersions(
  supabase,
  datasets
) {
  const rows =
    datasets.map(
      (dataset) => ({
        source_key:
          dataset.source.key,

        source_name:
          dataset.source.name,

        source_url:
          dataset.source.url,

        version:
          "sha256:" +
          dataset.sha256,

        active: false,

        notes:
          "Vault initial ANVISA/CMED import. " +
          "SHA-256: " +
          dataset.sha256 +
          ". Encoding: " +
          dataset.encoding +
          ". Bytes: " +
          String(
            dataset.bytes
          ) +
          ".",
      })
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "medication_catalog_versions"
    )
    .insert(rows)
    .select(
      "id, source_key, version"
    );

  if (error) {
    throw new Error(
      "Falha ao criar versões: " +
      error.message
    );
  }

  const map =
    new Map();

  for (
    const item of data ?? []
  ) {
    map.set(
      item.source_key,
      item.id
    );
  }

  for (
    const dataset of datasets
  ) {
    if (
      !map.has(
        dataset.source.key
      )
    ) {
      throw new Error(
        "Versão sem UUID retornado: " +
        dataset.source.key
      );
    }
  }

  return map;
}

async function cleanupFailedImport(
  supabase,
  versionIds
) {
  console.log(
    "\n🧹 Limpando versão incompleta..."
  );

  const consultaId =
    versionIds.get(
      SOURCES.consulta.key
    );

  const precosId =
    versionIds.get(
      SOURCES.precos.key
    );

  const reverseCleanup = [
    [
      "medication_presentations",
      "source_version_id",
      precosId,
    ],
    [
      "medication_product_substances",
      "source_version_id",
      consultaId,
    ],
    [
      "medication_products",
      "source_version_id",
      consultaId,
    ],
    [
      "medication_substances",
      "source_version_id",
      consultaId,
    ],
  ];

  for (
    const [
      table,
      column,
      id,
    ] of reverseCleanup
  ) {
    if (!id) {
      continue;
    }

    const { error } =
      await supabase
        .from(table)
        .delete()
        .eq(
          column,
          id
        );

    if (error) {
      console.error(
        "⚠️ Cleanup falhou em " +
        table +
        ": " +
        error.message
      );
    }
  }

  for (
    const id of
    versionIds.values()
  ) {
    const { error } =
      await supabase
        .from(
          "medication_catalog_versions"
        )
        .delete()
        .eq(
          "id",
          id
        );

    if (error) {
      console.error(
        "⚠️ Cleanup da versão falhou: " +
        error.message
      );
    }
  }
}

async function activateVersions(
  supabase,
  versionIds
) {
  for (
    const [
      sourceKey,
      id,
    ] of versionIds.entries()
  ) {
    const {
      error: deactivateError,
    } = await supabase
      .from(
        "medication_catalog_versions"
      )
      .update({
        active: false,
      })
      .eq(
        "source_key",
        sourceKey
      )
      .neq(
        "id",
        id
      );

    if (deactivateError) {
      throw new Error(
        "Falha ao desativar versão antiga " +
        sourceKey +
        ": " +
        deactivateError.message
      );
    }

    const {
      error: activateError,
    } = await supabase
      .from(
        "medication_catalog_versions"
      )
      .update({
        active: true,
      })
      .eq(
        "id",
        id
      );

    if (activateError) {
      throw new Error(
        "Falha ao ativar versão " +
        sourceKey +
        ": " +
        activateError.message
      );
    }
  }
}

async function verifyCounts(
  supabase,
  expected
) {
  const checks = [
    [
      "medication_substances",
      expected.substances,
    ],
    [
      "medication_products",
      expected.products,
    ],
    [
      "medication_product_substances",
      expected.relations,
    ],
    [
      "medication_presentations",
      expected.presentations,
    ],
  ];

  for (
    const [
      table,
      expectedCount,
    ] of checks
  ) {
    const {
      count,
      error,
    } = await supabase
      .from(table)
      .select(
        "*",
        {
          head: true,
          count: "exact",
        }
      );

    if (error) {
      throw new Error(
        "Validação falhou em " +
        table +
        ": " +
        error.message
      );
    }

    console.log(
      "🔎 " +
      table +
      ": " +
      String(count ?? 0) +
      " / esperado " +
      String(expectedCount)
    );

    if (
      (count ?? 0) !==
      expectedCount
    ) {
      throw new Error(
        "Contagem divergente em " +
        table
      );
    }
  }
}

async function applyImport(
  datasets,
  canonical
) {
  const supabase =
    require("./admin-client").createAdminClient();

  await assertInitialDatabaseEmpty(
    supabase
  );

  let versionIds =
    new Map();

  let importStarted =
    false;

  try {
    versionIds =
      await createVersions(
        supabase,
        datasets
      );

    importStarted = true;

    const consultaVersionId =
      versionIds.get(
        SOURCES.consulta.key
      );

    const precosVersionId =
      versionIds.get(
        SOURCES.precos.key
      );

    console.log(
      "\n🧬 Importando substâncias..."
    );

    const insertedSubstances =
      await insertBatches(
        supabase,
        "medication_substances",
        canonical.substances.map(
          (item) => ({
            canonical_name:
              item.canonicalName,

            canonical_name_normalized:
              item.normalizedName,

            source_version_id:
              consultaVersionId,

            external_id:
              item.externalId,

            active:
              item.active,
          })
        ),
        {
          select:
            "id, canonical_name_normalized",
        }
      );

    const substanceIdByName =
      new Map(
        insertedSubstances.map(
          (item) => [
            item
              .canonical_name_normalized,
            item.id,
          ]
        )
      );

    if (
      substanceIdByName.size !==
      canonical.substances.length
    ) {
      throw new Error(
        "Mapa de substâncias incompleto."
      );
    }

    console.log(
      "\n💊 Importando produtos..."
    );

    const insertedProducts =
      await insertBatches(
        supabase,
        "medication_products",
        canonical.products.map(
          (item) => ({
            product_name:
              item.productName,

            product_name_normalized:
              item.productNameNormalized,

            product_kind:
              item.productKind,

            manufacturer:
              item.manufacturer,

            registration_number:
              item.registrationNumber,

            source_version_id:
              consultaVersionId,

            external_id:
              item.externalId,

            active:
              item.active,
          })
        ),
        {
          select:
            "id, external_id",
        }
      );

    const productIdByExternal =
      new Map(
        insertedProducts.map(
          (item) => [
            item.external_id,
            item.id,
          ]
        )
      );

    if (
      productIdByExternal.size !==
      canonical.products.length
    ) {
      throw new Error(
        "Mapa de produtos incompleto."
      );
    }

    console.log(
      "\n🧬 Importando relações produto ↔ substância..."
    );

    const relationRows =
      canonical.relations.map(
        (item) => {
          const productId =
            productIdByExternal.get(
              item.productExternalId
            );

          const substanceId =
            substanceIdByName.get(
              item.substanceNormalizedName
            );

          if (
            !productId ||
            !substanceId
          ) {
            throw new Error(
              "Relação sem UUID resolvido."
            );
          }

          return {
            product_id:
              productId,

            substance_id:
              substanceId,

            source_version_id:
              consultaVersionId,

            external_substance_id:
              item.externalSubstanceId,

            position: null,

            is_primary: false,
          };
        }
      );

    await insertBatches(
      supabase,
      "medication_product_substances",
      relationRows
    );

    console.log(
      "\n📦 Importando apresentações..."
    );

    const presentationRows =
      canonical.presentations.map(
        (item) => {
          const productId =
            productIdByExternal.get(
              item.productExternalId
            );

          if (!productId) {
            throw new Error(
              "Apresentação sem produto resolvido."
            );
          }

          return {
            product_id:
              productId,

            presentation_label:
              item.presentationLabel,

            concentration_value:
              null,

            concentration_unit:
              null,

            pharmaceutical_form:
              null,

            pharmaceutical_form_normalized:
              null,

            package_description:
              null,

            source_version_id:
              precosVersionId,

            external_id:
              item.ggremCode,

            external_registration:
              item.externalRegistration,

            ggrem_code:
              item.ggremCode,

            ean:
              item.ean,

            active:
              item.active,
          };
        }
      );

    await insertBatches(
      supabase,
      "medication_presentations",
      presentationRows
    );

    console.log(
      "\n🔬 Auditando contagens..."
    );

    await verifyCounts(
      supabase,
      {
        substances:
          canonical.substances.length,

        products:
          canonical.products.length,

        relations:
          canonical.relations.length,

        presentations:
          canonical.presentations.length,
      }
    );

    console.log(
      "\n🟢 Ativando versões..."
    );

    await activateVersions(
      supabase,
      versionIds
    );

    console.log(
      "\n✅ PRIMEIRA CARGA CONCLUÍDA."
    );

    console.log(
      "🧠 Catálogo ativo somente após validação completa."
    );

    console.log(
      "📜 Aliases e regras regulatórias permanecem intencionalmente vazios."
    );
  } catch (error) {
    if (
      importStarted &&
      versionIds.size
    ) {
      await cleanupFailedImport(
        supabase,
        versionIds
      );
    }

    throw error;
  }
}

async function main() {
  const args =
    process.argv.slice(2);

  const isDryRun =
    args.includes(
      "--dry-run"
    );

  const isApply =
    args.includes(
      "--apply"
    );

  const confirmArg =
    args.find(
      (arg) =>
        arg.startsWith(
          "--confirm="
        )
    );

  const confirmation =
    confirmArg
      ? confirmArg.slice(
          "--confirm=".length
        )
      : null;

  if (
    isDryRun === isApply
  ) {
    throw new Error(
      "Escolha exatamente um modo: --dry-run OU --apply."
    );
  }

  if (
    isApply &&
    confirmation !==
      APPLY_CONFIRMATION
  ) {
    throw new Error(
      "Modo --apply exige: --confirm=" +
      APPLY_CONFIRMATION
    );
  }

  if (
    !fs.existsSync(
      CA_BUNDLE
    )
  ) {
    throw new Error(
      "Bundle TLS da Anvisa não encontrado:\n" +
      CA_BUNDLE
    );
  }

  console.log(
    "🧠 VAULT — IMPORTADOR ANVISA 4E3B\n"
  );

  console.log(
    isDryRun
      ? "🧪 MODO DRY-RUN — ZERO ESCRITAS"
      : "🔴 MODO APPLY — ESCRITA ADMINISTRATIVA"
  );

  console.log(
    "🔐 Downloads exigem TLS validado com CA explícita."
  );

  console.log(
    "🚫 Sem curl -k."
  );

  console.log(
    "🚫 Sem inferência regulatória."
  );

  console.log(
    "🚫 Sem parsing agressivo de apresentação.\n"
  );

  const tempDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "vault-anvisa-import-"
      )
    );

  try {
    const consulta =
      loadSource(
        SOURCES.consulta,
        tempDir
      );

    const precos =
      loadSource(
        SOURCES.precos,
        tempDir
      );

    const restricoes =
      loadSource(
        SOURCES.restricoes,
        tempDir
      );

    console.log(
      "\n============================================================"
    );

    console.log(
      "📚 FONTES"
    );

    for (
      const dataset of [
        consulta,
        precos,
        restricoes,
      ]
    ) {
      console.log(
        "\n" +
        dataset.source.name
      );

      console.log(
        "  linhas: " +
        dataset.rows.length
      );

      console.log(
        "  bytes: " +
        dataset.bytes
      );

      console.log(
        "  encoding: " +
        dataset.encoding
      );

      console.log(
        "  SHA-256: " +
        dataset.sha256
      );
    }

    const canonical =
      buildCanonicalPackage(
        consulta.rows,
        precos.rows
      );

    console.log(
      "\n============================================================"
    );

    console.log(
      "📦 PACOTE FINAL"
    );

    console.log(
      "Substâncias: " +
      canonical.substances.length
    );

    console.log(
      "Produtos: " +
      canonical.products.length
    );

    console.log(
      "Relações produto ↔ substância: " +
      canonical.relations.length
    );

    console.log(
      "Apresentações: " +
      canonical.presentations.length
    );

    console.log(
      "Aliases: 0 (intencional)"
    );

    console.log(
      "Regras regulatórias: 0 (intencional)"
    );

    console.log(
      "\n============================================================"
    );

    console.log(
      "🧪 DIAGNÓSTICOS"
    );

    for (
      const [
        key,
        value,
      ] of Object.entries(
        canonical.diagnostics
      )
    ) {
      console.log(
        key +
        ": " +
        String(value)
      );
    }

    if (
      canonical.diagnostics
        .duplicateProductRegistrations >
      0
    ) {
      throw new Error(
        "Há registros-base duplicados entre produtos canônicos. APPLY bloqueado."
      );
    }

    if (
      canonical.diagnostics
        .presentationAmbiguous >
      0
    ) {
      throw new Error(
        "Há apresentações com registro-base ambíguo. APPLY bloqueado."
      );
    }

    if (isDryRun) {
      console.log(
        "\n============================================================"
      );

      console.log(
        "✅ DRY-RUN CONCLUÍDO."
      );

      console.log(
        "🧾 Nenhum INSERT/UPDATE/DELETE executado."
      );

      console.log(
        "🏥 Envie esta saída antes de usar --apply."
      );

      return;
    }

    console.log(
      "\n============================================================"
    );

    console.log(
      "🔴 CONFIRMAÇÃO ADMINISTRATIVA ACEITA."
    );

    await applyImport(
      [
        consulta,
        precos,
        restricoes,
      ],
      canonical
    );
  } finally {
    fs.rmSync(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

module.exports = { buildCanonicalPackage, parseCsv, rowsToObjects, decodeBuffer, detectDelimiter };
if (require.main === module) main().catch(
  (error) => {
    console.error(
      "\n❌ IMPORTADOR ABORTADO"
    );

    console.error(
      error instanceof Error
        ? error.stack ||
          error.message
        : error
    );

    process.exit(1);
  }
);
