const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = (file) => fs.readFileSync(file, 'utf8');

const context = read('lib/health-intelligence/context.ts');
const dbSource = read('lib/db/index.ts');
const avatar = read('components/saude/HealthAvatar3D.tsx');

assert(context.includes('throw new Error("Conta do contexto clínico não identificada.")'));
assert(context.includes('const owner = [userId, safePersonId] as [string, string]'));
assert(!context.includes('.where("person_id")'), 'Brain context must not query by person alone');
for (const table of [
  'medicamentos', 'doseLogs', 'renovacoes', 'tratamentos', 'registros_saude',
  'consultas', 'exames', 'cirurgias', 'cids', 'documents', 'retiradas',
  'fornecimentos', 'fornecimento_ciclos', 'fornecimento_itens', 'fornecimento_documentos',
]) {
  assert(new RegExp(`db\\.${table}[\\s\\S]{0,90}\\.where\\("\\[user_id\\+person_id\\]"\\)`).test(context), `${table} must use the owner index`);
}

assert(dbSource.includes('this.version(45).stores({'), 'V45 schema is missing');
for (const table of ['cids', 'retiradas', 'fornecimentos', 'fornecimento_ciclos', 'fornecimento_itens', 'fornecimento_documentos']) {
  assert(new RegExp(`${table}:[\\s\\S]{0,260}\\[user_id\\+person_id\\]`).test(dbSource), `${table} needs the owner index`);
}

for (const marker of [
  'V207: trapezius planes',
  'const trapezius=mesh(taperedBox(',
  'const stance=sign*.008',
  'shoe.rotation.x=-.035;shoe.rotation.y=-side*.035',
]) assert(avatar.includes(marker), `Avatar posture marker missing: ${marker}`);
assert(!avatar.includes('requestAnimationFrame(animate)'), 'Avatar must remain demand-rendered');

for (const file of ['lib/health-intelligence/context.ts', 'lib/db/index.ts', 'components/saude/HealthAvatar3D.tsx']) {
  const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0, `syntax error: ${file}`);
}

(async () => {
  require('fake-indexeddb/auto');
  if (typeof globalThis.CustomEvent === 'undefined') globalThis.CustomEvent = class CustomEvent extends Event {};
  const Dexie = require('dexie');
  const match = dbSource.match(/this\.version\(45\)\.stores\((\{[\s\S]*?\})\);/);
  assert(match, 'V45 schema cannot be parsed');
  const schema = Function(`return (${match[1]})`)();
  const previous = Object.fromEntries(Object.entries(schema).map(([table, value]) => [table, value.replace(', [user_id+person_id]', '')]));
  const name = `vault-v207-test-${process.pid}`;
  const before = new Dexie(name);
  before.version(44).stores(previous);
  await before.open();
  for (const table of Object.keys(schema)) {
    await before.table(table).bulkPut([
      { id: `${table}-owned`, user_id: 'u', person_id: 'p' },
      { id: `${table}-other-person`, user_id: 'u', person_id: 'q' },
      { id: `${table}-other-user`, user_id: 'v', person_id: 'p' },
      { id: `${table}-legacy`, user_id: 'u' },
    ]);
  }
  before.close();

  const after = new Dexie(name);
  after.version(45).stores(schema);
  await after.open();
  try {
    for (const table of Object.keys(schema)) {
      const store = after.table(table);
      assert.equal(await store.count(), 4, `upgrade lost ${table} rows`);
      assert.deepEqual(
        (await store.where('[user_id+person_id]').equals(['u', 'p']).toArray()).map((row) => row.id),
        [`${table}-owned`],
        `owner isolation failed for ${table}`,
      );
      assert.equal(await store.where('person_id').equals('p').count(), 2, `old person index lost for ${table}`);
    }
  } finally {
    after.close();
    await Dexie.delete(name);
  }
  console.log('V207 OK: Brain context is account/person indexed, V44→V45 preserves data and Avatar posture stays demand-rendered');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
