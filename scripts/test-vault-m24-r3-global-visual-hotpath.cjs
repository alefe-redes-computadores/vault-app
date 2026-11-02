#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'), ts=require('typescript'), Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
let checks=0;
const ok=(v,label)=>{assert.ok(v,'M24 '+label); checks++; console.log('✓ M24 '+label)};
const visual=[
'components/home/HomeDailyHero.tsx',
'components/home/HomeAttentionRail.tsx',
'components/home/HomeClinicalAreaTile.tsx',
'components/vault-intelligence/BrainV5DetailSheet.tsx',
'components/health-intelligence/BrainCarePlan.tsx',
'components/saude/AvatarMoodEvidence.tsx',
'components/saude/AvatarCareWorkspace.tsx',
'components/saude/MedicationOperationalStrip.tsx',
'components/saude/MedicationPortfolioOverview.tsx',
'components/saude/MedicationCareNetworkDetails.tsx',
'components/saude/MedicationDecisionEvidenceContext.tsx',
'components/saude/MedicationIdentityPreview.tsx',
'components/hoje/TodayTimelineGuide.tsx',
'components/hoje/TodayRemindersPanel.tsx'];
for(const path of [...visual,'lib/today/timeline-summary.ts']){
  const sf=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(sf.parseDiagnostics.length===0,'parser '+path);
}
const hero=read(visual[0]), attention=read(visual[1]), area=read(visual[2]);
ok(hero.includes('min-h-[104px]')&&hero.includes('safeProgress')&&hero.includes('scheduled > 0')&&hero.includes('aria-valuetext'),'Home hero readability without fictional completion');
ok(hero.includes('scheduled > 0 && Number.isFinite(progress)') &&
   hero.includes('motion-reduce:transition-none active:bg-surface-raised/40'),
   'P15 R7: Home keeps valid 0/0 semantics, reduced motion and original active contrast while design improves');
ok(attention.includes('alerts.length === 0')&&attention.includes('aria-expanded={expanded}')&&attention.includes('renderAlert(alert)'),'Home attention keeps filtering and accessible control');
ok(area.includes('min-h-[84px]')&&area.includes('onNavigate(path)')&&area.includes('${tone}'),'Home clinical navigation and clinical color stay intact');
const brainSheet=read(visual[3]),brainPlan=read(visual[4]);
ok(brainSheet.includes('overscroll-contain')&&brainSheet.includes('sm:rounded-[28px]')&&brainSheet.includes('useDialogGuard(true, onClose)'),'Brain detail responsive sheet and close authority');
ok(brainPlan.includes('border-surface-border/70 bg-gradient-to-br')&&brainPlan.includes('plan.items')&&brainPlan.includes('writeCarePlanMemory(plan)')&&brainPlan.includes('onNavigate(item.href)'),'Brain plan contrast and evidence policy remain');
const mood=read(visual[5]),avatar=read(visual[6]);
ok(mood.includes("evidence.reason === 'positive'")&&mood.includes("evidence.reason === 'negative'")&&mood.includes('Dias sem registro continuam desconhecidos'),'Avatar palette only follows declared moods');
ok(mood.includes('aria-valuenow={coverageDays}')&&mood.includes('Registrar humor'),'Avatar coverage and explicit recording remain');
ok(avatar.includes('export const AvatarCareWorkspace = memo')&&avatar.includes('ClinicalDisclosure')&&avatar.includes('vault-deferred space-y-3'),'Avatar expensive evidence stays deferred');
const strip=read(visual[7]),portfolio=read(visual[8]),network=read(visual[9]),context=read(visual[10]),identity=read(visual[11]);
ok(strip.includes('doseOutcome==="ignored"')&&strip.includes('stockTone==="empty"')&&strip.includes('stockDetail'),'Medication list preserves dose and stock evidence');
ok(portfolio.includes('MedicationScopeReconciliation')&&portfolio.includes('ignored')&&portfolio.includes('pending')&&portfolio.includes('total > 0')&&portfolio.includes('Doses SOS não entram nessa meta'),'Medication portfolio leaves denominators and coherence distinct');
ok(network.includes('onNavigate(')&&network.includes('onCall(')&&network.includes('onMap(')&&network.includes('needsPrescription'),'Medication details keep real care relationships and actions');
ok(context.includes('medicationEvidenceClarity')&&context.includes('Origem do fornecimento ainda não comprovada'),'Medication details never certify supply from a route');
ok(identity.includes('AvatarMedicamento')&&identity.includes('name || "Medicamento"'),'Medication identity preview remains data-driven');
const guide=read(visual[12]),reminders=read(visual[13]);
const m7=read('scripts/test-vault-m7-medication-appearance-fenix.cjs');
ok(m7.includes('Doses futuras são previsões')&&m7.includes('Somente uma confirmação registra tomada')&&
  m7.includes('shrink-0 text-emerald-300')&&!m7.includes("today.includes('text-emerald-300/80')"),
  'M7 checks same clinical notices and actual informative icon class, not obsolete opacity');
ok(guide.includes('Falta de confirmação')&&guide.includes('Somente uma confirmação registra tomada'),'Hoje uncertainty text remains exact');
ok(reminders.includes('onNavigate(reminder.target_route)')&&reminders.includes('Lembretes não confirmam dose tomada'),'Hoje reminders keep manual actions');
const summaryPath='lib/today/timeline-summary.ts',summary=read(summaryPath),gate=read('scripts/test-v63-release-gate.mjs');
ok(summary.includes('M24: one pass for status+period')&&summary.includes('filtered.push(item)')&&summary.includes('if (status === "todos" && period === "todos") return items'),'single pass and no-filter identity');
for(const id of ['test-vault-m17-today-dose-performance.cjs','test-vault-m18-today-hotpath.cjs','test-vault-m19-today-projection-hotpath.cjs','test-vault-m20-owner-day-dose-read.cjs','test-vault-m21-committed-card-render.cjs','test-vault-m22-timeline-reconciliation.cjs','test-vault-m23-history-hotpath.cjs','test-vault-m24-r3-global-visual-hotpath.cjs'])ok(gate.includes(id),'global gate retains '+id);

// Execute the actual transpiled TS module, not a reimplementation.
const m=new Module(summaryPath,module);
m.require=id=>{if(id==='@/lib/health-intelligence/clinical-time')return {classifyClinicalSchedule:()=> 'now'};throw Error('M24 unexpected import '+id)};
m._compile(ts.transpileModule(summary,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,summaryPath);
const {filterTimelineItems,visibleTimelineItems}=m.exports;
function original(items,status,period,isToday){
 let out=items;
 if(status==='tomados')out=out.filter(item=>item.tomada&&!item.isDataConflict);
 else if(status==='pendentes')out=out.filter(item=>!item.tomada&&!item.ignorada&&!item.isDataConflict&&!item.isSintoma&&(isToday?!item.isExpectedUnconfirmed:item.isExpectedUnconfirmed));
 else if(status==='ignorados')out=out.filter(item=>item.ignorada&&!item.isDataConflict);
 if(period!=='todos')out=out.filter(item=>{const h=Number(String(item.horario||'00:00').split(':')[0]);return (h>=5&&h<12?'manha':h>=12&&h<18?'tarde':'noite')===period});
 return out;
}
const fixtures=[[],[
{horario:'08:00',tomada:true,ignorada:false},{horario:'14:00',tomada:false,ignorada:true},
{horario:'22:00',tomada:false,ignorada:false,isDataConflict:true},
{horario:'07:00',tomada:false,ignorada:false,isExpectedUnconfirmed:true},
{horario:'13:00',tomada:false,ignorada:false,isSintoma:true},
{horario:'20:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'sos'},
{horario:'23:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'planned'},
{horario:'00:00',tomada:true,ignorada:true},
],Array.from({length:5000},(_,i)=>({horario:`${String(i%24).padStart(2,'0')}:00`,tomada:i%3===0,ignorada:i%7===0,isDataConflict:i%13===0,isExpectedUnconfirmed:i%19===0,isSintoma:i%23===0}))];
for(const fixture of fixtures){
 for(const status of ['todos','tomados','pendentes','ignorados'])for(const period of ['todos','manha','tarde','noite'])for(const today of [true,false]){
  const before=JSON.stringify(fixture);
  const actual=filterTimelineItems(fixture,status,period,today);
  assert.deepEqual(actual,original(fixture,status,period,today));
  assert.equal(JSON.stringify(fixture),before);
  if(status==='todos'&&period==='todos')assert.strictEqual(actual,fixture);
  const visible=visibleTimelineItems(actual,{isToday:today,status,showResolved:false});
  assert.ok(visible.every(row=>actual.includes(row)));
  checks++;
 }
}
ok(filterTimelineItems(fixtures[2],'pendentes','manha',true).length>=0,'5000 rows keep exactly the previous clinical status semantics');
console.log(`VAULT M24: ${checks} checks passed. No artificial wall-time benchmark or clinical inference.`);
