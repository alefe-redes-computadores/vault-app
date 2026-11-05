#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function load(file, stubs = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = new Module(file, module);
  mod.require = id => { if (Object.hasOwn(stubs, id)) return stubs[id]; throw Error(`Unexpected import ${id}`); };
  mod._compile(code, file); return mod.exports;
}
(async () => {
  const review = load('lib/health-intelligence/medication-presentation-review.ts').medicationStockUnitReview;
  for (const form of ['cápsula', 'capsula', 'CÁPSULAS']) {
    assert.match(review({ estoque_quantidade: 2, estoque_unidade_medida: 'comprimidos', forma_farmaceutica: form }), /divergem/);
    assert.equal(review({ estoque_quantidade: 2, estoque_unidade_medida: 'cápsulas', forma_farmaceutica: form }), null);
  }
  assert.equal(review({ estoque_quantidade: 2, estoque_unidade_medida: 'ml', forma_farmaceutica: 'gotas' }), null);
  const pattern = load('lib/health-intelligence/hydration-reference.ts').hydrationRecordedPattern;
  const record = (data, valor_numerico = 700) => ({ tipo: 'agua', data, valor_numerico, unidade_medida: 'ml' });
  const today = '2026-11-05';
  const twoAndToday = [record('2026-11-03'), record('2026-11-04'), record(today, 1)];
  assert.equal(pattern(twoAndToday, today, 2100).level, 'insufficient');
  assert.deepEqual(pattern([...twoAndToday, record('2026-11-02')], today, 2100), {dayCount: 3, averageMl: 700, ratio: 1/3, level: 'very_low'});
  assert.equal(pattern([record('2026-10-29'), record('2026-10-28')], today, 2100).dayCount, 1);
  const state = { rows: [], queue: [], failAt: 0, dispatches: 0 };
  const db = {
    persons: { get: async () => ({ user_id: 'u' }) },
    health_reminders: { add: async row => { state.rows.push(row); } },
    syncQueue: {},
    transaction: async (_mode, _tables, operation) => {
      const rows = [...state.rows], queue = [...state.queue];
      try { await operation(); } catch (error) { state.rows = rows; state.queue = queue; throw error; }
    },
  };
  const repo = load('lib/repositories/healthReminders.ts', {
    '@/lib/supabase/local-auth': { getLocalFirstAuthUser: async () => ({ data: { user: { id: 'u' } } }) },
    '@/lib/db': { db },
    '@/lib/health-reminders/domain': { normalizeHealthReminderInput: input => input },
    '@/lib/sync/enfileirarOperacao': {
      enfileirarOperacao: async (_table, _op, row) => { if (state.failAt && state.queue.length + 1 === state.failAt) throw Error('simulated failure'); state.queue.push(row.id); },
      solicitarProcessamentoSync: () => { state.dispatches++; },
    },
    '@/lib/supabase/client': { supabase: {} },
  }).healthRemindersRepository;
  const inputs = ['09:00','12:00','15:00'].map(time => ({ person_id:'p', time }));
  state.failAt = 2;
  await assert.rejects(repo.createMany(inputs), /simulated failure/);
  assert.equal(state.rows.length, 0); assert.equal(state.queue.length, 0); assert.equal(state.dispatches, 0);
  state.failAt = 0;
  const ids = await repo.createMany(inputs);
  assert.equal(new Set(ids).size, 3); assert.equal(state.rows.length, 3); assert.equal(state.queue.length, 3); assert.equal(state.dispatches, 1);
  await assert.rejects(repo.createMany([{person_id:'p'}, {person_id:'other'}]), /mesma pessoa/);
  console.log('M72: unidades, hidratação e lote de lembretes: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
