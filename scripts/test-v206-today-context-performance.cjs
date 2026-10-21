const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = (file) => fs.readFileSync(file, 'utf8');

const today = read('app/hoje/page.tsx');
const dbSource = read('lib/db/index.ts');

assert(dbSource.includes('this.version(44).stores({'), 'V44 schema is missing');
for (const table of ['tratamentos', 'renovacoes', 'medicos', 'farmacias', 'hospitais']) {
  assert(new RegExp(`${table}:[\\s\\S]{0,260}\\[user_id\\+person_id\\]`).test(dbSource), `${table} needs an owner index`);
}
for (const table of ['consultas', 'cirurgias', 'exames', 'registros_saude', 'doseLogs']) {
  assert(new RegExp(`${table}:[\\s\\S]{0,300}\\[user_id\\+person_id\\+data\\]`).test(dbSource), `${table} needs an owner/day index`);
}

assert(today.includes('const activeTodayData = useLiveQuery(async () => {'));
assert(today.includes('activeTodayData?.userId === user.id'));
assert(today.includes('activeTodayData.personId === activePersonId'));
assert(today.includes('activeTodayData.date === dataSelecionada'));
for (const table of ['tratamentos', 'renovacoes', 'medicos', 'farmacias', 'hospitais']) {
  assert(today.includes(`db.${table}.where("[user_id+person_id]").equals(owner)`), `${table} must use the owner index`);
}
for (const table of ['consultas', 'cirurgias', 'exames']) {
  assert(today.includes(`db.${table}.where("[user_id+person_id+data]").equals(day)`), `${table} must use the day index`);
}
assert(today.includes('db.registros_saude.where("[user_id+person_id+data]").equals(day)'));
assert(!today.includes('db.medicos.toArray()'));
assert(!today.includes('db.farmacias.toArray()'));
assert(!today.includes('db.hospitais.toArray()'));
assert(!today.includes('db.consultas.toArray()'));
assert(!today.includes('db.cirurgias.toArray()'));
assert(!today.includes('db.exames.toArray()'));
assert(today.includes('rows: await db.doseLogs'));
assert(today.includes('doseHistoryData?.userId === user.id'));
assert(today.includes('doseHistoryData.personId === activePersonId'));

for (const file of ['app/hoje/page.tsx', 'lib/db/index.ts']) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `syntax error: ${file}`);
}

// Exercise the additive migration with real IndexedDB semantics. Besides
// preserving legacy rows, this proves that account/person/day is isolated.
(async () => {
  require('fake-indexeddb/auto');
  if (typeof globalThis.CustomEvent === 'undefined') globalThis.CustomEvent = class CustomEvent extends Event {};
  const Dexie = require('dexie');
  const match = dbSource.match(/this\.version\(44\)\.stores\((\{[\s\S]*?\})\);/);
  assert(match, 'V44 schema cannot be parsed');
  const schema = Function(`return (${match[1]})`)();
  const previous = Object.fromEntries(Object.entries(schema).map(([table, value]) => [
    table,
    value.replace(', [user_id+person_id]', '').replace(', [user_id+person_id+data]', ''),
  ]));
  const name = `vault-v206-test-${process.pid}`;
  const before = new Dexie(name);
  before.version(43).stores(previous);
  await before.open();
  for (const table of Object.keys(schema)) {
    await before.table(table).bulkPut([
      { id: `${table}-owned-day`, user_id: 'u', person_id: 'p', data: '2026-10-21' },
      { id: `${table}-owned-other-day`, user_id: 'u', person_id: 'p', data: '2026-10-22' },
      { id: `${table}-other-person`, user_id: 'u', person_id: 'q', data: '2026-10-21' },
      { id: `${table}-other-user`, user_id: 'v', person_id: 'p', data: '2026-10-21' },
      { id: `${table}-legacy`, user_id: 'u', data: '2026-10-21' },
    ]);
  }
  before.close();

  const after = new Dexie(name);
  after.version(44).stores(schema);
  await after.open();
  try {
    for (const table of Object.keys(schema)) {
      const store = after.table(table);
      assert.equal(await store.count(), 5, `upgrade lost ${table} rows`);
      assert.equal(await store.where('[user_id+person_id]').equals(['u', 'p']).count(), 2, `owner isolation failed for ${table}`);
      if (['consultas', 'cirurgias', 'exames', 'registros_saude', 'doseLogs'].includes(table)) {
        const rows = await store.where('[user_id+person_id+data]').equals(['u', 'p', '2026-10-21']).toArray();
        assert.deepEqual(rows.map((row) => row.id), [`${table}-owned-day`], `day isolation failed for ${table}`);
      }
      assert.equal(await store.where('user_id').equals('u').count(), 4, `old user index lost for ${table}`);
    }
  } finally {
    after.close();
    await Dexie.delete(name);
  }
  console.log('V206 OK: Today uses owner/day indexes, rejects stale context and V43→V44 preserves every row');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
