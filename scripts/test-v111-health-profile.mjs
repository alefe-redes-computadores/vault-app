import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load=(file)=>{const box={exports:{},Date,Number,Error};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);return box.exports;};
const m=load('lib/health-profile/metrics.ts');
assert.equal(m.bmi(80,175),26.1);assert.equal(m.bmi(undefined,175),null);assert.equal(m.bmi(80,null),null);
assert.equal(m.ageOn('2000-10-10','2026-10-09'),25);assert.equal(m.ageOn('2000-10-10','2026-10-10'),26);
assert.equal(m.validDate('2026-02-30'),false);assert.equal(m.validDate('2024-02-29'),true);
assert.equal(m.decimal('72,5'),72.5);
assert.equal(m.sleepDuration('2026-10-08T22:00:00-03:00','2026-10-09T06:00:00-03:00'),480);
assert.throws(()=>m.sleepDuration('2026-10-09T06:00:00-03:00','2026-10-08T22:00:00-03:00'));
m.validateMetric('pressao_arterial',120,80);assert.throws(()=>m.validateMetric('pressao_arterial',80,120));assert.throws(()=>m.validateMetric('oxigenacao',101));assert.throws(()=>m.validateMetric('peso',NaN));
for(const table of ['health_profiles','health_devices']){assert.ok(fs.readFileSync('lib/sync/pull.ts','utf8').includes(`remoteTable:"${table}"`));assert.ok(fs.readFileSync('hooks/useSyncQueue.ts','utf8').includes(`case "${table}"`));assert.ok(fs.readFileSync('lib/export.ts','utf8').includes(table));}
assert.ok(fs.readFileSync('components/saude/HydrationPanel.tsx','utf8').includes('useRegistrosSaude'));
console.log('V111 perfil e saúde: IMC, idade, datas, sono entre dias, unidades, pressão e sincronização OK');
