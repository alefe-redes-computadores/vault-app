#!/usr/bin/env node
'use strict';
// V28 clinical continuity is non-negotiable: visual UX changes must never erase A4 or M5 facts.
const fs=require('node:fs');const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
function ok(x,msg){assert.ok(x,`A7_WORK_V28: ${msg}`);checks++}
const medical=read('lib/m3/medical-dossier-p3.ts');
const screen=read('app/saude/careflow/modo-medico/page.tsx');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(medical.includes("{id:'rehabilitation'")&&medical.includes("section:'rehabilitation'"),'M5 volta à lista e ao PDF');
ok(medical.includes("source:'a4_treatment_phase'")&&medical.includes('input.treatmentFacts'),'fases históricas A4 sem apagar cadastro atual');
ok(medical.includes('episodeRehabFacts.has(r.sourceId)'),'M5 vinculado por ID no atendimento');
ok(medical.includes("reading.tipo!=='pressao_arterial'")&&medical.includes('registro_saude_pressao'),'V28 mantém pressão manual legada no Modo Médico');
ok(medical.includes("source:'surgery_journey_event_a7'")&&medical.includes('input.surgeryEvents'),'A7 entra no PDF por fonte factual');
ok(medical.includes("source:'surgery_team_a7'")&&medical.includes('input.surgeryTeam'),'equipe cirúrgica própria no dossiê');
ok(screen.includes('const a4Phases=useLiveQuery')&&screen.includes('const rehab=useLiveQuery')&&screen.includes('const surgical=useLiveQuery'),'fontes A4 M5 A7 carregadas por pessoa');
ok(screen.includes('&&a4Phases?.scope===scopeKey')&&screen.includes('&&surgical?.scope===scopeKey'),'PDF espera fontes completas');
ok(screen.includes('MEDICAL_SECTIONS_P3.map(section=>section.id)'),'V28 default de todas seções preservado');
ok(screen.includes('treatmentFacts:a4Facts')&&screen.includes('surgeryEvents:surgical?'),'prévia inclui fontes A4 A7');
ok(screen.includes('rehab:rehab?.scope===scopeKey?rehab:undefined'),'prévia inclui M5 condicionado ao escopo');
ok(gate.includes('test-vault-health-v28-macro.cjs')||fs.existsSync('scripts/test-vault-health-v28-macro.cjs'),'V28 nunca é omitido nos testes dirigidos');
ok(gate.includes('test-vault-a7-work-v28-continuity.cjs'),'continuidade é gate obrigatório');
for(const word of ['a1_treatment_phases','rehab_programs_m5','surgery_journey_events_a7'])ok(screen.includes(word),'origem preservada: '+word);
console.log(`A7_WORK_V28_CONTINUITY: OK (${checks} contratos)`);
