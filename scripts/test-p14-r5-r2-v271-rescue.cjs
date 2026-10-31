#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = file => fs.readFileSync(file,"utf8");
const page = read("app/saude/medicamentos/page.tsx");
const route = read("components/saude/MedicationListRouteLabel.tsx");
const authority = read("lib/health-supply/route-authority.ts");
const gate = read("scripts/test-v63-release-gate.mjs");
assert(page.includes('supplyRoute.labels.join(" + ")'),"V271: expressão canônica preservada na página");
assert(page.includes('<MedicationListRouteLabel route={supplyRoute} label={supplyRoute.labels.join(" + ")} />'),"V271: valor canônico é repassado ao componente real");
assert(route.includes('export function MedicationListRouteLabel({route,label}') && route.includes('{label}'),"componente apresenta o label recebido, sem segunda origem");
assert(route.includes('route.mode === "none"') && route.includes('Origem registrada'),"sem afirmar fornecimento quando rota desconhecida");
assert(authority.includes('indexMedicationSupplyRoutes'),"índice canônico compartilhado continua sendo fonte");
assert(page.includes('indexScheduledWithdrawalsByOwner(retiradas)'),"retirada escopada por proprietário");
assert(page.includes('scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "")'),"ação de retirada não usa ID isolado");
assert(page.includes('hasConfirmedControlledRegime(regulatoryProfile)'),"regime controlado continua confirmado");
assert(gate.includes('scripts/test-p14-r5-r2-v271-rescue.cjs'),"resgate V271 entra no gate integral");
console.log("VAULT P14 R5 R2: V271 + origem canônica + escopo e classificação — OK");
