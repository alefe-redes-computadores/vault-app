#!/usr/bin/env node
"use strict";
// Validates the specific V94.2 historical source mismatch before the long gate.
const fs=require("node:fs"), assert=require("node:assert/strict");
const read=p=>fs.readFileSync(p,"utf8");
const home=read("app/page.tsx");
const rail=read("components/home/HomeAttentionRail.tsx");
const test=read("scripts/test-v94-2-home-final-experience-contract.mjs");
const gate=read("scripts/test-v63-release-gate.mjs");
let n=0;
const ok=(value,label)=>{assert(value,`P15 R8 R2: ${label}`);console.log(`✓ ${++n}: ${label}`)};
ok(home.includes("healthIntelligence.maturity.totalRecords"),"Maturidade continua exibindo registros analisados");
ok(home.includes("sourcesWithData"),"Cobertura de fontes continua visível");
ok(home.includes("brainV5Pulse.journeys.filter(item => item.requires_attention)"),"Decisões em atenção derivam das jornadas reais");
ok(home.includes("brainV5Pulse.counters.new"),"Contador de novidades vem do Brain V5");
ok(!home.includes("brainV5Pulse.counters.attention"),"Home não depende de um contador inexistente");
ok(!test.includes('home.includes("brainV5Pulse.counters.attention")'),"Contrato V94.2 não procura propriedade inexistente");
ok(test.includes('home.includes("brainV5Pulse.journeys.filter(item => item.requires_attention)")')&&test.includes('home.includes("brainV5Pulse.counters.new")'),"Contrato V94.2 verifica decisões e novidades reais");
ok(home.includes('<HomeAttentionRail alerts={unifiedAlerts}')&&rail.includes('alerts.slice(0, 1)')&&!rail.includes('snap-x snap-mandatory'),"Rail extraído preserva a Home");
ok(gate.includes('scripts/test-p15-r8-r2-v94-legacy-safety.cjs') && gate.includes('scripts/test-p15-r8-home-rail-quality-a11y.cjs'),"Teste preventivo e contrato R8 presentes no gate");
console.log(`P15 R8 R2 — V94.2 recuperado: ${n} verificações aprovadas`);
