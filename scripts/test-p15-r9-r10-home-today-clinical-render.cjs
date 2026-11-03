#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
function ok(condition,msg){assert(condition,'P15 R9 R10: '+msg);console.log(`✓ ${++n}: ${msg}`)}
function pure(file){const compiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m=new Module(file,module);m._compile(compiled,file);return m.exports}
const files=['app/page.tsx','app/hoje/page.tsx','components/home/HomeDailyHero.tsx','components/saude/MedicationDecisionEvidenceContext.tsx','components/saude/AvatarCareReadiness.tsx','components/saude/HealthAvatar3D.tsx','scripts/test-v63-release-gate.mjs','components/home/HomeAgendaBreakdown.tsx','components/hoje/TodayTimelineGroupPresentation.ts','lib/home/routine-summary-note.ts','lib/health-intelligence/medication-evidence-clarity.ts'];
for(const file of files){const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(ast.parseDiagnostics.length===0,'TS/TSX sintaticamente válido: '+file)}
const note=pure(files[9]).homeRoutineSummaryNote;
ok(/não indica rotina cumprida/.test(note(0,0)),'0/0 não indica rotina concluída');
ok(/Nenhuma tomada/.test(note(4,0)),'Sem confirmação não inventa tomada');
ok(/2 doses programadas/.test(note(3,1)),'Progresso parcial preserva pendentes');
ok(/Todas as doses/.test(note(4,4)),'Conclusão registrada exige contagem completa');
ok(/Todas as doses/.test(note(4,40)),'Tomadas extras não extrapolam o denominador');
ok(/não indica rotina cumprida/.test(note(NaN,Infinity)),'Não finitos não viram sucesso');
const clarity=pure(files[10]).medicationEvidenceClarity;
ok(clarity('brain',0,true).label==='Dados a conferir','Sem evidência não vira alta confiança');
ok(/não demonstra falha clínica/.test(clarity('record',NaN,false).explanation),'Dados inválidos não viram diagnóstico');
ok(clarity('brain',2,true).label==='Contexto do Brain','Fonte do Brain identificada');
ok(clarity('record',2,true).label==='Etapa do registro','Fonte do registro independente');
ok(/não confirmação de fornecimento/.test(clarity('brain',3,true).explanation),'Origem não comprova retirada');
ok(/precisa de confirmação/.test(clarity('brain',3,false).explanation),'Sem rota não inventa origem');
const home=read(files[0]),today=read(files[1]),hero=read(files[2]),evidence=read(files[3]),fenix=read(files[4]),avatar=read(files[5]),gate=read(files[6]),agenda=read(files[7]),groups=read(files[8]);
ok(home.includes('<HomeAgendaBreakdown consultations={consultasHoje.length}')&&home.includes('withdrawals={retiradasHoje.length}'),'Home reusa agenda existente');
ok(home.includes('appointments={totalCompromissosHoje}')&&home.includes('countHomeTodayAppointments({'),'Contagem canônica R8 preservada');
ok(agenda.includes('if (valid.length === 0) return null')&&agenda.includes('Agenda de hoje'),'Agenda recolhida somente com dados');
ok(['/saude/consultas','/saude/exames','/saude/cirurgias','/saude/retiradas'].every(x=>agenda.includes(x)),'Quatro destinos originais da agenda');
ok(agenda.includes('onNavigate(item.href)')&&home.includes('trigger("vibrate"); router.push(href);'),'Haptics e roteador na Home');
ok(!/fetch\(|supabase|db\./.test(agenda)&&agenda.includes('motion-reduce:transition-none'),'Componente sem leituras remotas e acessível');
ok(hero.includes('homeRoutineSummaryNote(scheduled, safeCompleted)')&&hero.includes('safeProgress')&&hero.includes('safeCompleted'),'Hero separa nota da contagem');
ok(hero.includes('Rotina programada')&&hero.includes('role="progressbar"')&&hero.includes('Sem horários'),'Autoridade visual legada preservada');
ok(today.includes('const metadata = todayTimelineGroupPresentation')&&today.includes('todayTimelineGroupContext(metadata[key].sub, items.length)'),'Hoje modulariza metadados e preserva R9 R9');
const v45=read('scripts/test-v45-hoje-doses-contract.mjs'),v49=read('scripts/test-v49-today-v3-contract.mjs');
ok(v45.includes('TodayTimelineGroupPresentation.ts')&&v45.includes('groups.includes(`${key}: { label: "${label}"`)'),'V45 valida a fonte modular real de cada rótulo');
ok(v49.includes('TodayTimelineGroupPresentation.ts')&&v49.includes('groups.indexOf(')&&v49.includes('const metadata = todayTimelineGroupPresentation'),'V49 valida ordem modular e ligação ao agrupamento');
ok(today.includes('groupTimelineItems(dosesParaExibir')&&today.includes('summarizeTimeline(doses)'),'Grupos e métricas canônicos intactos');
ok(today.includes('todayTimelineGroupPresentation')&&groups.includes('Registros contraditórios não entram nas métricas'),'Conflitos V277 explícitos');
ok(today.includes('<TodayTimelineGuide isHoje={isHoje}') && groups.includes('Programadas para depois · ainda não estão atrasadas'),'V229: indicação das doses futuras permanece no Hoje e no módulo de grupos');
for(const key of ['agora','atrasadas','depois','avulsas','revisao','concluidas','ignoradas','manha','tarde','noite'])ok(groups.includes(key+': { label:'),'Grupo preservado '+key);
ok(today.includes('const metricItems = useMemo(() => doses.filter(')&&today.includes('visibleTimelineItems(dosesFiltradas'),'Memo P10 e visibilidade V9 mantidos');
ok(evidence.includes('medicationEvidenceClarity(source, safeCount, routeRecorded)')&&evidence.includes('{clarity.label}')&&evidence.includes('{clarity.explanation}'),'Origem da evidência explicável');
ok(evidence.includes('medicationStageGuidance(stage)')&&evidence.includes('não comprova retirada, compra concluída nem validade da receita.'),'Segurança da receita e aquisição preservada');
ok(fenix.includes('Brain · {brief.posture}')&&fenix.includes('data-care-status={carePosture.tone}'),'Postura do Brain permanece');
ok(fenix.includes('${carePosture.label}`}')&&fenix.includes('aria-label={`Abrir contexto do Brain:'),'Postura acessível à leitura de tela');
ok(avatar.includes('DirectionalLight(0xb1dbd5, 1.28)')&&avatar.includes('toneMappingExposure=1.03'),'Luz P14 R4 intacta');
ok(avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')&&avatar.includes('iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .53, metalness: .01 })'),'Olhos P14 R5 intactos');
ok(avatar.includes('capShade: new THREE.MeshStandardMaterial({ color: new THREE.Color(appearance.hatColor).multiplyScalar(.58), roughness: .92 })')&&!avatar.includes('requestAnimationFrame(animate)'),'Material reutilizado sem loop WebGL');
for(const test of ['test-p15-r9-r10-home-today-clinical-render.cjs','test-p15-r9-r9-care-home-today-avatar.cjs','test-p15-r9-r8-appointment-visibility-evidence.cjs','test-p15-r9-r7-owner-timeline-ux.cjs','test-p15-r9-r6-modularity-brain-avatar.cjs','test-home-today-v9-contract.mjs','test-v196-progressive-shell-avatar.cjs','test-p14-r4-structural-hierarchy-brain-avatar.cjs','test-v253-brain-readiness-calibration-avatar.cjs','test-v332-operational-ux.cjs','test-v277-dose-slot-notification-authority.cjs'])ok(gate.includes(test),'Gate mantém '+test);
console.log(`VAULT P15 R9 R10: ${n} contratos aprovados`);
