#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const authority = fs.readFileSync("lib/medications/form-presentation.tsx", "utf8");
const create = fs.readFileSync("app/saude/medicamentos/novo/page.tsx", "utf8");
const edit = fs.readFileSync("app/saude/medicamentos/editar/page.tsx", "utf8");

for (const page of [create, edit]) {
  assert(page.includes('from "@/lib/medications/form-presentation"'), "form must consume canonical medication identity");
  assert(!page.includes("const FORMATOS_PRINCIPAIS = ["), "form must not redefine primary formats");
  assert(!page.includes("const FORMATOS_ADICIONAIS = ["), "form must not redefine additional formats");
  assert(!page.includes("const CORES_DISPONIVEIS = ["), "form must not redefine identity palette");
  assert(!page.includes("type CatalogPresentationSuggestion = {"), "form must share catalog presentation suggestion type");
}

for (const format of ["comprimido", "partido", "capsula", "gota", "injecao", "adesivo", "solucao", "suspensao", "xarope", "spray", "inalador", "creme", "pomada", "gel", "colirio", "supositorio", "ovulo", "po", "granulado", "sache", "sublingual", "bucal", "mastigavel", "efervescente", "dispersivel", "implante"]) {
  assert(authority.includes(`id: "${format}"`), `canonical identity keeps ${format}`);
}
assert(authority.includes("MEDICATION_PRIMARY_FORMATS") && authority.includes("MEDICATION_ADDITIONAL_FORMATS") && authority.includes("MEDICATION_IDENTITY_COLORS"));
assert(authority.includes('"#FFFFFF"') && authority.includes('"#64748B"'), "canonical palette keeps endpoints");

const week = fs.readFileSync("components/saude/AvatarWeekCoverage.tsx", "utf8");
const access = fs.readFileSync("components/saude/CareAccessBrief.tsx", "utf8");
assert(week.includes("export const AvatarWeekCoverage = memo"), "Avatar weekly evidence avoids unchanged rerenders");
assert(access.includes("export const CareAccessBrief = memo"), "Brain document readiness avoids unchanged rerenders");

const gate = fs.readFileSync("scripts/test-v63-release-gate.mjs", "utf8");
assert(gate.includes("scripts/test-v350-medication-identity-avatar-performance.cjs"));
console.log("VAULT V350 — MEDICATION IDENTITY AUTHORITY + AVATAR/BRAIN PERFORMANCE: OK");
