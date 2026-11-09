/* VAULT M106: visual-only regression contracts, no database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

const metrics = read('components/home/HomeQuickMetrics.tsx');
const hero = read('components/home/HomeDailyHero.tsx');
const agenda = read('components/hoje/TodayAgendaOverview.tsx');
const meds = read('app/saude/medicamentos/page.tsx');
const strip = read('components/saude/MedicationOperationalStrip.tsx');
const more = read('app/mais/page.tsx');
const home = read('app/page.tsx');
const today = read('app/hoje/page.tsx');

for (const key of ['agenda', 'pendentes', 'medicamentos', 'extra']) {
  assert.ok(metrics.includes(`key: "${key}"`), `Indicador ausente: ${key}`);
}
assert.ok(metrics.includes('grid grid-cols-4'), 'Indicadores precisam ocupar quatro colunas compactas');
assert.ok(hero.includes('scheduled > 0') && hero.includes('safeCompleted'), 'Contagem segura da rotina alterada');
assert.ok(agenda.includes('<details') && agenda.includes('group-open:rotate-180'), 'Agenda horária não recolhível');
assert.ok(agenda.indexOf('overdueWithdrawals > 0') < agenda.indexOf('<details'), 'Retiradas urgentes ocultadas');
assert.ok(agenda.indexOf('overview.dueDoseCount > 0') < agenda.indexOf('<details'), 'Doses urgentes ocultadas');
assert.ok(agenda.includes('overview.nextUpcoming'), 'Próximo horário não está visível');
for (const token of ['MedicationOperationalStrip', 'QuickDoseModal', 'MedicationRestockAction', 'statsProgresso.completados', 'statsProgresso.total', 'M105:']) {
  assert.ok(meds.includes(token), `Contrato de Medicamentos perdido: ${token}`);
}
for (const token of ['stockTone', 'doseOutcome', 'stockDetail']) {
  assert.ok(strip.includes(token), `Contrato da faixa de estoque/dose perdido: ${token}`);
}
for (const token of ['PersonSelector', 'OperationalReadinessM103', 'VaultUpdateCenter', 'Preferências, lembretes e atualizações']) {
  assert.ok(more.includes(token), `Contrato da página Mais perdido: ${token}`);
}
assert.ok(more.indexOf('Nuvem</h2>') > more.indexOf('</details>'), 'Sincronização não pode ser recolhida');
assert.ok(home.includes('HomeQuickMetrics') && today.includes('TodayAgendaOverview'), 'Integração de Home/Hoje alterada');
console.log('M106 PRIMEIRA DOBRA: contratos visuais e autoridades preservados');
