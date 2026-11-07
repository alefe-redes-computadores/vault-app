#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let count=0;
function ok(v,m){assert.ok(v,'M25 '+m);count++;console.log('✓ M25 '+m)}
const surfaces=['components/home/HomeDailyHero.tsx', 'components/home/HomeAttentionRail.tsx', 'components/home/HomeClinicalAreaTile.tsx', 'components/health-intelligence/BrainCarePlan.tsx', 'components/vault-intelligence/BrainV5DetailSheet.tsx', 'components/saude/AvatarMoodEvidence.tsx', 'components/saude/AvatarCareWorkspace.tsx', 'components/saude/MedicationOperationalStrip.tsx', 'components/saude/MedicationPortfolioOverview.tsx', 'components/saude/MedicationCareNetworkDetails.tsx', 'components/saude/MedicationDecisionEvidenceContext.tsx', 'components/saude/MedicationIdentityPreview.tsx', 'components/hoje/TodayTimelineGuide.tsx', 'components/hoje/TodayRemindersPanel.tsx'];
for(const file of [...surfaces,'lib/today/timeline-summary.ts']){
 const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(tree.parseDiagnostics.length===0,'TS/TSX '+file);
}
const by=p=>read(p);
const hero=by('components/home/HomeDailyHero.tsx'),rail=by('components/home/HomeAttentionRail.tsx'),tile=by('components/home/HomeClinicalAreaTile.tsx');
ok(hero.includes('min-h-[104px]')&&hero.includes('scheduled > 0 && Number.isFinite(progress)')&&hero.includes('active:bg-surface-raised/40'),'Home readability, valid 0/0, P15 R7 touch contract');
ok(hero.includes('aria-valuetext')&&hero.includes('safeCompleted')&&hero.includes('homeRoutineSummaryNote'),'Home denominator is still canonical');
ok(rail.includes('alerts.slice(0, 1)')&&rail.includes('className="space-y-2"')&&rail.includes('onToggle'),'Home alert priority and M11 layout unchanged');
ok(tile.includes('min-h-[84px]')&&tile.includes('onNavigate(path)')&&tile.includes('${tone}'),'Home area tile: usable touch area, canonical route and tone');
const plan=by('components/health-intelligence/BrainCarePlan.tsx'),sheet=by('components/vault-intelligence/BrainV5DetailSheet.tsx');
ok(plan.includes('min-[390px]:grid-cols-4')&&plan.includes('plan.counts[lane]')&&plan.includes('writeCarePlanMemory(plan)'),'Brain layout adapted to narrow screens without changing memory');
ok(sheet.includes('p-3.5')&&sheet.includes('brainV5PriorityReason(alert)')&&sheet.includes('useDialogGuard(true, onClose)'),'Brain detail readability without priority mutation');
const mood=by('components/saude/AvatarMoodEvidence.tsx'),workspace=by('components/saude/AvatarCareWorkspace.tsx');
ok(mood.includes('evidence.reason')&&mood.includes('Dias sem registro continuam desconhecidos')&&mood.includes('aria-valuenow={coverageDays}'),'Fenix emotion remains user-declared only');
ok(workspace.includes('ClinicalDisclosure')&&workspace.includes('vault-deferred')&&workspace.includes('memo(function AvatarCareWorkspace'),'Fenix expensive evidence stays deferred');
const strip=by('components/saude/MedicationOperationalStrip.tsx'),portfolio=by('components/saude/MedicationPortfolioOverview.tsx');
ok(strip.includes('stockTone==="empty"')&&strip.includes('doseOutcome==="ignored"')&&strip.includes('flex min-h-14 min-w-0 items-center')&&strip.includes('min-[320px]:grid-cols-2'),'Medications show dose and stock states separately');
ok(portfolio.includes('listActiveCount !== portfolio.active')&&portfolio.includes('Doses SOS não entram nessa meta')&&portfolio.includes('MedicationScopeReconciliation'),'Medication counts SOS and Brain/list scopes preserved');
const network=by('components/saude/MedicationCareNetworkDetails.tsx'),evidence=by('components/saude/MedicationDecisionEvidenceContext.tsx'),preview=by('components/saude/MedicationIdentityPreview.tsx');
ok(network.includes('size-12')&&network.includes('onCall(')&&network.includes('onMap(')&&network.includes('onNavigate('),'Detail network actions keep authoritative destinations');
ok(evidence.includes('não comprova retirada, compra concluída nem validade da receita')&&evidence.includes('medicationEvidenceClarity'),'Detail supply evidence remains non-certifying');
ok(preview.includes('AvatarMedicamento')&&preview.includes('colors.filter(color => /^#[0-9a-fA-F]{6}$/.test(color))')&&preview.includes('slice(0, 2)'),'Medication preview shows max two valid selected colors');
const guide=by('components/hoje/TodayTimelineGuide.tsx'),reminders=by('components/hoje/TodayRemindersPanel.tsx');
ok(guide.includes('Doses futuras são previsões')&&guide.includes('Somente uma confirmação registra tomada'),'Hoje clinical guidance remains explicit');
ok(reminders.includes('onNavigate(reminder.target_route)')&&reminders.includes('Lembretes não confirmam dose tomada'),'Hoje reminders are never auto-confirmations');
const file='lib/today/timeline-summary.ts',src=by(file),gate=by('scripts/test-v63-release-gate.mjs');
ok(src.includes('sortTimelineBucketIfNeeded')&&src.includes('rows.sort((a, b) => a.horario.localeCompare(b.horario))'),'Dense buckets skip unnecessary sort yet preserve stable sort fallback');
ok(src.includes('if (filtered === null) filtered = items.slice(0, i)')&&src.includes('return filtered ?? items'),'Visible filter only allocates when a row must be hidden');
const v9=by('scripts/test-home-today-v9-contract.mjs');
ok(v9.includes('pendingVisible === onlyPending')&&v9.includes('mixedVisible !== slots')&&
  !v9.includes('return items.filter(item => !item.tomada'),
  'V9 checks real behavior and M25 no-allocation identity rather than obsolete filter wording');
const v277=by('scripts/test-v277-dose-slot-notification-authority.cjs');
ok(v277.includes('summarizeTimeline(clinicalRows)')&&v277.includes('groupTimelineItems(clinicalRows')&&
  v277.includes('historical===clinicalRows')&&v277.includes('row.isDataConflict')&&
  !v277.includes('todaySummary.includes("!item.isDataConflict")'),
  'V277 checks real conflict exclusion across metrics, filters, history and review group');
for(const id of ['test-vault-m23-history-hotpath.cjs','test-vault-m24-r3-global-visual-hotpath.cjs','test-vault-m25-premium-longlist-hotpath.cjs'])ok(gate.includes(id),'global gate retains '+id);
const mod=new Module(file,module);mod.require=id=>id==='@/lib/health-intelligence/clinical-time'?{classifyClinicalSchedule:()=> 'now'}:require(id);
mod._compile(ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,file);
const {visibleTimelineItems,groupTimelineItems}=mod.exports;
const day='2026-11-02',c={isToday:true,selectedDate:day,today:day,nowTime:'12:00'};
const fixtures=[[],[{horario:'08:00',tomada:false,ignorada:false}],[{horario:'08:00',tomada:true,ignorada:false}],[{horario:'08:00',tomada:false,ignorada:false},{horario:'10:00',tomada:true,ignorada:false},{horario:'12:00',tomada:false,ignorada:true}],Array.from({length:5000},(_,i)=>({horario:`${String(i%24).padStart(2,'0')}:00`,tomada:i%7===0,ignorada:i%9===0,isDataConflict:i%11===0,isExpectedUnconfirmed:i%13===0,isSintoma:i%17===0,isAvulsa:i%19===0,doseKind:i%23===0?'planned':'sos'}))];
const contexts=[c,{...c,nowTime:'19:00'}, {...c,isToday:false,selectedDate:'2026-11-01'}];
const statuses=['todos','pendentes','tomados','ignorados'];
for(const items of fixtures){
 const snapshot=JSON.stringify(items);
 for(const status of statuses)for(const isToday of [true,false])for(const showResolved of [true,false]){
  const actual=visibleTimelineItems(items,{isToday,status,showResolved});
  const expected=!isToday||status!=='todos'||showResolved?items:items.filter(x=>!x.tomada&&!x.ignorada&&!x.isDataConflict);
  assert.deepEqual(actual,expected);
  if(expected.length===items.length)assert.strictEqual(actual,items);
  count++;
 }
 for(const context of contexts){
   const result=groupTimelineItems(items,context);
   for(const [_,bucket] of result){assert.deepEqual(bucket.map(x=>x.horario),[...bucket].map(x=>x.horario).sort((a,b)=>a.localeCompare(b)));}
   count++;
 }
 assert.equal(JSON.stringify(items),snapshot); // visual projection never mutates source slots
}
const pending=Array.from({length:3500},(_,i)=>({horario:`${String(i%24).padStart(2,'0')}:00`,tomada:false,ignorada:false}));
ok(visibleTimelineItems(pending,{isToday:true,status:'todos',showResolved:false})===pending,'3,500 pending rows avoid a new array allocation');
const sorted=Array.from({length:4200},(_,i)=>({horario:'08:00',tomada:false,ignorada:false}));
ok(groupTimelineItems(sorted,c)[0][1].length===4200,'4,200 equal-hour slots remain in exact source order');
console.log('VAULT M25:',count,'checks approved; no wall-clock claim');
