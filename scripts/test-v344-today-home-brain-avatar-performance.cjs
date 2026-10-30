#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const today = fs.readFileSync("app/hoje/page.tsx", "utf8");
const actionCenter = fs.readFileSync("components/hoje/TodayActionCenter.tsx", "utf8");
const command = fs.readFileSync("components/saude/CareCommandStrip.tsx", "utf8");
const home = fs.readFileSync("components/home/HomeCommandCenter.tsx", "utf8");
const homePage = fs.readFileSync("app/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/AvatarCareWorkspace.tsx", "utf8");
const gate = fs.readFileSync("scripts/test-v63-release-gate.mjs", "utf8");

assert(today.includes("<TodayActionCenter") && today.includes("pendingDoses={totalPendentes}"), "Hoje delegates its priority hierarchy without changing dose authority");
assert(actionCenter.includes('aria-label="Prioridades de hoje"') && actionCenter.includes("<CareCommandStrip"), "Today action center keeps doses and Brain in one navigable hierarchy");
assert(actionCenter.includes("!command?.decision && brainFallback"), "Brain fallback cannot duplicate a canonical care decision");
assert(command.includes("evidenceOpen ?") && command.includes('aria-controls={evidenceId}'), "Brain evidence mounts on demand and remains accessible");
assert(command.includes("Abrir esta etapa não registra automaticamente dose, receita, compra ou retirada"), "Brain never converts a suggestion into a real event");
assert(home.includes('id="home-outras-areas"') && home.includes('id="home-organizacao"'), "Home separates primary actions from secondary domains");
assert((home.match(/\{\(\) =>/g) || []).length >= 2, "Home secondary domains mount lazily");
assert(homePage.includes("{() => <>") && homePage.includes('id="home-health-evidence"'), "Home Brain evidence list mounts only when disclosed");
assert(avatar.includes('id="avatar-contexto-evidencias"') && avatar.includes("{() => <AvatarEvidenceWorkspace"), "Avatar evidence workspace mounts on demand");
assert(gate.includes("scripts/test-v344-today-home-brain-avatar-performance.cjs"), "V344 belongs to release gate");
console.log("VAULT V344 — HOJE + HOME + BRAIN + AVATAR + PERFORMANCE: OK");
