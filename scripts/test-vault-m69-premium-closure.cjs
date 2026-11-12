#!/usr/bin/env node
'use strict';
// M69 — read-only presentation tests; never mutate Dexie/Supabase/stock/dose.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=(p)=>fs.readFileSync(p,'utf8');
const files=[
 'components/home/HomeDailyHero.tsx','components/home/HomeQuickMetrics.tsx',
 'components/home/HomeAttentionRail.tsx','components/hoje/TodayRoutinePulse.tsx',
 'components/hoje/TodayActionCenter.tsx','components/saude/ClinicalCollectionGroup.tsx',
 'components/saude/ClinicalSectionNav.tsx','components/saude/CareRelationshipRoutes.tsx',
 'components/saude/AccessCommandOverview.tsx','components/saude/MedicationPortfolioOverview.tsx',
 'app/hoje/page.tsx','app/saude/medicamentos/page.tsx',
 'app/saude/medicamentos/detalhes/page.tsx','app/saude/minha-saude/page.tsx',
 'app/inteligencia/page.tsx','app/saude/fornecimento/page.tsx',
 'app/saude/timeline/page.tsx','components/NotificationPreferencesPanel.tsx',
 'app/onboarding/page.tsx','app/login/page.tsx',
];
let count=0;
const ok=(value,message)=>{assert.ok(value,`VAULT M69: ${message}`);count++;};
for(const path of files){
 const source=read(path);
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(file.parseDiagnostics.length===0,`${path} TSX parse: ${file.parseDiagnostics.map(x=>x.messageText).join(' | ')}`);
}
const hero=read(files[0]),metrics=read(files[1]),attention=read(files[2]);
ok(hero.includes('min-h-[104px]')&&hero.includes('homeRoutineSummaryNote')&&hero.includes('scheduled > 0 && Number.isFinite(progress)'), 'Hero preserves unplanned-dose denominator and legacy touch contract');
ok(hero.includes('aria-valuetext')&&hero.includes('rounded-xl border border-ice/25'), 'Hero progress and primary action accessible');
ok(metrics.includes('pendingDoses')&&metrics.includes('SOS / extra')&&metrics.includes('min-h-[58px]')&&metrics.includes('font-mono text-xl'), 'Home retains authority and emphasizes counts');
ok(attention.includes('alerts.slice(0, 1)')&&attention.includes('visible.map(alert')&&attention.includes('onToggle'), 'Home critical alerts remain prioritized and expandable');
const pulse=read(files[3]),todayAction=read(files[4]),today=read('app/hoje/page.tsx');
ok(pulse.includes('todayTemporalGuidance')&&pulse.includes('data-temporal-authority')&&pulse.includes('text-lg font-bold tabular-nums'), 'Today projection/recording distinction remains');
ok(pulse.includes('aria-valuetext={`${completed} concluídas, ${ignored} ignoradas, ${unconfirmed} sem confirmação`}'), 'Today does not count ignored doses as taken');
ok(todayAction.includes('pendingDoses > 0')&&todayAction.includes('onOpenDoses')&&todayAction.includes('CareCommandStrip'), 'Today existing real actions preserved');
ok(today.includes('dosesElegiveisLote.length > 1')&&today.includes('handleTomarTodos()')&&today.includes('retroReviewMode'), 'Today batching and retroactive navigation stay canonical');
const groups=read(files[5]),nav=read(files[6]),relations=read(files[7]),supply=read(files[8]);
ok(groups.includes('forceOpen||open')&&groups.includes('if(count===0)return null')&&groups.includes('vault:reveal-clinical-section'), 'Medication groups remain lazy, deep-link aware');
ok(groups.includes('className={`mt-0.5 block line-clamp-2 break-words leading-relaxed text-ink-muted ${compact ? "text-[11px]" : "text-xs"}`}') && groups.includes('aria-label={`${title}. ${count} itens. ${description}`}'), 'M50 legacy readable group description and improved 12px text retained');
ok(hero.includes('min-h-[104px]')&&hero.includes('min-[380px]:min-h-[116px]'), 'M24/M64 original mobile min-height retained while larger screens gain room');
ok(nav.includes('M11_FIVE_TABS_ONE_ROW')&&nav.includes('grid-cols-5')&&nav.includes('hashchange')&&nav.includes('IntersectionObserver'), 'Clinical anchors maintain old navigation and accessibility');
ok(relations.includes('grid grid-cols-2 gap-2')&&relations.includes('onNavigate(href)')&&relations.includes('Cuidado conectado'), 'Care relationships use readable mobile grid without altered destinations');
ok(supply.includes('lanes.slice(0,2)')&&supply.includes('lanes.slice(2)')&&supply.includes('Somente exigência explícita'), 'SUS primary pending processes and missing docs first; history available');
ok(supply.includes('access.acquisitions.realized')&&supply.includes('access.withdrawals.scheduled')&&supply.includes('Brain · próxima decisão'), 'SUS values real and Brain distinct');
const portfolio=read(files[9]),medicine=read('app/saude/medicamentos/page.tsx');
ok(portfolio.includes('medicationPortfolioCoherence')&&portfolio.includes('MedicationScopeReconciliation')&&portfolio.includes('Doses SOS não entram nessa meta programada'), 'Brain portfolio source/stock accuracy retained');
ok(medicine.includes('<MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>')&&medicine.includes('setQuickDoseMedId'), 'Medication list filtering and quick dose canonical');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
ok(detail.includes('abrirQuickDose')&&detail.includes('MedicationJourneySummary')&&detail.includes('HealthSupplyEntry'), 'Medicine detail preserves dose, acquisition and SUS paths');
const health=read('app/saude/minha-saude/page.tsx');
ok(health.includes('id="minha-saude-panorama"')&&health.includes('{() => <PersonalHealthOverview')&&health.includes('id="minha-saude-mapa-cuidado"'), 'Minha Saúde original sources and panorama preserved');
ok(health.includes('id="minha-saude-relacoes"')&&health.includes('id="meu-avatar"'), 'Fênix gets prominence over secondary relations');
const notification=read('components/NotificationPreferencesPanel.tsx');
ok(notification.includes('setNotificationPreferenceEnabled')&&notification.includes('setVaultNotificationCategoryEnabled')&&notification.includes('aria-checked={checked}'), 'Notifications preserve real preferences and semantic switches');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m69-premium-closure.cjs')&&gate.includes('scripts/test-vault-m67-retro-navigation.cjs')&&gate.includes('scripts/test-v334-visible-filters-hierarchy.cjs'), 'M69 and cumulative gates registered');
const filters=read('components/list/ListFilters.tsx');
ok(filters.includes('Concluir')&&filters.includes('V334_VISIBLE_FILTER_TRIGGER'), 'V334 compatibility preserved');
for(const path of ['components/home/HomeQuickMetrics.tsx','components/home/HomeDailyHero.tsx','components/hoje/TodayRoutinePulse.tsx','components/saude/ClinicalCollectionGroup.tsx','components/saude/CareRelationshipRoutes.tsx','components/saude/AccessCommandOverview.tsx']){
 const source=read(path);ok(!/\b(?:db\.|supabase\.|syncQueue\.|\.insert\(|\.bulkPut\(|\.bulkDelete\()/.test(source),`pure visual module has no persistence: ${path}`);
}
console.log(`VAULT M69 — PREMIUM FECHAMENTO 360: ${count} assertions OK`);
