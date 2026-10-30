#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const today=fs.readFileSync("app/hoje/page.tsx","utf8");
const timeline=fs.readFileSync("lib/today/build-timeline-items.ts","utf8");
const home=fs.readFileSync("app/page.tsx","utf8");
const progress=fs.readFileSync("lib/home/dose-progress.ts","utf8");
const avatar=fs.readFileSync("components/saude/AvatarCareWorkspace.tsx","utf8");
const health=fs.readFileSync("app/saude/minha-saude/page.tsx","utf8");
const gate=fs.readFileSync("scripts/test-v63-release-gate.mjs","utf8");
assert(today.includes("buildTodayTimelineItems({"),"Hoje delegates timeline projection");
for(const index of ["doctorById","treatmentById","pharmacyById","hospitalById","renewalsByMedication","historyByMedication"])
  assert(timeline.includes(index),`timeline indexes ${index}`);
assert(timeline.includes('slot.state === "conflict"')&&timeline.includes('dose_kind === "planned"'),"conflicts and planned doses remain explicit");
assert(timeline.includes('med.tipo_uso === "sos"')&&timeline.includes('med.tipo_uso === "esporadico"'),"scheduled projection excludes SOS and sporadic medication");
assert(progress.includes("takenRoutineSlots = new Set")&&progress.includes('dose_kind !== "sos"')&&progress.includes('dose_kind !== "extra"'),"Home progress is indexed and routine-only");
assert(home.includes("buildHomeDoseProgress(medicamentosAtivos, doseLogs)"),"Home delegates dose progress");
assert(avatar.includes("export const AvatarCareWorkspace = memo"),"Avatar care workspace avoids unchanged rerenders");
assert(health.includes("const goFromHealth = useCallback"),"Avatar navigation remains referentially stable");
assert(gate.includes("scripts/test-v346-today-home-projection-avatar.cjs"),"V346 belongs to release gate");
console.log("VAULT V346 — TODAY/HOME PROJECTION + AVATAR PERFORMANCE: OK");
