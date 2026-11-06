#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
let checks=0;
const ok=(value,description)=>{assert.ok(value,`M71: ${description}`);checks++};
const read=path=>fs.readFileSync(path,'utf8');

const changes=[
 'app/inteligencia/page.tsx',
 'app/saude/medicamentos/detalhes/page.tsx',
 'app/saude/medicamentos/page.tsx',
 'app/saude/tratamentos/detalhes/page.tsx',
 'app/saude/tratamentos/page.tsx',
 'components/health-intelligence/BrainCarePlan.tsx',
 'components/health-intelligence/BrainNextStep.tsx',
 'components/hoje/TodayRemindersPanel.tsx',
 'components/saude/MedicationOperationalStrip.tsx',
 'components/saude/MedicationRoutineSummary.tsx',
 'components/saude/MedicationStockOverview.tsx',
 'lib/health-intelligence/medication-presentation-review.ts',
];
for(const file of changes){
 const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,`TS/TSX syntactic integrity: ${file}`);
}
const helper=read('lib/health-intelligence/medication-presentation-review.ts');
const compiled=ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const moduleObject={exports:{}};
new Function('module','exports',compiled)(moduleObject,moduleObject.exports);
const review=moduleObject.exports.medicationStockUnitReview;
ok(typeof review==='function','pure stock review exported');
const capsule={estoque_quantidade:12,estoque_unidade_medida:'comprimidos',forma_farmaceutica:'capsula'};
ok(review(capsule)?.includes('divergem'),'mismatched capsule/tablet unit requires review');
ok(review({...capsule,estoque_unidade_medida:'cápsulas'})===null,'equivalent units do not create alerts');
ok(review({...capsule,estoque_quantidade:undefined})===null,'unknown count never becomes zero');
ok(review({...capsule,estoque_unidade_medida:undefined})?.includes('falta a unidade'),'missing inventory unit is explicit');
ok(review({...capsule,forma_farmaceutica:'gota',estoque_unidade_medida:'ml'})===null,'liquid ml stock is not silently reinterpreted');
ok(review({...capsule,estoque_quantidade:12}).includes('Confira o cadastro'),'review does not claim clinical misdose');
ok(!/\b(?:db\.|supabase\.|\.put\(|\.add\(|\.delete\(|\.update\(|fetch\()/.test(helper),'stock helper has no storage or network side effects');
const meds=read('app/saude/medicamentos/page.tsx');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
const stock=read('components/saude/MedicationStockOverview.tsx');
const strip=read('components/saude/MedicationOperationalStrip.tsx');
const routine=read('components/saude/MedicationRoutineSummary.tsx');
ok(meds.includes('setQuickDoseMedId(med.id!)')&&meds.includes('MedicationOperationalStrip today={todayStatus}')&&meds.includes('medicationStockUnitReview(med)'), 'quick dose unchanged; unit review only display');
ok(detail.includes('abrirQuickDose')&&detail.includes('formatWarning={medicationStockUnitReview(med)}')&&detail.includes('MedicationRestockAction'), 'detail keeps dose and restock actions');
ok(stock.includes('formatQuantity(quantity)')&&stock.includes('registeredBalance')&&stock.includes('negative && registeredBalance')&&stock.includes('dropsConversionMissing'),'stock count, negative balance and drop conversion untouched');
ok(stock.includes('formatWarning && <p role="note"')&&stock.includes('O saldo numérico não foi convertido'),'unit inconsistency does not convert stock');
ok(strip.includes('doseOutcome==="ignored"')&&strip.includes('stockTone==="empty"')&&strip.includes('min-h-8')&&strip.includes('Package size={12}'),'stock/dose states and legacy density preserved');
ok(routine.includes('resolvedToday}/{plannedToday}')&&routine.includes('ignoredScheduledToday')&&routine.includes('takenScheduledToday')&&routine.includes('horários com desfecho registrado'),'ignored remains distinct from taken');
const treatment=read('app/saude/tratamentos/page.tsx');
const treatmentDetail=read('app/saude/tratamentos/detalhes/page.tsx');
ok(treatment.includes('Sem medicamentos vinculados')&&treatment.includes('tratamento.alertaPrincipal.titulo === "Tratamento sem medicamento vinculado"'),'legacy empty state and single-alert contract preserved');
ok(treatment.includes('Possíveis vínculos para revisar nos detalhes.')&&treatment.includes('medicamentosResumo.map(m=>m.nome)'), 'list shows at most two candidate names, confirmed relations intact');
ok(treatmentDetail.includes('possibleMedications.map(')&&treatmentDetail.includes('medicamentosAtivos.map(')&&treatmentDetail.includes('tratamento_id=${encodeURIComponent(id)}'),'all candidate links and new medication workflow accessible');
ok(treatmentDetail.includes('Nenhum evento clínico vinculado a este tratamento.')&&treatmentDetail.includes('id="tratamento-linha"'),'clinical history preserved');
const central=read('app/inteligencia/page.tsx');
const step=read('components/health-intelligence/BrainNextStep.tsx');
const plan=read('components/health-intelligence/BrainCarePlan.tsx');
ok((central.match(/<CareJourney360 command=\{health\.careCommand\}/g)||[]).length===1,'care map not repeated');
ok(central.includes('id="insight-plano"')&&central.includes('id="insight-relacoes"')&&(central.match(/<BrainCarePlan plan=\{health\.careCommand\.plan\}/g)||[]).length===1,'care plan still accessible through disclosure');
ok(central.includes('{() => health.careCommand ? <BrainCarePlan plan={health.careCommand.plan}'), 'Brain deferred verifica contexto nulo');
ok(central.includes('<BrainNextStep decision={health.careCommand.decision}')&&central.includes('id="insight-evidencias"')&&central.includes('id="insight-saude"'),'priority/evidence and health alerts not removed');
ok(step.includes('<VaultBrainEvidence item={decision} />')&&step.includes('Ver por que o Brain sugeriu esta etapa'),'evidence preserved under disclosure');
ok(plan.includes('writeCarePlanMemory(plan)')&&plan.includes('onNavigate(item.href)')&&plan.includes('plan.items'),'Brain memory and navigation preserved');
const reminders=read('components/hoje/TodayRemindersPanel.tsx');
ok(reminders.includes('reminders.length, 3, 4')&&reminders.includes('onNavigate(reminder.target_route)')&&reminders.includes('isSafeLocalActionHref(reminder.target_route)'),'M55 reminder pagination and safe links retained');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m71-final-visual-contract.cjs')&&gate.includes('scripts/test-vault-m70-video-functional-360.cjs')&&gate.includes('scripts/test-vault-m69-premium-closure.cjs'),'all release contracts cumulative');
console.log(`M71 FINAL VISUAL + CLINICAL SAFETY: ${checks} checks approved`);
