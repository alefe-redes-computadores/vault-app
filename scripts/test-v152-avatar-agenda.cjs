const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module);
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m.require = name => name.startsWith('@/') ? load(name.slice(2) + '.ts')
    : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name) + '.ts') : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return m.exports;
}
const { avatarSurgeryAgenda: agenda, surgeryTime } = load('lib/health-profile/avatar-surgeries.ts');
const { avatarBodyContext: body, moodContext } = load('lib/health-profile/avatar-body.ts');
const today = '2026-10-14';
const base = { user_id: 'u', person_id: 'p', procedimento: 'Punho', status: 'agendada' };
const rows = [
  { ...base, id: 'late', data: '2026-10-13' },
  { ...base, id: 'older', data: '2026-10-01' },
  { ...base, id: 'next-late', data: today, horario: '16:30' },
  { ...base, id: 'next-early', data: today, horario: '09:00' },
  { ...base, id: 'next-week', data: '2026-10-21' },
  { ...base, id: 'done-now', status: 'realizada', data: today },
  { ...base, id: 'done-boundary', status: 'realizada', data: '2026-07-17' },
  { ...base, id: 'done-old', status: 'realizada', data: '2026-07-16' },
  { ...base, id: 'done-future', status: 'realizada', data: '2026-10-15' },
  { ...base, id: 'cancelled', status: 'cancelada', data: today },
  { ...base, id: 'invalid', data: '2026-02-30' },
  { ...base, id: 'foreign-person', person_id: 'q', data: today },
  { ...base, id: 'foreign-user', user_id: 'v', data: today },
];
const before = JSON.stringify(rows), result = agenda(rows, 'p', 'u', today);
assert.deepEqual(result.upcoming.map(r => r.id), ['next-early', 'next-late', 'next-week']);
assert.deepEqual(result.unconfirmed.map(r => r.id), ['late', 'older']);
assert.deepEqual(result.completed.map(r => r.id), ['done-now', 'done-boundary']);
assert.equal(result.total, 7);
assert.equal(JSON.stringify(rows), before, 'source order and status must stay unchanged');
for (const args of [['', 'u', today], ['p', '', today], ['p', 'u', 'invalid']]) {
  assert.deepEqual(agenda(rows, ...args), { upcoming: [], unconfirmed: [], completed: [], total: 0 });
}
assert.equal(surgeryTime('09:05'), '09:05');
for (const value of ['29:00', '9:00', '09:60', '22:10:00', undefined, '']) assert.equal(surgeryTime(value), '');
assert.equal(body([], rows, [], 'p', 'u', today).surgery.id, 'next-early');
const completedOnly = body([], rows.filter(r => r.status === 'realizada'), [], 'p', 'u', today);
assert.equal(completedOnly.surgery, null);
assert.equal(completedOnly.surgeryAgenda.completed.length, 2);
assert.equal(completedOnly.supports.length, 0, 'realized status cannot create a brace');
assert.equal(body([], rows.filter(r => r.data < today), [], 'p', 'u', today).surgery.id, 'late');
assert.deepEqual(agenda([...rows].reverse(), 'p', 'u', today), result, 'stable ordering independent of input');

const mood = { user_id: 'u', person_id: 'p', categoria: 'humor', tipo: 'humor', horario: '12:00' };
const moods = ['2026-10-12', '2026-10-13', today].map((data, i) => ({ ...mood, id: 'm' + i, data, contexto: moodContext('bem') }));
let context = body(moods, [], [], 'p', 'u', today);
assert.equal(context.moodEvidence.reason, 'positive');
assert.deepEqual(context.moodEvidence, { from: '2026-10-08', to: today, days: 3, positive: 3, negative: 0, neutral: 0, reason: 'positive' });
context = body(moods.slice(0, 2), [], [], 'p', 'u', today);
assert.equal(context.expression, 'neutral'); assert.equal(context.moodEvidence.reason, 'insufficient');
context = body(moods.map(r => ({ ...r, contexto: moodContext('neutro') })), [], [], 'p', 'u', today);
assert.equal(context.moodEvidence.reason, 'mixed'); assert.equal(context.moodEvidence.neutral, 3);
context = body(moods.map((r, i) => ({ ...r, contexto: moodContext(i < 2 ? 'triste' : 'bem') })), [], [], 'p', 'u', today);
assert.equal(context.expression, 'reflective'); assert.equal(context.moodEvidence.reason, 'negative');
context = body([...moods, { ...moods[2], id: 'latest', horario: '18:00', contexto: moodContext('triste') }], [], [], 'p', 'u', today);
assert.equal(context.moodEvidence.days, 3); assert.equal(context.moodEvidence.negative, 1);
assert.equal(context.moods[0].id, 'latest');
assert.equal(context.expression, 'happy', 'two thirds policy preserved');
assert.equal(body(moods, [], [], 'q', 'u', today).moodEvidence.days, 0);
assert.equal(body([...moods, { ...moods[0], data: '2026-10-07' }, { ...moods[0], data: '2026-10-15' }], [], [], 'p', 'u', today).moodEvidence.days, 3);
console.log('V152: scoped surgical agenda, status preserved, 90-day boundary, stable time ordering, no inferred support, declared mood explanation and unchanged daily policy passed.');
