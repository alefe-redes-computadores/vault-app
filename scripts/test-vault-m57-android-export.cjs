#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { isTransientGoogleFontError, runWithFontRetry, MAX_ATTEMPTS } = require("./ci-build-export-resilient.cjs");
const root = path.resolve(__dirname, "..");
let passed = 0;
const ok = (condition, label) => { assert.ok(condition, label); passed++; };

(async () => {
  const fontError = `app/layout.tsx\nAn error occurred in next/font.\nTypeError: Cannot read properties of null (reading '1')\n at /node_modules/next/dist/compiled/@next/font/dist/google/loader.js:112:78`;
  ok(isTransientGoogleFontError(fontError), "M57 detecta erro real de fonte observado no Actions");
  ok(isTransientGoogleFontError("next/font/google: Failed to fetch `Inter` from Google Fonts."), "M57 detecta falha de rede de fonte");
  ok(!isTransientGoogleFontError("app/layout.tsx: TypeError: Cannot read properties of null (reading '1')"), "M57 não confunde TypeError de aplicação");
  ok(!isTransientGoogleFontError("next/font: syntax error in JSX"), "M57 não repete falha genérica na fonte");
  ok(!isTransientGoogleFontError("error TS2339 Property x does not exist"), "M57 não esconde erro TypeScript");
  ok(!isTransientGoogleFontError("Module not found: Can't resolve lucide-react"), "M57 não esconde dependência ausente");
  ok(MAX_ATTEMPTS === 3, "M57 limita tentativas a três");

  const fake = (results) => {
    let n = 0, clean = 0, waits = [], msgs = [];
    const params = {
      execute: async () => results[n++],
      clean: () => { clean++; },
      wait: async (duration) => { waits.push(duration); },
      write: (m) => msgs.push(m),
    };
    return {params, counts: () => ({ n, clean, waits, msgs })};
  };
  {
    const f = fake([{ code: 0, output: "OK" }]);
    ok((await runWithFontRetry(f.params)) === 0, "M57 aprova build limpo");
    ok(f.counts().n === 1 && f.counts().clean === 0, "M57 não repete build aprovado");
  }
  {
    const f = fake([{ code: 1, output: fontError }, { code: 0, output: "OK" }]);
    ok((await runWithFontRetry(f.params)) === 0, "M57 recupera falha de fonte transitória");
    ok(f.counts().n === 2 && f.counts().clean === 1, "M57 limpa cache uma vez");
    ok(f.counts().waits[0] === 1500, "M57 usa espera progressiva limitada");
  }
  {
    const f = fake([{ code: 1, output: fontError }, { code: 1, output: fontError }, { code: 0, output: "OK" }]);
    ok((await runWithFontRetry(f.params)) === 0, "M57 recupera na terceira tentativa");
    ok(f.counts().n === 3 && f.counts().clean === 2, "M57 não ultrapassa três tentativas");
  }
  {
    const f = fake([{ code: 2, output: "error TS2322: incompatible" }]);
    ok((await runWithFontRetry(f.params)) === 2, "M57 mantém código do erro TypeScript");
    ok(f.counts().n === 1 && f.counts().clean === 0, "M57 não repete nem limpa diante de erro TypeScript");
  }
  {
    const f = fake([{ code: 4, output: fontError }, { code: 4, output: fontError }, { code: 4, output: fontError }]);
    ok((await runWithFontRetry(f.params)) === 4, "M57 reprova falha de fonte persistente");
    ok(f.counts().n === 3 && f.counts().clean === 2, "M57 nunca entra em loop infinito");
  }
  {
    const f = fake([{ code: 127, output: "spawn npm ENOENT" }]);
    ok((await runWithFontRetry(f.params)) === 127, "M57 não esconde ausência do npm");
  }
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/build-android.yml"), "utf8");
  const gate = fs.readFileSync(path.join(root, "scripts/test-v63-release-gate.mjs"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
  ok(workflow.includes('run: node scripts/ci-build-export-resilient.cjs'), "M57 conecta proteção à etapa real do Actions");
  ok(workflow.includes('run: npm run test:release'), "M57 preserva gate antes do build");
  ok(workflow.includes('Disponibilizar APK'), "M57 preserva artefato Android");
  ok(gate.includes('"scripts/test-vault-m57-android-export.cjs"'), "M57 participa do gate canônico");
  ok(layout.includes('Space_Grotesk') && layout.includes('IBM_Plex_Mono') && layout.includes('Inter,'), "M57 preserva fontes da identidade original");
  console.log(`M57: ${passed} verificações de build Android aprovadas`);
})().catch((err) => { console.error(err); process.exitCode = 1; });
