const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');
const med = read('app/saude/medicamentos/page.tsx');
const bar = read('components/saude/MedicationFilterBar.tsx');
const care = read('lib/health-intelligence/medication-care-decision.ts');
const hero = read('components/saude/MedicationPortfolioOverview.tsx');
const avatar = read('components/saude/HealthAvatar3D.tsx');
let checks = 0;
const ok = (label, valid) => { assert.ok(valid, label); checks++; console.log('✓', label); };
ok('Filtros extraídos da página', med.includes('<MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>'));
ok('Filtro não cria nova autoridade nem muda o handler', med.includes('selectMedicationFilter') && !bar.includes('localStorage') && !bar.includes('fetch('));
for (const key of ['"todos"', '"atencao"','"sos"','"continuos"','"temporarios"','"controlados"','"encerrados"']) {
  ok('Filtro preservado '+key, bar.includes(key));
}
ok('Filtro adicional não ocupa linha cheia sempre',bar.includes('expanded &&') && bar.includes('grid grid-cols-2'));
ok('ARIA revela estado e seleção',bar.includes('aria-expanded={expanded}') && bar.includes('aria-controls=') && bar.includes('aria-pressed={value === key}'));
ok('Escape fecha disclosure',bar.includes('event.key === "Escape"'));
ok('Respeita redução de movimento',bar.includes('motion-reduce:transform-none'));
ok('Brain prepare não é promovido ao card NOW', med.includes('const brainSuggestion = brainCareItem && brainCareItem.lane === "now"') && !med.includes('brainCareItem.lane === "now" || brainCareItem.lane === "prepare"'));
ok('Prioridade real do Brain preservada antes do fallback SOS',med.includes('const careAction = brainAction ?? (isSOS && !sosHasOperationalException ? null : (careDecision.stage !== "stable"'));
ok('Aviso SOS só ganha destaque em exceções operacionais',med.includes('isSOS && !sosHasOperationalException ? null') && med.includes('careDecision.stage === "withdrawal_overdue"'));
ok('Quick Dose SOS continua acessível',med.includes('setQuickDoseMedId(med.id!)'));
ok('Faixa regulatória principal preservada',med.includes('regulatorySurface.rail') && med.includes('aria-label={`Ver classificação da receita:'));
ok('SUS + comprado não afirma origem atual',med.includes('Origens históricas · conferir') && med.includes('supplyRoute?.mode === "private" || supplyRoute?.mode === "public"'));
ok('Receita não vira aquisição',care.includes('isPrescriptionOnly(event)') && care.includes('isFutureAcquisition(event, today)'));
ok('Planejamento não assume criticidade clínica',care.includes('!planning && !stable && urgency === "alta"'));
ok('SOS excluído do denominador de doses',med.includes('if (item.isSOS || item.isSuspenso) continue;'));
ok('Resumo esclarece escopo do Brain',hero.includes('Na visão do Brain:') && hero.includes('Doses SOS não entram nessa meta programada'));
ok('Avatar preserva materiais oculares dos contratos R6/V273',avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })') && avatar.includes('opacity: .42, depthWrite: false') );
ok('Avatar mantém baixo custo de GPU',avatar.includes('powerPreference: "low-power"') && avatar.includes('prefers-reduced-motion'));

// Distinguish the resolved NOW action from its candidate object; no false visual urgency.
ok('Cor de urgência compara ação resolvida', med.includes('careAction === brainAction && brainCareItem?.lane === "now"'));
ok('O estado híbrido não herda etiqueta de origem ativa', med.includes('supplyRoute?.mode === "hybrid" ? ('));
ok('V165: faixa separada mantém margem original acessível',/mt-1 flex min-w-0 flex-wrap items-center gap-1\.5/.test(med));
ok('V165: botões continuam independentes da identidade',med.includes('VAULT_V318_COMPACT_IDENTITY') && med.includes('VAULT_MEDICATION_LIST_HIERARCHY_V98') && med.includes('router.push(careAction.href)') && med.includes('setQuickDoseMedId(med.id!)'));

console.log(`P15 R9 R2 R6: ${checks} contratos aprovados`);
