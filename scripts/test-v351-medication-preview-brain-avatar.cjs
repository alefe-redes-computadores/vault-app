#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const preview=fs.readFileSync("components/saude/MedicationIdentityPreview.tsx","utf8");
const create=fs.readFileSync("app/saude/medicamentos/novo/page.tsx","utf8");
const edit=fs.readFileSync("app/saude/medicamentos/editar/page.tsx","utf8");
assert(preview.includes("memo(function MedicationIdentityPreview")&&preview.includes("AvatarMedicamento"));
for(const page of [create,edit])assert(page.includes("<MedicationIdentityPreview name={nome} format={formato} colors={cores}"),"both forms share the live identity preview");
for(const file of ["AvatarCareReadiness","DoseEvidenceBrief","PlannedRealizedBrief","PrescriptionPlanningBrief","MedicationPurchaseRhythmBrief"]){
  const source=fs.readFileSync(`components/saude/${file}.tsx`,"utf8");
  assert(source.includes(`memo(function ${file}`),`${file} avoids unchanged Brain/Avatar rerenders`);
}
const avatar=fs.readFileSync("components/saude/HealthAvatar3D.tsx","utf8");
assert(avatar.includes("strapChannel")&&avatar.includes("phonePalmFold")&&avatar.includes("const nail=mesh"),"Avatar has static wrist, grip and nail refinements");
assert(!avatar.includes("requestAnimationFrame(function"),"refinement does not add a render loop");
const gate=fs.readFileSync("scripts/test-v63-release-gate.mjs","utf8");
assert(gate.includes("scripts/test-v351-medication-preview-brain-avatar.cjs"));
console.log("VAULT V351 — MEDICATION PREVIEW + BRAIN/AVATAR REALISM/PERFORMANCE: OK");
