// scripts/medication-catalog/inspect-anvisa-supporting-sources.js

"use strict";

const {
  execFileSync,
} = require("child_process");

const {
  TextDecoder,
} = require("util");

const TLS_VERIFICATION_BYPASSED = true;

const SOURCES = [
  {
    key: "precos_medicamentos",
    label: "TA_PRECOS_MEDICAMENTOS.csv",
    url: "https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv",
  },
  {
    key: "restricao_medicamento",
    label: "TA_RESTRICAO_MEDICAMENTO.csv",
    url: "https://dados.anvisa.gov.br/dados/TA_RESTRICAO_MEDICAMENTO.csv",
  },
];

function detectDelimiter(line) {
  const candidates = [";", ",", "|", "\t"];
  let best = ";";
  let bestCount = -1;

  for (const delimiter of candidates) {
    let quoted = false;
    let count = 0;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
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

function parseCsvLine(line, delimiter) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }

      quoted = !quoted;
      continue;
    }

    if (!quoted && char === delimiter) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);

  return fields.map((value) => value.trim());
}

function getLogicalLines(text, maxLines) {
  const lines = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        current += '""';
        i += 1;
        continue;
      }

      quoted = !quoted;
      current += char;
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }

      if (current.trim()) {
        lines.push(current);
      }

      current = "";

      if (lines.length >= maxLines) {
        break;
      }

      continue;
    }

    current += char;
  }

  if (current.trim() && lines.length < maxLines) {
    lines.push(current);
  }

  return lines;
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

function downloadPreview(source) {
  return execFileSync(
    "curl",
    [
      "-k",
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--max-time",
      "60",
      "--range",
      "0-262143",
      source.url,
    ],
    {
      encoding: null,
      maxBuffer: 2 * 1024 * 1024,
    }
  );
}

function inspectSource(source) {
  console.log("============================================================");
  console.log("📚 Fonte: " + source.label);
  console.log("🌐 " + source.url);
  console.log("🔐 TLS verificado: " + (TLS_VERIFICATION_BYPASSED ? "NÃO — bypass temporário de inspeção" : "SIM"));

  const buffer = downloadPreview(source);

  if (!buffer || buffer.length === 0) {
    throw new Error("Nenhum conteúdo recebido de " + source.label);
  }

  const decoded = decodeBuffer(buffer);
  const cleanText = decoded.text.replace(/^\uFEFF/, "");
  const logicalLines = getLogicalLines(cleanText, 8);

  if (logicalLines.length < 2) {
    throw new Error("Não foi possível obter linhas suficientes de " + source.label);
  }

  const delimiter = detectDelimiter(logicalLines[0]);
  const headers = parseCsvLine(logicalLines[0], delimiter);

  console.log("📦 Bytes inspecionados: " + buffer.length);
  console.log("🔤 Encoding detectado: " + decoded.encoding);
  console.log("✂️ Separador detectado: " + (delimiter === "\t" ? "TAB" : JSON.stringify(delimiter)));
  console.log("📊 Colunas: " + headers.length);
  console.log("");
  console.log("CABEÇALHOS:");

  headers.forEach((header, index) => {
    console.log("  " + String(index + 1).padStart(2, "0") + ". " + header);
  });

  console.log("");
  console.log("AMOSTRA:");

  for (let i = 1; i < logicalLines.length; i += 1) {
    const row = parseCsvLine(logicalLines[i], delimiter);

    console.log("\nLinha " + i + ":");

    headers.forEach((header, index) => {
      const value = row[index];

      if (value === undefined || value === "") {
        return;
      }

      const truncated = value.length > 220
        ? value.slice(0, 217) + "..."
        : value;

      console.log("  " + header + ": " + truncated);
    });
  }

  console.log("");
}

function main() {
  console.log("🧠 VAULT — INSPEÇÃO DE APRESENTAÇÕES E RESTRIÇÕES ANVISA");
  console.log("Este script NÃO grava dados no Supabase.");
  console.log("⚠️ TLS BYPASS ATIVO SOMENTE PARA INSPEÇÃO.");
  console.log("");

  for (const source of SOURCES) {
    inspectSource(source);
  }

  console.log("============================================================");
  console.log("✅ Inspeção concluída.");
  console.log("📋 Nenhum dado foi gravado.");
  console.log("🏥 Envie esta saída para a próxima cirurgia.");
}

try {
  main();
} catch (error) {
  console.error("\n❌ Falha na inspeção:");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
}
