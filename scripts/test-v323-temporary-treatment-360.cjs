#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function load(rel){const file=path.join(root,rel),m=new Module(file,module);m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {temporaryCourseSlots,temporaryCourseEnd,temporaryCourseTotals}=load('lib/health-supply/temporary-course.ts');
const course={start:'2026-10-29',days:14,times:['08:00','20:00'],quantityPerDose:1.5};
assert.equal(temporaryCourseSlots(course).length,28);
assert.equal(temporaryCourseEnd(course),'2026-11-11');
assert.deepEqual(temporaryCourseTotals(course),{plannedDoses:28,plannedUnits:42});
assert.throws(()=>temporaryCourseSlots({...course,quantityPerDose:0}),/quantidade válida/);
assert.throws(()=>temporaryCourseSlots({...course,times:['08:00','08:00']}),/horários válidos/);
const types=read('lib/types.ts'),repo=read('lib/repositories/doseLogs.ts'),fields=read('components/saude/TemporaryCourseFields.tsx');
const create=read('app/saude/medicamentos/novo/page.tsx'),edit=read('app/saude/medicamentos/editar/page.tsx');
const today=read('app/hoje/page.tsx'),todayProjection=read('lib/today/build-timeline-items.ts'),list=read('app/saude/medicamentos/page.tsx'),detail=read('app/saude/medicamentos/detalhes/page.tsx');
assert(types.includes('"temporario"'));
assert(repo.includes('resolveDoseQuantity(medication, course?.quantityPerDose)'));
assert(repo.includes('settledBySlot')&&repo.includes('person_id: safePersonId')&&repo.includes('user_id: user.id'));
assert(fields.includes('Quantidade a cada dose')&&fields.includes('Plano calculado')&&fields.includes('estoque muda apenas ao confirmar'));
for(const page of [create,edit]){assert(page.includes('setTipoUso("temporario")'));assert(page.includes('tipoUso === "temporario" ? readTemporaryCourseDraft'));}
assert(today.includes('buildTodayTimelineItems')&&todayProjection.includes('log.dose_kind === "planned"'));
assert(list.includes('POR PERÍODO'));
assert(detail.includes('Uso Temporário / Por período')&&detail.includes('isTemporary'));
console.log('V323: tratamento por período explícito, cálculo de doses/unidades, agenda única, estoque na confirmação, escopo e compatibilidade OK');
