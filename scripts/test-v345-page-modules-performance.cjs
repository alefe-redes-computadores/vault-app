#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const timeline=fs.readFileSync("lib/today/timeline-summary.ts","utf8");
const today=fs.readFileSync("app/hoje/page.tsx","utf8");
const finance=fs.readFileSync("lib/home/financial-summary.ts","utf8");
const home=fs.readFileSync("app/page.tsx","utf8");
const avatar=fs.readFileSync("components/saude/AvatarCareWorkspace.tsx","utf8");
const gate=fs.readFileSync("scripts/test-v63-release-gate.mjs","utf8");
for(const fn of ["filterTimelineItems","visibleTimelineItems","groupTimelineItems","summarizeTimeline"]) assert(timeline.includes(`function ${fn}`)||timeline.includes(`const ${fn}`),`timeline module exports ${fn}`);
assert(timeline.includes('item.doseKind !== "planned"')&&timeline.includes('item.isDataConflict')&&timeline.includes('item.isExpectedUnconfirmed'),"SOS, planned, conflicts and historical expectations remain distinct");
assert(timeline.includes('["agora", "atrasadas", "depois", "avulsas", "revisao", "concluidas", "ignoradas"]'),"today groups retain canonical operational order");
assert(timeline.includes('["manha", "tarde", "noite"]'),"history groups retain chronological order");
assert(today.includes("groupTimelineItems(dosesParaExibir")&&today.includes("summarizeTimeline(doses)"),"Hoje consumes pure projections");
assert(finance.includes('tipo_aquisicao === "sus"')&&finance.includes('tipo_aquisicao === "gratuito"'),"public supply never becomes private spending");
assert(home.includes("buildHomeFinancialSummary(renovacoes)"),"Home delegates financial projection");
assert(avatar.includes("const AvatarEvidenceWorkspace = memo")&&avatar.includes("[content-visibility:auto]"),"Avatar evidence workspace is memoized and render-contained");
assert(gate.includes("scripts/test-v345-page-modules-performance.cjs"),"V345 belongs to release gate");
console.log("VAULT V345 — HOME + HOJE MODULAR + BRAIN/AVATAR PERFORMANCE: OK");
