#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict"),fs=require("node:fs");
const page=fs.readFileSync("app/saude/medicamentos/page.tsx","utf8");
const group=fs.readFileSync("components/saude/ClinicalCollectionGroup.tsx","utf8");
const modal=fs.readFileSync("components/saude/QuickDoseModal.tsx","utf8");
const avatar=fs.readFileSync("components/saude/HealthAvatar3D.tsx","utf8");
const gate=fs.readFileSync("scripts/test-v63-release-gate.mjs","utf8");

assert(page.includes("useDeferredValue")&&page.includes("deferredSearchQuery"),"medication search defers expensive filtering");
assert(page.includes("{()=>medsPrioridade.map(renderCard)}")&&page.includes("{()=>medsEmDia.map(renderCard)}"),"large groups provide lazy render functions");
assert(group.includes('children: ReactNode | (() => ReactNode)'),"shared clinical group supports deferred children");
assert(group.includes('visible?<div')&&group.includes('typeof children==="function"?children():children'),"closed groups do not mount card trees");
assert(modal.includes("selectedMed.tipo_uso==='temporario'?'Por período':'SOS'"),"quick dose preserves temporary versus SOS semantics");
for(const marker of ["watchGlass","phoneGlass","thumbNail","CylinderGeometry(.014,.014,.028,12)"])assert(avatar.includes(marker),`missing Avatar realism marker ${marker}`);
assert(!avatar.includes("requestAnimationFrame(animate)"),"Avatar keeps event-driven rendering");
assert(gate.includes("scripts/test-v342-medication-rendering-avatar.cjs"),"V342 is part of release gate");
console.log("VAULT V342 — MEDICAMENTOS + RENDERIZAÇÃO + AVATAR: OK");
