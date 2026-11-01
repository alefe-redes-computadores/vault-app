#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
function ok(condition,description){assert(condition,'R9 R9: '+description);console.log('✓ '+(++checks)+': '+description)}
function pure(file){const mod=new Module(file,module);mod._compile(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports}
const names=['app/page.tsx','app/hoje/page.tsx','app/saude/medicamentos/detalhes/page.tsx',
 'components/saude/MedicationDecisionEvidenceContext.tsx','components/saude/AvatarCareReadiness.tsx','components/saude/HealthAvatar3D.tsx',
 'lib/home/appointment-day-selection.ts','lib/today/timeline-group-context.ts','lib/health-intelligence/medication-stage-guidance.ts'];
for(const file of names){const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(!parsed.parseDiagnostics.length,'Parser '+file)}
const appointment=pure(names[6]).selectHomeDayEvents;
const rows=[{id:'a',data:'2026-11-01',status:'agendada'},{id:'b',data:'2026-11-01',status:'cancelada'},
{id:'c',data:'2026-11-02',status:'agendada'},{id:'d',data:'2026-11-01',status:'realizada'}];
const original=rows.slice();
ok(appointment(rows,'2026-11-01',true).map(x=>x.id).join(',')==='a','Agenda agendada sem canceladas/realizadas');
ok(appointment(rows,'2026-11-01',false).map(x=>x.id).join(',')==='a,b,d','Exames do dia mantêm a regra legada sem filtro de status');
ok(appointment(rows,'2026-11-02',true).map(x=>x.id).join(',')==='c','Datas distintas não misturadas');
ok(rows.every((r,i)=>r===original[i]),'Filtros não mutam o histórico');
ok(appointment([], '2026-11-01',true).length===0,'Agenda vazia não inventa compromissos');
const ctx=pure(names[7]).todayTimelineGroupContext;
ok(ctx('Doses',1)==='Doses · 1 registro','Grupo singular acessível');
ok(ctx('Revisão',2)==='Revisão · 2 registros','Grupo plural acessível');
ok(ctx('Revisão',NaN)==='Revisão' && ctx('Revisão',0)==='Revisão','Valor inválido não vira contagem falsa');
ok(ctx('Mês',3).includes('3 registros'),'Legenda conserva fonte sem adesão presumida');
const guidance=pure(names[8]).medicationStageGuidance;
ok(/não comprova recebimento/.test(guidance('withdrawal_overdue')),'Retirada vencida não significa dispensação');
ok(/não representa medicamento já recebido/.test(guidance('withdrawal_planned')),'Retirada futura não vira estoque');
ok(/não representa compra concluída/.test(guidance('acquisition_planned')),'Compra futura não vira realizada');
ok(/não uma compra realizada/.test(guidance('acquisition_needed')),'Falta de compra não inventa aquisição');
ok(/validade automaticamente/.test(guidance('prescription_needed')),'Receita pendente não vira válida');
ok(/revisão/.test(guidance('stock_review')),'Estoque desconhecido mantém cautela');
ok(guidance('stable')===null && guidance('unknown')===null,'Estabilidade não cria novo alerta');
const [home,today,details,evidence,avatar,mesh]=names.map(read);
ok(home.includes('selectHomeDayEvents(consultas, hoje, true)')&&home.includes('selectHomeDayEvents(exames, hoje, false)')&&home.includes('selectHomeDayEvents(cirurgias, hoje, true)'),'Home delega seleção sem novo hook');
ok(home.includes('countHomeTodayAppointments({')&&home.includes('appointments={totalCompromissosHoje}'),'Home preserva contagem R8');
ok(home.includes('medicationsForOwner(medicamentosTodas, activePersonId, user?.id)')&&home.includes('medicamentosById.get(retirada.medicamento_id)'),'Home conserva proprietário e índice V196');
ok(today.includes('todayTimelineGroupContext(metadata[key].sub, items.length)')&&today.includes('groupTimelineItems(dosesParaExibir'),'Hoje mantém grupos canônicos');
ok(today.includes('Registros contraditórios não entram nas métricas'),'Conflitos V277 preservados');
ok(today.includes('const metricItems = useMemo(() => doses.filter(')&&today.includes('summarizeTimeline(doses)'),'Métrica P10 não perdeu o memo');
ok(today.includes('visibleTimelineItems(dosesFiltradas')&&today.includes('countHiddenTodayResolved(dosesFiltradas'),'Visibilidade e contagem R8 mantidas');
ok(details.includes('stage={careDecision.stage}')&&details.includes('V332_CARE_EVIDENCE_DISCLOSURE'),'Detalhes passam estágio canônico ao aviso');
ok(details.includes('navigateCareAction(brainCareAction?.href || careDecision.actionHref'),'Ação original permanece única');
ok(details.includes('Origem: {supplyRoute.labels.join(" + ")}')&&details.includes('Ver evidências e origem'),'Origem V271 e evidências V332 intactas');
ok(evidence.includes('medicationStageGuidance(stage)')&&evidence.includes('Number.isSafeInteger(evidenceCount)'),'Contexto expõe só contagem segura');
ok(evidence.includes('não comprova retirada, compra concluída nem validade da receita.')&&evidence.includes('Nenhuma evidência detalhada'),'Cautela R8 permanece literal');
ok(avatar.includes('Brain · {brief.posture}')&&avatar.includes('data-care-status={carePosture.tone}'),'Fênix mantém Brain e postura');
ok(avatar.includes('line-clamp-3 sm:line-clamp-2')&&avatar.includes('title={brief.explanation}'),'Explicação melhor acessível no celular');
ok(mesh.includes('cap: new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: .87 })'),'Boné refinado no material existente');
ok(mesh.includes('DirectionalLight(0xb1dbd5, 1.28)')&&mesh.includes('toneMappingExposure=1.03'),'P14 R4 mantém luz e exposição');
ok(mesh.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')&&mesh.includes('iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .53, metalness: .01 })'),'P14 R5 mantém olhos');
ok(!mesh.includes('requestAnimationFrame(animate)'),'Nenhum loop GPU novo');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const required of ['test-p15-r9-r9-care-home-today-avatar.cjs','test-p15-r9-r8-appointment-visibility-evidence.cjs','test-p15-r9-r7-owner-timeline-ux.cjs','test-p15-r9-r6-modularity-brain-avatar.cjs','test-home-today-v9-contract.mjs','test-v196-progressive-shell-avatar.cjs','test-p14-r4-structural-hierarchy-brain-avatar.cjs','test-v253-brain-readiness-calibration-avatar.cjs']) ok(gate.includes(required),'Gate conserva '+required);
console.log('VAULT P15 R9 R9:',checks,'contratos aprovados');
