#!/usr/bin/env node
"use strict";

const assert=require("node:assert/strict"),fs=require("node:fs");
const detail=fs.readFileSync("app/saude/medicamentos/detalhes/page.tsx","utf8");
const disclosure=fs.readFileSync("components/saude/ClinicalDisclosure.tsx","utf8");
const avatar=fs.readFileSync("components/saude/HealthAvatar3D.tsx","utf8");
const gate=fs.readFileSync("scripts/test-v63-release-gate.mjs","utf8");

assert(detail.includes('const hasFinancialSection =')&&detail.includes('const hasRoutineSection ='),"detail navigation derives real section availability");
assert(detail.includes('...(hasRoutineSection?')&&detail.includes('...(hasFinancialSection?')&&detail.includes('...(renovacoes.length?'),"navigation omits dead anchors");
assert(detail.includes('{id:"medicamento-rede",label:"Rede"'),"care network is discoverable in the section map");
assert(detail.includes('isSOS ? "Registrar uso SOS" : isTemporary ? "Registrar dose do período" : "Registrar dose"'),"primary dose action preserves medication semantics");
assert(detail.includes('<ClinicalDisclosure id="medicamento-financeiro"')&&detail.includes('<ClinicalDisclosure id="medicamento-rede"'),"secondary detail domains use progressive disclosure");
assert(detail.includes('{()=><>'),"large detail domains mount on demand");
assert(disclosure.includes('children: ReactNode | (() => ReactNode)')&&disclosure.includes('typeof children === "function" ? children() : children'),"shared disclosure supports lazy content while retaining deep links");
for(const marker of ["V343: lugs","phoneSideButton"])assert(avatar.includes(marker),`missing Avatar refinement ${marker}`);
assert(!avatar.includes("requestAnimationFrame(animate)"),"Avatar remains event driven");
assert(gate.includes("scripts/test-v343-medication-details-command-avatar.cjs"),"V343 belongs to release gate");
console.log("VAULT V343 — DETALHES 360 + DEEP-LINK + AVATAR: OK");
