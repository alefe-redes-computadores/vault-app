#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const today=read('app/hoje/page.tsx');
const card=read('components/hoje/TodayDoseTimelineCard.tsx');
const m14=read('scripts/test-vault-m14-home-today-fenix.cjs');
const m15=read('scripts/test-vault-m15-appointment-timeline-fenix.cjs');
const v196=read('scripts/test-v196-progressive-shell-avatar.cjs');
const p15=read('scripts/test-p15-r1-stable-modules.cjs');
const v165=read('scripts/test-v165-contextual-health.cjs');
const v167=read('scripts/test-v167-avatar-planned-management.cjs');
const v98=read('scripts/test-v98-final-medication-intelligence-contract.mjs');
const v60=read('scripts/test-v60-coherence-contract.mjs');
const gate=read('scripts/test-v63-release-gate.mjs');
const clock=read('lib/today/clock-minute.ts');
const codexM16=read('scripts/test-vault-m16-today-data-evidence-fenix.cjs');
let count=0;
function ok(c,label){assert.ok(c,'M17: '+label);count++;console.log('✓ M17 '+label);}
for(const file of ['app/hoje/page.tsx','components/hoje/TodayDoseTimelineCard.tsx','lib/today/clock-minute.ts']){
 const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(ast.parseDiagnostics.length===0,'TSX parser '+file+': '+ast.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; '));
}
ok(today.includes('renderItem={(item) => <TodayDoseTimelineCard item={item} scope={doseCardScope} />}')&&
  today.includes('const doseCardScope: TodayDoseTimelineCardScope ='),'real extracted card mounted with explicit context');
ok(!today.includes('if (item.isSintoma) {')&&card.includes('if (item.isSintoma) {'),
   '30KB renderer moved, not duplicated in parent');
ok(card.length>26000&&today.length<130000,'meaningful extraction (>26KB card; Hoje under 130KB)');
ok(card.includes('export function TodayDoseTimelineCard')&&card.includes('TodaySymptomTimelineCard')&&card.includes('describeTodayDoseStatus({'),
   'symptoms and temporal statuses still rendered');
for(const t of ['const isAtrasado =','const isProximo =','const isPrevistoFuturo =','const isHistoricoSemConfirmacao =',
 'isHistoricoSemConfirmacao: Boolean(isHistoricoSemConfirmacao)','item.isDataConflict','item.tomada','item.ignorada']){
 ok(card.includes(t),'status distinction: '+t);
}
for(const t of ['handleCancelPlannedDose(item)','handleIgnorar(','handleToggle(','abrirRevisaoHistorica(',
 'setMedicamentoSelecionado(','setModalAberto(','medicamentosById.get(item.medicamentoId)',
 'router.push(','trigger("vibrate")'])ok(card.includes(t),'delegated visual action '+t);
for(const t of ['await marcarDose(','partitionDoseBatchByStock(', 'buildTodayTimelineItems(',
 'const metricItems = useMemo(() => doses.filter(', 'const dosesElegiveisLote = useMemo(',
 'handleDesfazerLote','useDoseLogs(','handleToggle = async','handleIgnorar = async'])ok(today.includes(t),'canonical operation remains in parent '+t);
ok(!/(\bdb\.|\bsupabase\b|fetch\(|localStorage|indexedDB|safeAdd|safeUpdate|\.insert\(|\.update\(|\buseLiveQuery\b)/.test(card),
 'new card never reads or writes database');
ok(!card.includes('useDoseLogs(')&&!card.includes('useMedicationRegulatoryProfiles('),'card does not duplicate hooks or clinical queries');
ok(!card.includes('new THREE.')&&!card.includes('requestAnimationFrame('),'card avoids GPU or background animation');
ok(today.includes('DoseScheduleGroups items={grupo.items}')&&today.includes('onTakeGroup={isHoje ? handleRevisarHorario : undefined}'),
 'per-hour grouping and action remain intact');
ok(m14.includes('doseCard.includes(\'describeTodayDoseStatus({\')')&&m14.includes("doseCard.includes('<TodaySymptomTimelineCard')"),
 'M14 legacy verifies true component source');
ok(m15.includes("doseCard.includes('describeTodayDoseStatus({')")&&m15.includes('today.includes(\'<TodayDoseGroupHeading\')'),
 'M15 legacy checks actual card and grouping');
ok(v196.includes('doseCard.includes("? medicamentosById.get(item.medicamentoId)")')&&v196.includes('today.includes("<TodayDoseTimelineCard")'),
 'V196 medication index still in use, in correct owner');
ok(p15.includes('const doseCard=read("components/hoje/TodayDoseTimelineCard.tsx")')
  &&p15.includes('today.includes(\'<TodayDoseTimelineCard item={item} scope={doseCardScope} />\')')
  &&p15.includes('doseCard.includes(\'getDiasRestantesEstilo(\')')
  &&p15.includes('doseCard.includes(\'diasEstilo.cor\')')
  &&p15.includes('doseCard.includes(\'diasEstilo.bg\')'),
 'P15 R1 checks the actual consumer of urgency formatting and its visual tone');
ok(v165.includes('assert.match(card, /doseKind === "planned"/)')&&v165.includes('assert.match(today, /<TodayDoseTimelineCard/)')&&v165.includes('assert.doesNotMatch(health'), 'V165 follows scheduled action into actual card without dropping treatment safeguards');
ok(v167.includes('assert.match(card, /Cancelar agendamento/)')&&v167.includes('assert.match(card, /handleCancelPlannedDose')&&v167.includes('assert.match(today, /await removerDosePorId'), 'V167 checks real cancel button and append-only stock-safe authority');
ok(v98.includes('card.includes(\'item.doseKind === "planned" ? "Agendada" : "SOS / Avulsa"\')')&&v98.includes('today.includes(\'<TodayDoseTimelineCard'), 'V98 still distinguishes scheduled from SOS and extra');
ok(v60.includes('doseCard.includes("regulatorySurface.rail")')
 &&v60.includes('doseCard.includes("borderLeft: `4px solid ${regulatorySurface.rail}`")')
 &&v60.includes('h.includes("<TodayDoseTimelineCard item={item} scope={doseCardScope} />")'),
 'V60 regulatory identity remains visible in extracted card and connected to Today');
ok(gate.includes('scripts/test-vault-m18-medication-navigation-fenix.cjs'),
 'Codex M18 medication navigation contract retained in global release gate');
for(let i=1;i<=17;i++)ok(gate.includes('test-vault-m'+i+'-'),'cumulative release gate M'+i);
ok(gate.includes('scripts/test-vault-m17-relational-hierarchy-fenix.cjs') && gate.includes('scripts/test-vault-m17-today-dose-performance.cjs'),
 'Codex M17 global UX gate and today M17-R3 gate both retained');
ok(today.includes('useTodayOwnerData({')&&today.includes('<TodayRetroReviewPanel')&&today.includes('buildTodayRetroReviewSummary({')&&codexM16.includes('historyData?.userId === userId'),
 'Codex M16 scoped data, retroactive evidence and avatar policy remain registered');
ok(today.includes('isSameLocalMinute(anterior, instante) ? anterior : instante')&&today.includes('document.visibilityState !== "visible"')&&clock.includes('getFullYear()')&&clock.includes('getMinutes()'),
 'UI clock skips unchanged minute and hidden tabs; local-day rollover preserved');
// Exercise the actual TS module without a browser or mock clinical engine.
const {Module}=require('node:module');const m=new Module('lib/today/clock-minute.ts',module);
m._compile(ts.transpileModule(clock,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'lib/today/clock-minute.ts');
const same=m.exports.isSameLocalMinute;
ok(same(new Date(2026,10,2,8,9,1),new Date(2026,10,2,8,9,59)),'same local minute is stable despite seconds');
ok(!same(new Date(2026,10,2,8,9,59),new Date(2026,10,2,8,10,0)),'new minute refreshes state');
ok(!same(new Date(2026,10,2,23,59,59),new Date(2026,10,3,0,0,0)),'midnight refreshes state');

console.log('VAULT M17: '+count+' architecture, safety, and compatibility checks approved');
