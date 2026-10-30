#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const home=read('app/page.tsx');
const today=read('app/hoje/page.tsx');
const todayActions=read('components/hoje/TodayActionCenter.tsx');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
for(const [name,src] of [['Home',home],['Hoje',today],['Detalhes',detail]]){
 const parsed=ts.createSourceFile(name+'.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(parsed.parseDiagnostics.length,0,`${name} TSX syntax ${parsed.parseDiagnostics.map(x=>x.messageText).join('; ')}`);
}
assert(home.includes('Sinais do Brain organizados por prioridade'));
assert(home.includes('grid grid-cols-1 gap-2 min-[620px]:grid-cols-2'));
assert(!home.includes('Deslize para ver outros sinais'),'stale carousel prompt');
assert(home.includes('setInsightExplicado('),'insights still open detail evidence');
assert(home.includes('defaultOpen={longitudinalHighlights.some('),'urgent evidence remains expanded');
assert(home.includes('suppressOperationalOverlap('),'Home keeps dedup source of truth');
assert(home.includes('primaryMedicationCareOpportunity.actionHref'),'Home preserves real operational action');
assert(today.includes('label="Áreas de Hoje" layout="grid"'),'all Today areas visible');
assert(today.includes('pendingDoses={totalPendentes}') && today.includes('getElementById("hoje-doses")') && todayActions.includes('pendingDoses > 0'),'pending jump preserved');
assert(today.includes('DoseMonthOverview userId={user.id} personId={activePersonId}'),'owner-safe monthly analysis');
assert(today.includes('dosesElegiveisLote.length > 1') && today.includes('handleTomarTodos()'),'dose batch preserved');
assert(today.includes('setMostrarConcluidas'),'past doses review preserved');
assert(detail.includes('label="Áreas do medicamento" layout="grid"'),'medicine sections discoverable');
assert(detail.includes('V332_CARE_EVIDENCE_DISCLOSURE'),'evidence displayed progressively');
assert(detail.includes('(brainCareAction?.evidence || careDecision.evidence).slice(0,3).map('),'first three canonical evidences preserved (V238)');
assert(detail.includes('(brainCareAction?.evidence || careDecision.evidence).slice(3).map('),'remaining canonical evidences still available without truncation');
assert(detail.includes('navigateCareAction('),'care action maintains same-target scrolling');
assert(detail.includes('abrirQuickDose'),'record dose retained');
assert(detail.includes('MedicationJourneySummary') && detail.includes('HealthSupplyEntry'),'prescription/purchase/SUS remain separate');
console.log('VAULT V332: Home/Hoje/Detalhes density, brain evidence, dose authority, owner and navigation OK');
