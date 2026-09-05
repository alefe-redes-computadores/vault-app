// scripts/medication-catalog/map-anvisa-catalog.js

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  execFileSync,
} = require("child_process");

const {
  TextDecoder,
} = require("util");

const TLS_VERIFICATION_BYPASSED = true;

const SOURCE = {
  label: "TA_CONSULTA_MEDICAMENTOS.CSV",
  url: "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV",
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

function normalizeNullable(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function decodeBuffer(buffer) {
  try {
    return {
      encoding: "utf-8",
      text: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
    };
  } catch {
    return {
      encoding: "windows-1252",
      text: new TextDecoder("windows-1252").decode(buffer),
    };
  }
}

function detectDelimiter(headerLine) {
  const candidates = [";", ",", "|", "\t"];
  let best = ";";
  let bestCount = -1;

  for (const delimiter of candidates) {
    let quoted = false;
    let count = 0;

    for (let i = 0; i < headerLine.length; i += 1) {
      const char = headerLine[i];

      if (char === '"') {
        if (quoted && headerLine[i + 1] === '"') {
          i += 1;
          continue;
        }

        quoted = !quoted;
        continue;
      }

      if (!quoted && char === delimiter) {
        count += 1;
      }
    }

    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i += 1;
        continue;
      }

      quoted = !quoted;
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }

      row.push(field.trim());
      field = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field.trim());

    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, ""));

  return rows.slice(1).map((row) => {
    const item = {};

    for (let i = 0; i < headers.length; i += 1) {
      item[headers[i]] = row[i] ?? "";
    }

    return item;
  });
}

function downloadSource(tempDir) {
  const destination = path.join(tempDir, SOURCE.label);

  console.log("⬇️ Baixando " + SOURCE.label + "...");

  execFileSync(
    "curl",
    [
      "-k",
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
      "180",
      "-o",
      destination,
      SOURCE.url,
    ],
    {
      stdio: "inherit",
    }
  );

  return destination;
}

function loadRows(tempDir) {
  const downloaded = downloadSource(tempDir);
  const buffer = fs.readFileSync(downloaded);
  const decoded = decodeBuffer(buffer);
  const text = decoded.text.replace(/^\uFEFF/, "");
  const firstBreak = text.search(/\r?\n/);

  if (firstBreak === -1) {
    throw new Error("Cabeçalho inválido.");
  }

  const delimiter = detectDelimiter(text.slice(0, firstBreak));
  const parsed = parseCsv(text, delimiter);

  return {
    encoding: decoded.encoding,
    rows: rowsToObjects(parsed),
  };
}

function getProductKind(row) {
  const category = normalizeText(row.DS_TIPO_CATEGORIA_REGULATORIA);

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

function splitMultiValue(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeCombination(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return false;
  }

  return (
    normalized.includes(" + ") ||
    normalized.includes(" e ") ||
    String(value).includes(";") ||
    String(value).includes("/")
  );
}

function mapRows(rows) {
  const activeRows = rows.filter(
    (row) => normalizeText(row.VALIDADE_SITUACAO) === "ativo"
  );

  const substances = new Map();
  const products = new Map();
  const aliases = new Map();

  const productNameToIds = new Map();
  const registrationToNames = new Map();
  const productToSubstances = new Map();
  const substanceToProducts = new Map();

  let missingSubstanceName = 0;
  let missingProductName = 0;
  let combinationLikeSubstances = 0;

  for (const row of activeRows) {
    const rawSubstance = String(row.SUBSTANCIAS_MEDICAMENTOS ?? "").trim();
    const normalizedSubstance = normalizeNullable(rawSubstance);

    const rawProduct = String(row.NO_PRODUTO ?? "").trim();
    const normalizedProduct = normalizeNullable(rawProduct);

    const productId = String(row.CO_SEQ_PRODUTO ?? "").trim();
    const registration = String(row.NU_REGISTRO_PRODUTO ?? "").trim();

    if (!normalizedSubstance) {
      missingSubstanceName += 1;
    } else {
      if (looksLikeCombination(rawSubstance)) {
        combinationLikeSubstances += 1;
      }

      if (!substances.has(normalizedSubstance)) {
        substances.set(normalizedSubstance, {
          canonicalName: rawSubstance,
          normalizedName: normalizedSubstance,
          sourceIds: new Set(),
          productIds: new Set(),
        });
      }

      const substance = substances.get(normalizedSubstance);

      splitMultiValue(row.CO_SUBSTANCIA).forEach((sourceId) => {
        substance.sourceIds.add(sourceId);
      });

      if (productId) {
        substance.productIds.add(productId);
      }
    }

    if (!normalizedProduct || !productId) {
      missingProductName += 1;
      continue;
    }

    if (!products.has(productId)) {
      products.set(productId, {
        id: productId,
        name: rawProduct,
        normalizedName: normalizedProduct,
        kind: getProductKind(row),
        registration,
        manufacturer: String(row.NO_RAZAO_SOCIAL_EMPRESA ?? "").trim(),
        substanceNames: new Set(),
        referenceNames: new Set(),
        synonyms: new Set(),
      });
    }

    const product = products.get(productId);

    if (normalizedSubstance) {
      product.substanceNames.add(normalizedSubstance);

      if (!productToSubstances.has(productId)) {
        productToSubstances.set(productId, new Set());
      }

      productToSubstances.get(productId).add(normalizedSubstance);

      if (!substanceToProducts.has(normalizedSubstance)) {
        substanceToProducts.set(normalizedSubstance, new Set());
      }

      substanceToProducts.get(normalizedSubstance).add(productId);
    }

    const referenceName = String(row.DS_REFERENCIA ?? "").trim();

    if (referenceName) {
      product.referenceNames.add(referenceName);

      const aliasKey = "reference|" + normalizeText(referenceName);

      if (!aliases.has(aliasKey)) {
        aliases.set(aliasKey, {
          alias: referenceName,
          normalized: normalizeText(referenceName),
          kind: "reference_name",
        });
      }
    }

    const synonyms = String(row.SINONIMOS ?? "").trim();

    if (synonyms) {
      for (const synonym of synonyms.split(/[,;]+/)) {
        const clean = synonym.trim();

        if (!clean) {
          continue;
        }

        product.synonyms.add(clean);

        const aliasKey = "synonym|" + normalizeText(clean);

        if (!aliases.has(aliasKey)) {
          aliases.set(aliasKey, {
            alias: clean,
            normalized: normalizeText(clean),
            kind: "synonym",
          });
        }
      }
    }

    if (!productNameToIds.has(normalizedProduct)) {
      productNameToIds.set(normalizedProduct, new Set());
    }

    productNameToIds.get(normalizedProduct).add(productId);

    if (registration) {
      if (!registrationToNames.has(registration)) {
        registrationToNames.set(registration, new Set());
      }

      registrationToNames.get(registration).add(normalizedProduct);
    }
  }

  return {
    activeRows,
    substances,
    products,
    aliases,
    productNameToIds,
    registrationToNames,
    productToSubstances,
    substanceToProducts,
    missingSubstanceName,
    missingProductName,
    combinationLikeSubstances,
  };
}

function countMapWhere(map, predicate) {
  let count = 0;

  for (const [key, value] of map.entries()) {
    if (predicate(value, key)) {
      count += 1;
    }
  }

  return count;
}

function printExamples(title, items, limit = 10) {
  console.log("\n" + title);

  for (const item of items.slice(0, limit)) {
    console.log(JSON.stringify(item, null, 2));
  }
}

function main() {
  console.log("🧠 VAULT — MAPEAMENTO CANÔNICO DA ANVISA");
  console.log("");
  console.log("🚫 NÃO GRAVA NO SUPABASE.");
  console.log("🚫 NÃO ALTERA DEXIE.");
  console.log("🚫 NÃO ALTERA MEDICAMENTOS DO USUÁRIO.");
  console.log("🔐 TLS verificado: " + (TLS_VERIFICATION_BYPASSED ? "NÃO — BYPASS TEMPORÁRIO" : "SIM"));
  console.log("");

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "vault-medication-map-")
  );

  try {
    const dataset = loadRows(tempDir);
    const mapped = mapRows(dataset.rows);

    const multiSubstanceProducts = [];

    for (const [productId, substanceNames] of mapped.productToSubstances.entries()) {
      if (substanceNames.size > 1) {
        const product = mapped.products.get(productId);

        multiSubstanceProducts.push({
          productId,
          productName: product?.name ?? "",
          substances: Array.from(substanceNames),
        });
      }
    }

    const sameNameMultipleProducts = [];

    for (const [normalizedName, ids] of mapped.productNameToIds.entries()) {
      if (ids.size > 1) {
        sameNameMultipleProducts.push({
          normalizedName,
          productCount: ids.size,
          productIds: Array.from(ids).slice(0, 12),
        });
      }
    }

    const registrationMultipleNames = [];

    for (const [registration, names] of mapped.registrationToNames.entries()) {
      if (names.size > 1) {
        registrationMultipleNames.push({
          registration,
          names: Array.from(names),
        });
      }
    }

    const substanceWithManySourceIds = [];

    for (const substance of mapped.substances.values()) {
      if (substance.sourceIds.size > 1) {
        substanceWithManySourceIds.push({
          canonicalName: substance.canonicalName,
          sourceIds: Array.from(substance.sourceIds),
          productCount: substance.productIds.size,
        });
      }
    }

    console.log("============================================================");
    console.log("📊 RESUMO CANÔNICO");
    console.log("Encoding:                         " + dataset.encoding);
    console.log("Linhas totais:                    " + dataset.rows.length);
    console.log("Linhas ativas:                    " + mapped.activeRows.length);
    console.log("Substâncias canônicas por nome:   " + mapped.substances.size);
    console.log("Produtos canônicos por CO_SEQ:    " + mapped.products.size);
    console.log("Aliases únicos encontrados:       " + mapped.aliases.size);
    console.log("Ativos sem substância nomeada:    " + mapped.missingSubstanceName);
    console.log("Ativos sem produto/CO_SEQ válido: " + mapped.missingProductName);
    console.log("Substâncias com aparência composta:" + mapped.combinationLikeSubstances);

    console.log("\n============================================================");
    console.log("🧬 AMBIGUIDADES / DIAGNÓSTICO");
    console.log("Produtos ligados a >1 substância:       " + multiSubstanceProducts.length);
    console.log("Mesmo nome em >1 CO_SEQ_PRODUTO:        " + sameNameMultipleProducts.length);
    console.log("Mesmo registro com >1 nome normalizado: " + registrationMultipleNames.length);
    console.log("Mesmo nome de substância com >1 CO_SUBSTANCIA: " + substanceWithManySourceIds.length);

    const genericCount = countMapWhere(
      mapped.products,
      (product) => product.kind === "generic"
    );

    const similarCount = countMapWhere(
      mapped.products,
      (product) => product.kind === "similar"
    );

    const brandCount = countMapWhere(
      mapped.products,
      (product) => product.kind === "brand"
    );

    const otherCount = mapped.products.size - genericCount - similarCount - brandCount;

    console.log("\n============================================================");
    console.log("🏷️ TIPOS DE PRODUTO MAPEADOS");
    console.log("Genéricos: " + genericCount);
    console.log("Similares: " + similarCount);
    console.log("Marca/Novo: " + brandCount);
    console.log("Outros: " + otherCount);

    multiSubstanceProducts.sort((a, b) => b.substances.length - a.substances.length);
    sameNameMultipleProducts.sort((a, b) => b.productCount - a.productCount);
    substanceWithManySourceIds.sort((a, b) => b.sourceIds.length - a.sourceIds.length);

    printExamples(
      "🔬 Exemplos: produtos ligados a múltiplas substâncias",
      multiSubstanceProducts
    );

    printExamples(
      "🔬 Exemplos: mesmo nome em múltiplos produtos",
      sameNameMultipleProducts
    );

    printExamples(
      "🔬 Exemplos: mesmo registro com múltiplos nomes",
      registrationMultipleNames
    );

    printExamples(
      "🔬 Exemplos: nome de substância associado a múltiplos CO_SUBSTANCIA",
      substanceWithManySourceIds
    );

    console.log("\n============================================================");
    console.log("✅ Mapeamento concluído.");
    console.log("🧾 Nenhum dado persistido.");
    console.log("🧠 Próxima etapa: definir regras de importação com base nas ambiguidades encontradas.");
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

try {
  main();
} catch (error) {
  console.error("\n❌ Falha no mapeamento:");
  console.error(
    error instanceof Error
      ? error.stack || error.message
      : error
  );
  process.exit(1);
}
