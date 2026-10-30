#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('lib/health-supply/temporary-course.ts');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { temporaryCourseSlots, temporaryCourseNote } = mod.exports;
const course = { start: '2026-12-30', days: 4, times: ['08:00', '20:00'] };
const slots = temporaryCourseSlots(course);
assert.equal(slots.length, 8);
assert.deepEqual(slots.at(-1), { date: '2027-01-02', time: '20:00' });
assert.equal(temporaryCourseNote(course), 'Tratamento temporário · 2026-12-30 · 4 dia(s)');
for (const bad of [ { ...course, start: '2026-02-30' }, { ...course, days: 0 }, { ...course, days: 31 }, { ...course, times: ['08:00','08:00'] }, { ...course, times: ['25:00'] } ]) {
  assert.throws(() => temporaryCourseSlots(bad));
}
const required = {
  'app/saude/renovacao/editar/page.tsx': ['createDocument({', 'category_id: "saude"', 'type: "receita"', 'uploadedStorageUrl', 'document_id: createdDocumentId', 'somenteReceita ? undefined : renovacao.tipo_aquisicao', 'capture="environment"'],
  'app/hoje/page.tsx': ['Programadas para depois', 'buildTodayTimelineItems'],
  'lib/today/build-timeline-items.ts': ['dose_kind === "planned"', 'isExpectedUnconfirmed'],
  'app/page.tsx': ['buildHomePendingDoseProjection', 'activePersonId'],
  'lib/home/pending-dose-projection.ts': ['dose_kind !== "planned"', 'input.personId', 'input.userId'],
  'lib/repositories/doseLogs.ts': ['async replaceTemporaryCourse(', 'getMedicamentoForPerson(', 'row.user_id === user.id', 'await enfileirarOperacao("doseLogs", "delete"', 'dose_kind: "planned"'],
  'app/saude/medicamentos/novo/page.tsx': ['TemporaryCourseFields', 'replaceTemporaryCourse({'],
  'app/saude/medicamentos/editar/page.tsx': ['TemporaryCourseFields', 'replaceTemporaryCourse({'],
  'lib/health-insights.ts': ['buildTemporaryCourseInsights'],
  'components/saude/AvatarCareWorkspace.tsx': ['MedicationContinuityAvatarSummary'],
  'components/saude/MedicationContinuityAvatarSummary.tsx': ['nextTemporaryCourse', 'medicationPortfolio?.temporary', 'dose(s) aberta(s)'],
  'components/PendingDosesModal.tsx': ['Tomei no horário programado'],
  'components/saude/QuickDoseModal.tsx': ['Registrar tomada agora'],
  'scripts/test-v63-release-gate.mjs': ['scripts/test-v229-course-prescription.cjs'],
};
for (const [file, anchors] of Object.entries(required)) {
  const text = read(file);
  for (const anchor of anchors) assert.ok(text.includes(anchor), `${file}: missing ${anchor}`);
  const diagnostics = ts.transpileModule(text, { fileName: file, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).diagnostics || [];
  assert.equal(diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, `Syntax: ${file}`);
}
const avatar = read('components/saude/HealthAvatar3D.tsx');
assert.ok(!avatar.includes('new THREE.BoxGeometry(.22,.007,.012)'), 'V232: trilhos decorativos verticais antigos foram removidos');
assert.ok(avatar.includes('new THREE.ShapeGeometry(outline,4)'), 'armação plana V232 preservada');
assert.ok(!avatar.includes('new THREE.BoxGeometry(.007,2.'));
console.log('VAULT V229: finite course boundaries, prescription attachment, planned dose integration, explicit confirmation, Brain and Avatar contract OK');
