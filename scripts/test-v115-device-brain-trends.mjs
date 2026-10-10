import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const box = { exports: {}, Date, Number, Math, Set, Map };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/health-intelligence/device-trend-insights.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, box);
const build = box.exports.buildDeviceTrendInsights;
const context = () => ({ personId: 'person-a', hoje: '2026-10-30', registrosSaude: [], medicamentos: [], doseLogs: [], renovacoes: [], tratamentos: [], consultas: [], exames: [], cirurgias: [], cids: [], documentos: [], retiradas: [] });
function record(type, date, value, unit, extra = {}) {
  return { id: `${type}-${date}-${value}`, person_id: 'person-a', tipo: type, categoria: type === 'caminhada' ? 'habito' : 'medicao', nome: type, data: date, horario: '12:00', valor_numerico: value, unidade_medida: unit, ...extra };
}
function weeks(type, oldValue, newValue, unit, extra = {}) {
  return [16, 18, 20].map((day) => record(type, `2026-10-${day}`, oldValue, unit, extra))
    .concat([24, 26, 28].map((day) => record(type, `2026-10-${day}`, newValue, unit, extra)));
}

for (const [type, before, after, unit] of [['peso', 70, 73, 'kg'], ['frequencia_cardiaca', 70, 90, 'bpm'], ['oxigenacao', 97, 93, '%'], ['caminhada', 30, 60, 'min']]) {
  const result = build({ ...context(), registrosSaude: weeks(type, before, after, unit) });
  assert.equal(result.length, 1, `${type} trend exists`);
  assert.equal(result[0].gravidadeSeguranca, 'informativa');
  assert.ok(result[0].limitacaoSeguranca.toLowerCase().includes('não avalia normalidade clínica'));
  assert.equal(result[0].coberturaDias.observados, 6);
}

let result = build({ ...context(), registrosSaude: weeks('pressao_arterial', undefined, undefined, 'mmHg', { valor_numerico: undefined, valor_medicao: '120/80 mmHg' }).map((item, index) => ({ ...item, valor_medicao: index < 3 ? '120/80 mmHg' : '140/90 mmHg' })) });
assert.equal(result.length, 1, 'blood pressure uses explicit systolic/diastolic text');
assert.ok(result[0].mensagem.includes('120/80 para 140/90'));

result = build({ ...context(), registrosSaude: [
  ...weeks('peso', 70, 73, 'kg'),
  record('peso', '2026-10-24', 73, 'kg', { id: 'same-day-device-copy', source_record_id: 'duplicate-source', source: 'health_connect' }),
  record('peso', '2026-10-25', 73, 'lb'),
  record('peso', '2026-10-26', 5000, 'kg'),
  { ...record('peso', '2026-10-27', 120, 'kg'), person_id: 'person-b' },
  record('peso', '2026-10-30', 95, 'kg'),
] });
assert.equal(result.length, 1, 'foreign, invalid-unit, invalid-range and current-day readings do not affect a closed-week comparison');
assert.equal(result[0].amostra, 6, 'duplicate same-day device samples are collapsed into daily median');

assert.equal(build({ ...context(), registrosSaude: weeks('peso', 70, 70.5, 'kg') }).length, 0, 'small fluctuations are filtered');
assert.equal(build({ ...context(), registrosSaude: [record('peso', '2026-10-24', 70, 'kg'), record('peso', '2026-10-25', 72, 'kg')] }).length, 0, 'insufficient week coverage does not create an insight');
assert.equal(build({ ...context(), personId: '', registrosSaude: weeks('peso', 70, 73, 'kg') }).length, 0, 'missing active person cannot produce insights');

const brain = fs.readFileSync('lib/health-insights.ts', 'utf8');
assert.ok(brain.includes('buildDeviceTrendInsights'), 'canonical health brain invokes device trends');
const gate = fs.readFileSync('scripts/test-v63-release-gate.mjs', 'utf8');
assert.ok(gate.includes('scripts/test-v115-device-brain-trends.mjs'), 'release gate includes this contract');
console.log('V115: tendências por aparelho, janelas completas, mediana diária, pessoa, unidades, cobertura e limites clínicos OK');
