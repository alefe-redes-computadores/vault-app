#!/usr/bin/env node
"use strict";
/**
 * M57 — Build Android resiliente a falha transitória do next/font/google.
 * Não altera fontes nem código da aplicação. Não tenta novamente erros genéricos.
 */
const { spawn } = require("node:child_process");
const { rmSync } = require("node:fs");
const { join } = require("node:path");

const MAX_ATTEMPTS = 3;
const LOG_LIMIT = 160 * 1024;

function isTransientGoogleFontError(log) {
  const hasFontLoader = /(?:next\\?\/font|@next\\?\/font|fonts\.googleapis\.com|fonts\.gstatic\.com)/i.test(log);
  const hasKnownFailure = /(?:Cannot read properties of null \(reading ['"]1['"]\)|Failed to fetch [`'\w ]+ from Google Fonts|fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND)/i.test(log);
  return hasFontLoader && hasKnownFailure;
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function executeBuild() {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", "build:export"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const append = (chunk, destination) => {
      const text = chunk.toString("utf8");
      destination.write(text);
      output = (output + text).slice(-LOG_LIMIT);
    };
    child.stdout.on("data", (chunk) => append(chunk, process.stdout));
    child.stderr.on("data", (chunk) => append(chunk, process.stderr));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      process.stderr.write(`M57: não foi possível iniciar npm: ${error.message}\n`);
      resolve({ code: 127, output: error.message });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      resolve({ code: code === null ? 1 : code, signal, output });
    });
  });
}

function cleanBuildCache() {
  for (const directory of [".next", "out"]) {
    rmSync(join(process.cwd(), directory), { recursive: true, force: true });
  }
}

async function runWithFontRetry({
  execute = executeBuild,
  clean = cleanBuildCache,
  wait = pause,
  write = (message) => process.stdout.write(message + "\n"),
  maxAttempts = MAX_ATTEMPTS,
} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new Error("Quantidade de tentativas inválida");
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    write(`M57: exportação Android ${attempt}/${maxAttempts} (fontes preservadas)`);
    const result = await execute();
    if (result.code === 0) {
      write(`M57: exportação aprovada na tentativa ${attempt}`);
      return 0;
    }
    if (!isTransientGoogleFontError(result.output || "")) {
      write(`M57: falha não relacionada a next/font/google (código ${result.code}); sem repetição`);
      return result.code || 1;
    }
    if (attempt === maxAttempts) {
      write(`M57: erro de fonte persistiu nas ${maxAttempts} tentativas; build BLOQUEADO`);
      return result.code || 1;
    }
    write(`M57: falha externa de fonte detectada; limpando .next/out e repetindo uma única etapa`);
    clean();
    await wait(attempt * 1500);
  }
  return 1;
}

module.exports = { isTransientGoogleFontError, runWithFontRetry, MAX_ATTEMPTS };

if (require.main === module) {
  runWithFontRetry().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    process.stderr.write(`M57: erro fatal na proteção de build: ${error.stack || error}\n`);
    process.exitCode = 1;
  });
}
