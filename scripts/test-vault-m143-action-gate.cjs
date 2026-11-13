#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');

const legacy=read('scripts/test-v139-final-experience.cjs');
const m140=read('scripts/test-vault-m140-supply.cjs');
const gate=read('scripts/test-v63-release-gate.mjs');
const page=read('app/saude/fornecimento/page.tsx');
const summary=read('components/saude/SupplyCycleSummary.tsx');

for(const name of [
 'test-v139-final-experience.cjs',
 'test-vault-m140-supply.cjs',
 'test-vault-m142-documents.cjs',
 'test-vault-m143-action-gate.cjs'
])assert.ok(gate.includes('"scripts/'+name+'"'),name);

assert.ok(legacy.includes('unassignedSupplyDocuments:unassigned'));
assert.ok(legacy.includes("['related']"));
assert.ok(legacy.includes("['generic']"));
assert.ok(m140.includes('availableMedicationDocuments'));
assert.ok(m140.includes('Vínculo salvo neste ciclo'));
assert.ok(page.includes('selectableCycleDocuments.some(d => d.id === docId)'));
assert.ok(page.includes('showUnassignedDocuments ? [...availableCycleDocuments, ...unassignedCycleDocuments]'));
assert.ok(summary.includes('availableMedicationDocuments'));
assert.ok(!summary.includes('availableHealthDocuments'));

console.log('M143 P0 R2: CONTRATOS V139 M140 M142 OK');
