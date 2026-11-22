#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (path) => fs.readFileSync(path,"utf8");
const home=read("app/page.tsx");
const journey=read("components/saude/MedicationJourneySummary.tsx");
const symptoms=read("app/saude/careflow/sintomas/page.tsx");
const time=read("components/saude/HealthTimePicker.tsx");
const v196=read("scripts/test-v196-progressive-shell-avatar.cjs");
const v34y=read("scripts/test-vault-v34y-integrity.cjs");
const v34z=read("scripts/test-vault-v34z-final-closure.cjs");
const marker=home.indexOf("\n              TRATAMENTOS\n");
assert(marker>=0,"Tratamentos continuam na Home");
const section=home.slice(marker,marker+1400);
assert.match(section,/<motion\.section[\s\S]{0,1000}?className="space-y-3"/,"Tratamentos usam altura real, sem bloco artificial");
assert.doesNotMatch(section,/className="vault-deferred(?:-lg)? space-y-3"/,"A reserva antiga não pode voltar a Tratamentos");
assert.match(journey,/remaining\.length>0\s*\?\s*<details/,"Mesmo vazia, a jornada mantém outras etapas acessíveis");
assert.doesNotMatch(journey,/remaining\.length>0\s*&&\s*recorded\.length>0/,"Jornada vazia não pode ocultar destinos");
for(const dest of ["/saude/medicamentos/historico", "/saude/renovacao", "/saude/retiradas"])
  assert(journey.includes(dest),`Rota clínica perdida: ${dest}`);
assert(symptoms.indexOf("showSuccess('Sintoma salvo neste aparelho.')")>symptoms.indexOf("const recordId=await createRegistro("),"Toast ocorre apenas após criação");
assert(time.includes("setDraft(next);onChange(next)"),"Digitação da hora atualiza o rascunho canônico");
assert(v196.includes("assert(!home.includes('className=\"vault-deferred-lg space-y-3\"'))"),"V196 mantém a proibição da geometria antiga");
assert(v34y.includes("V34Y_CONTRATOS_BLOQUEADOS")&&v34y.includes("process.exitCode=1"),"V34Y deve reprovar quando há falhas");
assert(v34z.includes("V34Z_CONTRATOS_BLOQUEADOS")&&v34z.includes("process.exitCode=1"),"V34Z deve coletar as 11 falhas antes de retornar não-zero");
console.log("V34ZF_BRIDGE_OK | tratamento real, M12, vínculos, horário e gate bloqueante");
