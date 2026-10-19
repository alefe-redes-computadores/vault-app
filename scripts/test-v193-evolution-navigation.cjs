const assert = require('node:assert/strict');
const fs = require('node:fs');
const evolution = fs.readFileSync('app/saude/registros/evolucao/page.tsx','utf8');
const report = fs.readFileSync('app/saude/registros/relatorio/page.tsx','utf8');
const avatar = fs.readFileSync('components/saude/HealthAvatar3D.tsx','utf8');
for (const page of [evolution, report]) {
  assert(page.includes('useReturnContext("/saude/registros")'));
  assert(page.includes('router.replace(backTarget)'));
  assert(!page.includes('router.replace("/saude/registros")'));
}
assert(evolution.includes('router.push(preserveReturn('));
assert(evolution.includes('ClinicalListSummary'));
assert(evolution.includes('min-[380px]:grid-cols-3'));
assert(evolution.includes('aria-pressed={period === value}'));
assert(report.includes('header-safe-top'));
assert(report.includes('window.print()'));
assert(avatar.includes('V193: refina volumes existentes'));
assert(avatar.includes('const noseBridge=mesh(taperedBox('));
assert(avatar.includes('const brow=mesh(softBox('));
console.log('V193 evolution, contextual report return, compact layout and avatar geometry: OK');
