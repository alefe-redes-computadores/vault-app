#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict');
const ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;
const ok=(v,msg)=>{assert.ok(v,`VAULT M1: ${msg}`);console.log(`✓ ${++passed}: ${msg}`)};
const fileNames=[
  'app/page.tsx','app/hoje/page.tsx','components/home/HomeAgendaBreakdown.tsx',
  'components/hoje/TodayTimelineGuide.tsx','components/hoje/TodayRemindersPanel.tsx',
  'components/saude/MedicationJourneySummary.tsx','components/saude/AvatarCareReadiness.tsx',
  'components/saude/AvatarEvidenceBoundary.tsx','components/saude/HealthAvatar3D.tsx',
  'lib/home/agenda-urgency.ts','lib/health-intelligence/medication-journey-signal.ts',
  'scripts/test-v63-release-gate.mjs'];
for(const p of fileNames){const a=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(a.parseDiagnostics.length===0,'sintaxe TS/TSX '+p)}
function pure(file){const compiled=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const m=new Module(file,module);m._compile(compiled,file);return m.exports}
const agenda=pure('lib/home/agenda-urgency.ts').homeAgendaUrgency;
ok(agenda(3,2).overdue===2&&agenda(3,2).tone==='attention','retirada atrasada não duplica total');
ok(agenda(2,80).overdue===2,'atraso nunca excede compromissos');
ok(agenda(0,4).overdue===0,'sem agenda não inventa atraso');
ok(agenda(NaN,-2).total===0,'valores inválidos não inventam agenda');
const journey=pure('lib/health-intelligence/medication-journey-signal.ts').medicationJourneySignal;
ok(journey({overdueWithdrawals:1,pendingWithdrawals:1,plannedAcquisitions:1,completedAcquisitions:0}).tone==='attention','retirada vencida tem prioridade visual');
ok(/não comprova ausência de retirada/.test(journey({overdueWithdrawals:1,pendingWithdrawals:0,plannedAcquisitions:0,completedAcquisitions:0}).explanation),'vencimento não vira ausência comprovada');
ok(/não conta/.test(journey({overdueWithdrawals:0,pendingWithdrawals:0,plannedAcquisitions:1,completedAcquisitions:0}).explanation),'compra futura não vira estoque');
ok(journey({overdueWithdrawals:0,pendingWithdrawals:0,plannedAcquisitions:0,completedAcquisitions:0}).tone==='neutral','dados ausentes não geram urgência clínica');
const home=read('app/page.tsx'),today=read('app/hoje/page.tsx');
ok(!home.includes('quickActions.map(')&&!home.includes('redeActions.map('),'Home remove listas usadas só por painéis invisíveis');
ok(!home.includes('const quickActions = [')&&!home.includes('const redeActions = ['),'Home remove arrays mortos');
ok(!home.includes('className="hidden w-full items-center')&&!home.includes('className="hidden space-y-3"'),'Home não monta rails ocultos');
ok(home.includes('<HomeCommandCenter')&&home.includes('<HomeDailyHero')&&home.includes('<HomeQuickMetrics')&&home.includes('<HomeAttentionRail'),'Home conserva navegação e hierarquia visíveis');
ok(home.includes('appointments={totalCompromissosHoje}')&&home.includes('pendingDoses={dosesPendentesAtrasadas.length}'),'métricas canônicas preservadas');
ok(home.includes('medicamentosById.get(retirada.medicamento_id)')&&home.includes('buildHomePendingDoseProjection'),'índice e doses V196/V277 preservados');
ok(home.includes('overdueWithdrawals={retiradasAtrasadas.length}')&&read('components/home/HomeAgendaBreakdown.tsx').includes('homeAgendaUrgency('),'Home indica retirada vencida sem nova consulta');
ok(today.includes('remindersDoDia.length > 0')&&today.includes('<TodayRemindersPanel'),'Hoje mantém origem e extrai render de lembretes');
ok(today.includes('aria-label="Lembretes de saúde do dia"')===false&&read('components/hoje/TodayRemindersPanel.tsx').includes('aria-label="Lembretes de saúde do dia"'),'rótulo semântico transferido ao componente real');
ok(read('components/hoje/TodayTimelineGroupPresentation.ts').includes('Programadas para depois · ainda não estão atrasadas')&&read('components/hoje/TodayTimelineGroupPresentation.ts').includes('Registros contraditórios não entram nas métricas')&&today.includes('todayTimelineGroupPresentation'),'V229 e V277 preservados no Hoje');
ok(today.includes('groupTimelineItems(dosesParaExibir')&&today.includes('await marcarDose(')&&today.includes('const metricItems = useMemo(() => doses.filter('),'fila, ações e métricas preservadas');
ok(read('components/hoje/TodayRemindersPanel.tsx').includes('onNavigate(reminder.target_route)'),'lembretes mantêm destino original');
const detail=read('components/saude/MedicationJourneySummary.tsx');
ok(detail.includes('journeyHeadline(snapshot)')&&detail.includes('Receita, aquisição e retirada são eventos independentes'),'autoridades clínicas históricas preservadas');
ok(detail.includes('divide-y')&&detail.includes('Sem inferir estoque'),'jornada V255 e V274 preservada');
ok(detail.includes('medicationJourneySignal(snapshot)'),'jornada usa sinais operacionais não causais');
const fenix=read('components/saude/AvatarCareReadiness.tsx'),avatar=read('components/saude/HealthAvatar3D.tsx');
ok(fenix.includes('<AvatarEvidenceBoundary')&&fenix.includes('Brain · {brief.posture}')&&fenix.includes('data-care-status={carePosture.tone}'),'Fênix explica tipo de evidência sem nova decisão');
ok(avatar.includes('DirectionalLight(0xb1dbd5, 1.28)')&&avatar.includes('toneMappingExposure=1.03'),'luz e exposição protegidas');
ok(avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')&&avatar.includes('iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .53, metalness: .01 })'),'olhos preservados');
ok(!avatar.includes('requestAnimationFrame(animate)'),'sem novo loop GPU');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const f of ['test-vault-m1-structural.cjs','test-p15-r9-r10-home-today-clinical-render.cjs','test-v229-course-prescription.cjs','test-v45-hoje-doses-contract.mjs','test-v49-today-v3-contract.mjs','test-v196-progressive-shell-avatar.cjs','test-p14-r4-structural-hierarchy-brain-avatar.cjs'])ok(gate.includes(f),'gate preserva '+f);
console.log(`VAULT M1: ${passed} verificações estruturais aprovadas.`);
