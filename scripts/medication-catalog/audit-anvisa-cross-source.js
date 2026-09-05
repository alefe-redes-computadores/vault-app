// scripts/medication-catalog/audit-anvisa-cross-source.js

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const {
  execFileSync,
} = require("child_process");

const {
  TextDecoder,
} = require("util");

const TLS_VERIFICATION_BYPASSED = true;

const SOURCES = {
  consulta: {
    label: "TA_CONSULTA_MEDICAMENTOS.CSV",
    url: "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV",
  },
  precos: {
    label: "TA_PRECOS_MEDICAMENTOS.csv",
    url: "https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv",
  },
  restricoes: {
    label: "TA_RESTRICAO_MEDICAMENTO.csv",
    url: "https://dados.anvisa.gov.br/dados/TA_RESTRICAO_MEDICAMENTO.csv",
  },
};

const TARGET_TERMS = [
  "amitriptilina",
  "lisdexanfetamina",
  "venvanse",
  "clonazepam",
  "rivotril",
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(value) {
  return String(value ?? "")
    .replace(/\D+/g, "");
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

  const headers = rows[0].map(
    (value) => value.replace(/^\uFEFF/, "")
  );

  return rows.slice(1).map((row) => {
    const item = {};

    for (let i = 0; i < headers.length; i += 1) {
      item[headers[i]] = row[i] ?? "";
    }

    return item;
  });
}

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function downloadSource(source, tempDir) {
  const destination = path.join(tempDir, source.label);

  console.log("⬇️ Baixando " + source.label + "...");

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
      "240",
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

function loadCsv(source, tempDir) {
  const downloaded = downloadSource(source, tempDir);
  const buffer = fs.readFileSync(downloaded);
  const decoded = decodeBuffer(buffer);
  const text = decoded.text.replace(/^\uFEFF/, "");
  const firstBreak = text.search(/\r?\n/);

  if (firstBreak === -1) {
    throw new Error("Cabeçalho inválido em " + source.label);
  }

  const delimiter = detectDelimiter(text.slice(0, firstBreak));
  const parsed = parseCsv(text, delimiter);

  return {
    label: source.label,
    encoding: decoded.encoding,
    bytes: buffer.length,
    hash: sha256(buffer),
    rows: rowsToObjects(parsed),
  };
}

function addToMapSet(map, key, value) {
  if (!key) {
    return;
  }

  if (!map.has(key)) {
    map.set(key, new Set());
  }

  map.get(key).add(value);
}

function buildConsultaIndexes(rows) {
  const active = rows.filter(
    (row) => normalizeText(row.VALIDADE_SITUACAO) === "ativo"
  );

  const byRegistration = new Map();
  const byProductName = new Map();
  const byProductAndSubstance = new Map();

  for (const row of active) {
    const registration = digitsOnly(row.NU_REGISTRO_PRODUTO);
    const productName = normalizeText(row.NO_PRODUTO);
    const substance = normalizeText(row.SUBSTANCIAS_MEDICAMENTOS);

    if (registration) {
      byRegistration.set(registration, row);
    }

    if (productName) {
      addToMapSet(byProductName, productName, row.CO_SEQ_PRODUTO);
    }

    if (productName && substance) {
      addToMapSet(
        byProductAndSubstance,
        productName + "|" + substance,
        row.CO_SEQ_PRODUTO
      );
    }
  }

  return {
    active,
    byRegistration,
    byProductName,
    byProductAndSubstance,
  };
}

function candidateBaseRegistrations(presentationRegistration) {
  const digits = digitsOnly(presentationRegistration);
  const candidates = [];

  for (let length = 8; length <= Math.min(13, digits.length); length += 1) {
    candidates.push(digits.slice(0, length));
  }

  return Array.from(new Set(candidates));
}

function auditPrices(rows, consulta) {
  let validRegistrationRows = 0;
  let exactRegistrationMatches = 0;
  let prefixUniqueMatches = 0;
  let prefixAmbiguousMatches = 0;
  let prefixNoMatches = 0;
  let matchedByProductName = 0;

  const matchedPrefixLength = new Map();
  const ggremCounts = new Map();
  const eanCounts = new Map();
  const presentationCountByBase = new Map();
  const unmatchedExamples = [];
  const ambiguousExamples = [];

  for (const row of rows) {
    const presentationRegistration = digitsOnly(row.NU_REGISTRO);
    const productName = normalizeText(row.NO_PRODUTO);

    const ggrem = String(row.CO_GGREM ?? "").trim();
    const ean = String(row.CO_EAN ?? "").trim();

    if (ggrem && normalizeText(ggrem) !== "si nc") {
      ggremCounts.set(ggrem, (ggremCounts.get(ggrem) ?? 0) + 1);
    }

    if (ean && normalizeText(ean) !== "si nc") {
      eanCounts.set(ean, (eanCounts.get(ean) ?? 0) + 1);
    }

    if (!presentationRegistration) {
      continue;
    }

    validRegistrationRows += 1;

    if (consulta.byRegistration.has(presentationRegistration)) {
      exactRegistrationMatches += 1;
      const key = presentationRegistration;
      presentationCountByBase.set(
        key,
        (presentationCountByBase.get(key) ?? 0) + 1
      );
      continue;
    }

    const candidates = candidateBaseRegistrations(presentationRegistration);
    const hits = [];

    for (const candidate of candidates) {
      if (consulta.byRegistration.has(candidate)) {
        hits.push(candidate);
      }
    }

    const uniqueHits = Array.from(new Set(hits));

    if (uniqueHits.length === 1) {
      prefixUniqueMatches += 1;

      const matched = uniqueHits[0];
      matchedPrefixLength.set(
        matched.length,
        (matchedPrefixLength.get(matched.length) ?? 0) + 1
      );

      presentationCountByBase.set(
        matched,
        (presentationCountByBase.get(matched) ?? 0) + 1
      );

      continue;
    }

    if (uniqueHits.length > 1) {
      prefixAmbiguousMatches += 1;

      if (ambiguousExamples.length < 12) {
        ambiguousExamples.push({
          registroApresentacao: row.NU_REGISTRO,
          produto: row.NO_PRODUTO,
          candidatos: uniqueHits,
        });
      }

      continue;
    }

    const idsByName = consulta.byProductName.get(productName);

    if (idsByName && idsByName.size === 1) {
      matchedByProductName += 1;
    } else {
      prefixNoMatches += 1;

      if (unmatchedExamples.length < 12) {
        unmatchedExamples.push({
          registroApresentacao: row.NU_REGISTRO,
          produto: row.NO_PRODUTO,
          substancia: row.DS_SUBSTANCIA,
          apresentacao: row.DS_APRESENTACAO,
        });
      }
    }
  }

  const duplicateGgrem = Array.from(ggremCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const duplicateEan = Array.from(eanCounts.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const presentationDistribution = Array.from(presentationCountByBase.values());

  return {
    total: rows.length,
    validRegistrationRows,
    exactRegistrationMatches,
    prefixUniqueMatches,
    prefixAmbiguousMatches,
    prefixNoMatches,
    matchedByProductName,
    matchedPrefixLength,
    duplicateGgrem,
    duplicateEan,
    presentationDistribution,
    unmatchedExamples,
    ambiguousExamples,
  };
}

function auditRestrictions(rows, consulta) {
  const productNames = new Set();
  const forms = new Map();
  const prescriptionRestrictions = new Map();
  const useRestrictions = new Map();

  let exactProductNameUnique = 0;
  let exactProductNameAmbiguous = 0;
  let exactProductAndSubstanceUnique = 0;
  let exactProductAndSubstanceAmbiguous = 0;
  let noProductMatch = 0;

  const unmatchedExamples = [];
  const ambiguousExamples = [];

  for (const row of rows) {
    const product = normalizeText(row.NO_PRODUTO);
    const substance = normalizeText(row.NO_PRINICIPIO_ATIVO);

    if (product) {
      productNames.add(product);
    }

    const form = String(row.DS_FORMA_FISICA ?? "").trim() || "(vazio)";
    forms.set(form, (forms.get(form) ?? 0) + 1);

    const prescription = String(row.DS_RESTRICAO_PRESCRICAO ?? "").trim() || "(vazio)";
    prescriptionRestrictions.set(
      prescription,
      (prescriptionRestrictions.get(prescription) ?? 0) + 1
    );

    const use = String(row.DS_RESTRICAO_USO ?? "").trim() || "(vazio)";
    useRestrictions.set(use, (useRestrictions.get(use) ?? 0) + 1);

    const byName = consulta.byProductName.get(product);

    if (byName) {
      if (byName.size === 1) {
        exactProductNameUnique += 1;
      } else {
        exactProductNameAmbiguous += 1;
      }
    } else {
      noProductMatch += 1;

      if (unmatchedExamples.length < 12) {
        unmatchedExamples.push({
          produto: row.NO_PRODUTO,
          principioAtivo: row.NO_PRINICIPIO_ATIVO,
          concentracao: row.DS_CONCENTRACAO,
          forma: row.DS_FORMA_FISICA,
        });
      }
    }

    if (product && substance) {
      const byProductAndSubstance = consulta.byProductAndSubstance.get(
        product + "|" + substance
      );

      if (byProductAndSubstance) {
        if (byProductAndSubstance.size === 1) {
          exactProductAndSubstanceUnique += 1;
        } else {
          exactProductAndSubstanceAmbiguous += 1;

          if (ambiguousExamples.length < 12) {
            ambiguousExamples.push({
              produto: row.NO_PRODUTO,
              principioAtivo: row.NO_PRINICIPIO_ATIVO,
              ids: Array.from(byProductAndSubstance).slice(0, 12),
            });
          }
        }
      }
    }
  }

  return {
    total: rows.length,
    uniqueProducts: productNames.size,
    forms,
    prescriptionRestrictions,
    useRestrictions,
    exactProductNameUnique,
    exactProductNameAmbiguous,
    exactProductAndSubstanceUnique,
    exactProductAndSubstanceAmbiguous,
    noProductMatch,
    unmatchedExamples,
    ambiguousExamples,
  };
}

function printTopMap(title, map, limit = 20) {
  console.log("\n" + title);

  const values = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  for (const [label, count] of values) {
    console.log("  " + String(count).padStart(7, " ") + "  " + label);
  }
}

function percent(value, total) {
  if (!total) {
    return "0.00%";
  }

  return ((value / total) * 100).toFixed(2) + "%";
}

function describePresentationDistribution(values) {
  if (values.length === 0) {
    return { min: 0, max: 0, average: 0 };
  }

  let total = 0;
  let min = values[0];
  let max = values[0];

  for (const value of values) {
    total += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return {
    min,
    max,
    average: total / values.length,
  };
}

function matchesTarget(row, fields, target) {
  const normalizedTarget = normalizeText(target);

  return fields.some(
    (field) => normalizeText(row[field]).includes(normalizedTarget)
  );
}

function printTargetAudit(target, consultaRows, priceRows, restrictionRows) {
  const consultaMatches = consultaRows.filter(
    (row) => matchesTarget(
      row,
      ["NO_PRODUTO", "SUBSTANCIAS_MEDICAMENTOS", "DS_REFERENCIA", "SINONIMOS"],
      target
    )
  );

  const priceMatches = priceRows.filter(
    (row) => matchesTarget(
      row,
      ["NO_PRODUTO", "DS_SUBSTANCIA", "DS_APRESENTACAO"],
      target
    )
  );

  const restrictionMatches = restrictionRows.filter(
    (row) => matchesTarget(
      row,
      ["NO_PRODUTO", "NO_PRINICIPIO_ATIVO"],
      target
    )
  );

  console.log("\n▶ " + target);
  console.log("  Catálogo principal: " + consultaMatches.length);
  console.log("  Apresentações/preços: " + priceMatches.length);
  console.log("  Restrições: " + restrictionMatches.length);

  const products = Array.from(new Set(
    consultaMatches.map((row) => String(row.NO_PRODUTO ?? "").trim()).filter(Boolean)
  )).slice(0, 12);

  const substances = Array.from(new Set(
    consultaMatches.map((row) => String(row.SUBSTANCIAS_MEDICAMENTOS ?? "").trim()).filter(Boolean)
  )).slice(0, 12);

  const presentations = Array.from(new Set(
    priceMatches.map((row) => String(row.DS_APRESENTACAO ?? "").trim()).filter(Boolean)
  )).slice(0, 12);

  const forms = Array.from(new Set(
    restrictionMatches.map((row) => String(row.DS_FORMA_FISICA ?? "").trim()).filter(Boolean)
  )).slice(0, 12);

  const restrictions = Array.from(new Set(
    restrictionMatches.map((row) => String(row.DS_RESTRICAO_PRESCRICAO ?? "").trim()).filter(Boolean)
  )).slice(0, 12);

  if (products.length) {
    console.log("  Produtos: " + products.join(" | "));
  }

  if (substances.length) {
    console.log("  Substâncias: " + substances.join(" | "));
  }

  if (presentations.length) {
    console.log("  Apresentações:");
    for (const value of presentations) {
      console.log("    - " + value);
    }
  }

  if (forms.length) {
    console.log("  Formas: " + forms.join(" | "));
  }

  if (restrictions.length) {
    console.log("  Restrições de prescrição: " + restrictions.join(" | "));
  }

  console.log("  Tipo específico de receituário Vault: NÃO INFERIDO");
}

function main() {
  console.log("🧠 VAULT — AUDITORIA DE CRUZAMENTO DAS FONTES ANVISA");
  console.log("");
  console.log("🚫 NÃO GRAVA NO SUPABASE.");
  console.log("🚫 NÃO ALTERA DEXIE.");
  console.log("🚫 NÃO INFERIRÁ RECEITA AZUL/AMARELA/BRANCA.");
  console.log("🔐 TLS verificado: " + (TLS_VERIFICATION_BYPASSED ? "NÃO — BYPASS TEMPORÁRIO DE DESENVOLVIMENTO" : "SIM"));
  console.log("");

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "vault-anvisa-cross-")
  );

  try {
    const consulta = loadCsv(SOURCES.consulta, tempDir);
    const precos = loadCsv(SOURCES.precos, tempDir);
    const restricoes = loadCsv(SOURCES.restricoes, tempDir);

    console.log("\n============================================================");
    console.log("📚 FONTES CARREGADAS");

    for (const dataset of [consulta, precos, restricoes]) {
      console.log("\n" + dataset.label);
      console.log("  Registros: " + dataset.rows.length);
      console.log("  Tamanho: " + dataset.bytes + " bytes");
      console.log("  Encoding: " + dataset.encoding);
      console.log("  SHA-256: " + dataset.hash);
    }

    const consultaIndexes = buildConsultaIndexes(consulta.rows);
    const priceAudit = auditPrices(precos.rows, consultaIndexes);
    const restrictionAudit = auditRestrictions(restricoes.rows, consultaIndexes);

    console.log("\n============================================================");
    console.log("📦 CRUZAMENTO — APRESENTAÇÕES / PREÇOS");
    console.log("Linhas totais:                         " + priceAudit.total);
    console.log("Linhas com NU_REGISTRO numérico:       " + priceAudit.validRegistrationRows);
    console.log("Match exato com registro-base:         " + priceAudit.exactRegistrationMatches + " (" + percent(priceAudit.exactRegistrationMatches, priceAudit.validRegistrationRows) + ")");
    console.log("Match único por prefixo candidato:      " + priceAudit.prefixUniqueMatches + " (" + percent(priceAudit.prefixUniqueMatches, priceAudit.validRegistrationRows) + ")");
    console.log("Prefixo encontrou >1 candidato:         " + priceAudit.prefixAmbiguousMatches);
    console.log("Sem match por registro/prefixo:         " + priceAudit.prefixNoMatches);
    console.log("Resgatados por nome único de produto:   " + priceAudit.matchedByProductName);

    printTopMap(
      "Comprimentos de prefixo que produziram match único:",
      priceAudit.matchedPrefixLength,
      20
    );

    console.log("\nGGREM duplicados: " + priceAudit.duplicateGgrem.length);
    console.log("EAN duplicados:   " + priceAudit.duplicateEan.length);

    console.log("\nTop GGREM duplicados:");
    for (const [value, count] of priceAudit.duplicateGgrem.slice(0, 10)) {
      console.log("  " + count + "x  " + value);
    }

    console.log("\nTop EAN duplicados:");
    for (const [value, count] of priceAudit.duplicateEan.slice(0, 10)) {
      console.log("  " + count + "x  " + value);
    }

    const distribution = describePresentationDistribution(
      priceAudit.presentationDistribution
    );

    console.log("\nApresentações por produto ligado:");
    console.log("  Produtos com apresentação ligada: " + priceAudit.presentationDistribution.length);
    console.log("  Mínimo: " + distribution.min);
    console.log("  Máximo: " + distribution.max);
    console.log("  Média: " + distribution.average.toFixed(2));

    console.log("\nExemplos sem vínculo seguro:");
    for (const example of priceAudit.unmatchedExamples) {
      console.log(JSON.stringify(example, null, 2));
    }

    console.log("\nExemplos de prefixo ambíguo:");
    for (const example of priceAudit.ambiguousExamples) {
      console.log(JSON.stringify(example, null, 2));
    }

    console.log("\n============================================================");
    console.log("🩺 CRUZAMENTO — RESTRIÇÕES");
    console.log("Linhas totais:                              " + restrictionAudit.total);
    console.log("Produtos normalizados únicos:               " + restrictionAudit.uniqueProducts);
    console.log("Match por nome com produto único:            " + restrictionAudit.exactProductNameUnique);
    console.log("Match por nome com produto ambíguo:          " + restrictionAudit.exactProductNameAmbiguous);
    console.log("Match nome + princípio ativo único:           " + restrictionAudit.exactProductAndSubstanceUnique);
    console.log("Match nome + princípio ativo ainda ambíguo:   " + restrictionAudit.exactProductAndSubstanceAmbiguous);
    console.log("Sem nome correspondente no catálogo ativo:    " + restrictionAudit.noProductMatch);

    printTopMap(
      "Formas farmacêuticas mais frequentes:",
      restrictionAudit.forms,
      25
    );

    printTopMap(
      "Restrições de prescrição encontradas:",
      restrictionAudit.prescriptionRestrictions,
      30
    );

    printTopMap(
      "Restrições de uso encontradas:",
      restrictionAudit.useRestrictions,
      20
    );

    console.log("\nExemplos sem vínculo por nome:");
    for (const example of restrictionAudit.unmatchedExamples) {
      console.log(JSON.stringify(example, null, 2));
    }

    console.log("\nExemplos ainda ambíguos por nome + princípio ativo:");
    for (const example of restrictionAudit.ambiguousExamples) {
      console.log(JSON.stringify(example, null, 2));
    }

    console.log("\n============================================================");
    console.log("🧪 CASOS-TESTE");

    for (const target of TARGET_TERMS) {
      printTargetAudit(
        target,
        consultaIndexes.active,
        precos.rows,
        restricoes.rows
      );
    }

    console.log("\n============================================================");
    console.log("✅ Auditoria 4D6 concluída.");
    console.log("🧾 Nenhum dado persistido.");
    console.log("🧠 Nenhuma regra de receituário específico foi inferida.");
    console.log("🏥 Envie esta saída para definirmos o pacote canônico de importação.");
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
  console.error("\n❌ Falha na auditoria:");
  console.error(
    error instanceof Error
      ? error.stack || error.message
      : error
  );
  process.exit(1);
}
