// scripts/medication-catalog/dry-run-anvisa.js

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

const SOURCES = [
  {
    key: "dados_abertos",
    label: "DADOS_ABERTOS_MEDICAMENTOS.csv",
    url: "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv",
  },
  {
    key: "consulta",
    label: "TA_CONSULTA_MEDICAMENTOS.CSV",
    url: "https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV",
  },
];

const TARGET_TERMS = [
  "amitriptilina",
  "lisdexanfetamina",
  "venvanse",
  "clonazepam",
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
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
      "180",
      "-o",
      destination,
      source.url,
    ],
    { stdio: "inherit" }
  );

  return destination;
}

function loadCsv(source, tempDir) {
  const downloaded = downloadSource(source, tempDir);
  const buffer = fs.readFileSync(downloaded);
  const decoded = decodeBuffer(buffer);
  const cleanText = decoded.text.replace(/^\uFEFF/, "");
  const firstBreak = cleanText.search(/\r?\n/);

  if (firstBreak === -1) {
    throw new Error("Cabeçalho inválido em " + source.label);
  }

  const delimiter = detectDelimiter(cleanText.slice(0, firstBreak));
  const parsed = parseCsv(cleanText, delimiter);
  const headers = parsed[0] ?? [];
  const objects = rowsToObjects(parsed);

  return {
    label: source.label,
    encoding: decoded.encoding,
    delimiter,
    byteLength: buffer.length,
    hash: sha256(buffer),
    headers,
    rows: objects,
  };
}

function countBy(rows, field) {
  const map = new Map();

  for (const row of rows) {
    const raw = String(row[field] ?? "").trim();
    const value = raw || "(vazio)";

    map.set(value, (map.get(value) ?? 0) + 1);
  }

  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function printTop(title, values, limit = 15) {
  console.log("\n" + title);

  for (const [label, count] of values.slice(0, limit)) {
    console.log("  " + String(count).padStart(6, " ") + "  " + label);
  }
}

function analyzeDadosAbertos(dataset) {
  const rows = dataset.rows;

  const active = rows.filter(
    (row) => normalizeText(row.SITUACAO_REGISTRO) === "ativo"
  );

  const medicationRows = rows.filter(
    (row) => normalizeText(row.TIPO_PRODUTO) === "medicamento"
  );

  const activeMedicationRows = medicationRows.filter(
    (row) => normalizeText(row.SITUACAO_REGISTRO) === "ativo"
  );

  const substanceNames = new Set(
    activeMedicationRows
      .map((row) => normalizeText(row.PRINCIPIO_ATIVO))
      .filter(Boolean)
  );

  const productRegistrations = new Set(
    activeMedicationRows
      .map((row) => String(row.NUMERO_REGISTRO_PRODUTO ?? "").trim())
      .filter(Boolean)
  );

  console.log("\n------------------------------------------------------------");
  console.log("📊 DADOS_ABERTOS_MEDICAMENTOS");
  console.log("Linhas totais:                  " + rows.length);
  console.log("Linhas com situação Ativo:      " + active.length);
  console.log("Linhas TIPO_PRODUTO Medicamento:" + medicationRows.length);
  console.log("Medicamentos ativos:            " + activeMedicationRows.length);
  console.log("Substâncias ativas únicas*:     " + substanceNames.size);
  console.log("Registros de produto únicos:    " + productRegistrations.size);
  console.log("* Considera o texto completo de PRINCIPIO_ATIVO como uma identidade nesta inspeção.");

  printTop(
    "Categorias regulatórias:",
    countBy(activeMedicationRows, "CATEGORIA_REGULATORIA")
  );

  printTop(
    "Situações de registro:",
    countBy(medicationRows, "SITUACAO_REGISTRO")
  );
}

function analyzeConsulta(dataset) {
  const rows = dataset.rows;

  const active = rows.filter(
    (row) => normalizeText(row.VALIDADE_SITUACAO) === "ativo"
  );

  const withSubstanceId = active.filter(
    (row) => String(row.CO_SUBSTANCIA ?? "").trim()
  );

  const withSubstanceName = active.filter(
    (row) => String(row.SUBSTANCIAS_MEDICAMENTOS ?? "").trim()
  );

  const withReference = active.filter(
    (row) => String(row.DS_REFERENCIA ?? "").trim()
  );

  const withSynonyms = active.filter(
    (row) => String(row.SINONIMOS ?? "").trim()
  );

  const withPresentations = active.filter(
    (row) => Number(row.NUMERO_APRESENTACOES ?? 0) > 0
  );

  const uniqueSubstanceIds = new Set(
    withSubstanceId.map((row) => String(row.CO_SUBSTANCIA).trim())
  );

  const uniqueProducts = new Set(
    active
      .map((row) => String(row.CO_SEQ_PRODUTO ?? "").trim())
      .filter(Boolean)
  );

  console.log("\n------------------------------------------------------------");
  console.log("📊 TA_CONSULTA_MEDICAMENTOS");
  console.log("Linhas totais:                  " + rows.length);
  console.log("Registros ativos:               " + active.length);
  console.log("Produtos ativos únicos:         " + uniqueProducts.size);
  console.log("CO_SUBSTANCIA únicos*:          " + uniqueSubstanceIds.size);
  console.log("Ativos com substância nomeada:  " + withSubstanceName.length);
  console.log("Ativos com produto referência:  " + withReference.length);
  console.log("Ativos com sinônimos:           " + withSynonyms.length);
  console.log("Ativos com apresentações > 0:   " + withPresentations.length);
  console.log("* CO_SUBSTANCIA pode precisar de auditoria adicional caso a fonte represente múltiplas substâncias em um mesmo campo.");

  printTop(
    "Categorias regulatórias:",
    countBy(active, "DS_TIPO_CATEGORIA_REGULATORIA")
  );

  printTop(
    "Códigos de tarja mais frequentes:",
    countBy(active, "CO_TARJA")
  );

  printTop(
    "Situação das apresentações:",
    countBy(active, "TP_SITUACAO_APRESENTACAO")
  );
}

function findTargets(dataset) {
  const fields = [
    "NOME_PRODUTO",
    "PRINCIPIO_ATIVO",
    "NO_PRODUTO",
    "SUBSTANCIAS_MEDICAMENTOS",
    "DS_REFERENCIA",
    "SINONIMOS",
  ];

  console.log("\n🔬 BUSCA DE CASOS-TESTE — " + dataset.label);

  for (const term of TARGET_TERMS) {
    const normalizedTerm = normalizeText(term);

    const found = dataset.rows.filter((row) =>
      fields.some((field) =>
        normalizeText(row[field]).includes(normalizedTerm)
      )
    );

    console.log("\n▶ " + term + ": " + found.length + " linha(s)");

    for (const row of found.slice(0, 8)) {
      const summary = {
        produto: row.NO_PRODUTO || row.NOME_PRODUTO || "",
        substancia: row.SUBSTANCIAS_MEDICAMENTOS || row.PRINCIPIO_ATIVO || "",
        categoria: row.DS_TIPO_CATEGORIA_REGULATORIA || row.CATEGORIA_REGULATORIA || "",
        referencia: row.DS_REFERENCIA || "",
        sinonimos: row.SINONIMOS || "",
        registro: row.NU_REGISTRO_PRODUTO || row.NUMERO_REGISTRO_PRODUTO || "",
        situacao: row.VALIDADE_SITUACAO || row.SITUACAO_REGISTRO || "",
        tarja: row.CO_TARJA || "",
        restricao: row.CO_RESTRICAO || "",
        apresentacoes: row.NUMERO_APRESENTACOES || "",
      };

      console.log(JSON.stringify(summary, null, 2));
    }
  }
}

function printDatasetMetadata(dataset) {
  console.log("\n============================================================");
  console.log("📚 " + dataset.label);
  console.log("🔤 Encoding: " + dataset.encoding);
  console.log("📦 Tamanho: " + dataset.byteLength + " bytes");
  console.log("🔐 SHA-256: " + dataset.hash);
  console.log("📊 Colunas: " + dataset.headers.length);
  console.log("📄 Registros: " + dataset.rows.length);
}

function main() {
  console.log("🧠 VAULT — DRY-RUN DO CATÁLOGO OFICIAL ANVISA");
  console.log("");
  console.log("🚫 ESTE SCRIPT NÃO GRAVA NO SUPABASE.");
  console.log("🚫 ESTE SCRIPT NÃO ALTERA O DEXIE.");
  console.log("🚫 ESTE SCRIPT NÃO ALTERA MEDICAMENTOS DO USUÁRIO.");
  console.log("🔐 TLS verificado: " + (TLS_VERIFICATION_BYPASSED ? "NÃO — BYPASS TEMPORÁRIO DE DESENVOLVIMENTO" : "SIM"));
  console.log("");

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "vault-medication-catalog-")
  );

  try {
    for (const source of SOURCES) {
      const dataset = loadCsv(source, tempDir);

      printDatasetMetadata(dataset);

      if (source.key === "dados_abertos") {
        analyzeDadosAbertos(dataset);
      }

      if (source.key === "consulta") {
        analyzeConsulta(dataset);
      }

      findTargets(dataset);
    }
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }

  console.log("\n============================================================");
  console.log("✅ Dry-run concluído.");
  console.log("🧾 Nenhum registro foi persistido.");
  console.log("🔐 Importação real continua bloqueada enquanto TLS estiver em bypass.");
  console.log("🏥 Envie a saída completa para desenharmos o importador real.");
}

try {
  main();
} catch (error) {
  console.error("\n❌ Falha no dry-run:");
  console.error(
    error instanceof Error
      ? error.stack || error.message
      : error
  );
  process.exit(1);
}
