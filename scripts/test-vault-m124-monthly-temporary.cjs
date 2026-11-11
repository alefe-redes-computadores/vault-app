#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); console.log(`✓ M124 ${++checks}: ${label}`); };
const read = file => fs.readFileSync(file, "utf8");
function load(file) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, id => { throw new Error(`dependência inesperada: ${id}`); });
  return mod.exports;
}

const course = load("lib/health-supply/temporary-course.ts");
const cerumin = { start: "2026-11-11", days: 5, times: [], firstDoseAt: "2026-11-11T17:00", intervalHours: 8, quantityPerDose: 5 };
const slots = course.temporaryCourseSlots(cerumin);
ok(slots.length === 15, "Cerumin de 8/8h por cinco dias produz 15 doses, sem aproximação");
assert.deepEqual(slots[0], { date: "2026-11-11", time: "17:00" });
assert.deepEqual(slots.at(-1), { date: "2026-11-16", time: "09:00" });
ok(course.temporaryCourseEnd(cerumin) === "2026-11-16", "fim visual acompanha a última dose que atravessa a meia-noite");
ok(course.temporaryCourseTotals(cerumin).plannedUnits === 75, "quantidade em gotas permanece unidade por dose, sem converter frasco");
const note = course.temporaryCourseNote(cerumin);
assert.deepEqual(course.parseTemporaryCourseNote(note), { start: "2026-11-11", days: 5, intervalHours: 8, firstDoseAt: "2026-11-11T17:00" });
ok(true, "nota nova restaura o curso por intervalo após reabrir a edição");
assert.throws(() => course.temporaryCourseSlots({ ...cerumin, times: ["17:00"] }));
ok(true, "horários fixos e intervalo não podem ser combinados acidentalmente");
ok(course.temporaryCourseSlots({ start: "2026-11-11", days: 5, times: ["09:00", "17:00"] }).length === 10, "cursos legados por horários fixos continuam válidos");

const presentation = load("lib/clinical-month-presentation.ts");
const doseRows = [
  { id:"1",date:"2026-11-10",scheduledTime:"10:00",confirmedAt:"2026-11-10T13:00:00Z",medication:"A",doseKind:"scheduled",status:"taken",quantity:1,reason:null,safety:null },
  { id:"2",date:"2026-11-10",scheduledTime:"10:00",confirmedAt:"2026-11-10T13:01:00Z",medication:"B",doseKind:"scheduled",status:"taken",quantity:1,reason:null,safety:null },
  { id:"3",date:"2026-11-10",scheduledTime:"10:00",confirmedAt:"2026-11-10T13:02:00Z",medication:"C",doseKind:"scheduled",status:"ignored",quantity:1,reason:"sem_estoque",safety:null },
];
const days = presentation.groupClinicalMonthDoses(doseRows);
ok(days.length === 1 && days[0].lines.length === 2 && days[0].lines[0].includes("A (1), B (1)"), "diário agrupa rotina do mesmo dia e horário em linha compacta");
ok(presentation.buildSupplyBarriers(doseRows)[0].affectedDays === 1, "barreira usa somente motivo sem estoque explicitamente registrado");
ok(presentation.sanitizeClinicalText("4 $dia(s)$ · already_knew") === "4 dia(s) · Ciente no momento do registro", "chaves internas e artefatos técnicos são traduzidos");
const records = presentation.aggregateClinicalMonthRecords([
  { user_id:"u",person_id:"p",categoria:"atividade",tipo:"caminhada",nome:"Caminhada",data:"2026-11-10",horario:"10:00",duracao_minutos:30,source:"health_connect" },
  { user_id:"u",person_id:"p",categoria:"atividade",tipo:"caminhada",nome:"Caminhada",data:"2026-11-10",horario:"11:00",duracao_minutos:59,source:"health_connect" },
  { user_id:"u",person_id:"p",categoria:"habito",tipo:"agua",nome:"Água",data:"2026-11-10",horario:"12:00",valor_numerico:250,source:"health_connect" },
  { user_id:"u",person_id:"p",categoria:"habito",tipo:"agua",nome:"Água",data:"2026-11-10",horario:"13:00",valor_numerico:500,source:"health_connect" },
]);
ok(records.rows.some(row => row.detail.includes("89 min total")) && records.rows.some(row => row.detail.includes("750 ml")), "Health Connect é agregado por dia sem repetir sessões");
ok(records.biometricSourceNote?.includes("uma única vez") !== true && records.biometricSourceNote?.includes("Health Connect"), "fonte biométrica é emitida uma vez pela seção");
const deduped = presentation.dedupeClinicalBrainInsights([
  { detectedAt:"2026-11-10T10:00:00Z",title:"Rotina de Cerumin",message:"2 de 7 doses (29%)",severity:"informativa",feedback:null },
  { detectedAt:"2026-11-10T11:00:00Z",title:"Cerumin: Uso registrado abaixo da rotina",message:"2 de 7 doses (29%); contexto completo preservado",severity:"atencao",feedback:null },
]);
ok(deduped.length === 1 && deduped[0].title.includes("Uso registrado"), "Brain elimina duplicata diária e conserva o card mais completo");

const ui = read("components/saude/TemporaryCourseFields.tsx");
ok(ui.includes("A cada X horas") && ui.includes("Primeira dose") && ui.includes("não converte"), "formulário distingue intervalo prescrito de frequência diária");
const edit = read("app/saude/medicamentos/editar/page.tsx");
ok(edit.includes("parseTemporaryCourseNote") && edit.includes("firstTime:"), "edição restaura o novo plano sem perder o modo");
const pdf = read("lib/clinical-month-pdf.ts");
ok(pdf.indexOf('heading("Alertas com evidência preservada")') < pdf.indexOf('heading("Diário de doses por dia")'), "PDF traz alertas e barreiras antes do diário detalhado");
ok(pdf.includes("report.doseDays") && pdf.includes("report.biometricSourceNote") && pdf.includes("Origem e limitações"), "PDF compacto preserva origem, limitações e fonte biométrica");
const stock = read("lib/repositories/doseLogs.ts");
ok(stock.includes('unidade.includes(\n      "frasco"') && stock.includes("return null;"), "gotas não debitam fração de frasco sem conversão confiável");
ok(read("scripts/test-v63-release-gate.mjs").includes("scripts/test-vault-m124-monthly-temporary.cjs"), "contrato M124 registrado no gate global");
console.log(`VAULT M124: ${checks} verificações de curso por período e relatório mensal aprovadas.`);
