#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
function ok(test,msg){assert(test,'P15 R9 R8: '+msg);console.log(`✓ ${++n}: ${msg}`)}
function pure(path){const mod=new Module(path,module);mod._compile(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);return mod.exports}
const files=['app/page.tsx','app/hoje/page.tsx','app/saude/medicamentos/detalhes/page.tsx','components/saude/AvatarCareReadiness.tsx','components/saude/HealthAvatar3D.tsx','lib/home/appointment-metrics.ts','lib/today/timeline-visibility-metrics.ts','components/saude/MedicationDecisionEvidenceContext.tsx'];
for(const file of files){const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(parsed.parseDiagnostics.length===0,'TS/TSX sintaticamente válido: '+file)}
const appointment=pure(files[5]).countHomeTodayAppointments;
ok(appointment({consultations:[1,2],exams:[1],surgeries:[],withdrawals:[1,2,3]})===6,'agenda soma quatro autoridades sem duplicar');
ok(appointment({consultations:[],exams:[],surgeries:[],withdrawals:[]})===0,'agenda vazia não inventa compromisso');
const visibility=pure(files[6]).countHiddenTodayResolved;
const doses=[{tomada:true,ignorada:false},{tomada:false,ignorada:true},{tomada:false,ignorada:false},{tomada:false,ignorada:false,isDataConflict:true},{tomada:false,ignorada:false}];
ok(visibility(doses,{isToday:true,status:'todos',showResolved:false})===3,'Hoje recolhe tomada, ignorada e conflito apenas');
ok(visibility(doses,{isToday:true,status:'todos',showResolved:true})===0,'mostrar concluídas zera itens ocultos');
ok(visibility(doses,{isToday:false,status:'todos',showResolved:false})===0,'histórico não oculta eventos');
ok(visibility(doses,{isToday:true,status:'pendentes',showResolved:false})===0,'filtro explícito preservado');
ok(doses.length===5,'lista de doses original não mutada');
const home=read(files[0]),today=read(files[1]),details=read(files[2]),fenix=read(files[3]),avatar=read(files[4]);
ok(home.includes('countHomeTodayAppointments({') && home.includes('appointments={totalCompromissosHoje}') ,'Home reutiliza contagem sem alterar autoridade dos cards');
ok(home.includes('medicamentosById.get(retirada.medicamento_id)')&&home.includes('HomeDailyHero'),'Home mantém V196 e hero');
ok(today.includes('countHiddenTodayResolved(dosesFiltradas,') && today.includes('visibleTimelineItems(dosesFiltradas'),'Hoje reusa timeline e métrica com mesma coleção');
ok(today.includes('const concluidasOcultas')&&today.includes('filtroStatus !== "todos"')&&today.includes('DoseScheduleGroups'),'filtros e lista de doses antigos preservados');
ok(details.includes('<MedicationDecisionEvidenceContext')&&details.includes('V332_CARE_EVIDENCE_DISCLOSURE'),'Detalhes mostram autoridade junto da evidência histórica');
ok(details.includes('source={brainCareAction ? "brain" : "record"}')&&details.includes('evidenceCount={(brainCareAction?.evidence || careDecision.evidence).length}'),'Origem de prioridade e evidências conservadas');
ok(details.includes('navigateCareAction(brainCareAction?.href || careDecision.actionHref'),'ação real permanece na autoridade original');
const hint=read(files[7]);
ok(hint.includes('não comprova retirada, compra concluída nem validade da receita'),'rota não certifica recebimento nem receita');
ok(hint.includes('Nenhuma evidência detalhada')&&hint.includes('Prioridade sugerida pelo Brain'),'sem evidência não vira comprovação');
ok(fenix.includes('Brain · {brief.posture}')&&fenix.includes('data-care-status={carePosture.tone}')&&fenix.includes('inline-flex max-w-full'),'Fênix destaca postura sem nova autoridade');
ok(avatar.includes('DirectionalLight(0xb1dbd5, 1.28)')&&avatar.includes('toneMappingExposure=1.03'),'P14 R4: luz e exposição inalteradas');
ok(avatar.includes('eyeWhite: new THREE.MeshStandardMaterial({ color: "#cdd7d3", roughness: .81 })')&&avatar.includes('iris: new THREE.MeshStandardMaterial({ color: "#5b3824", roughness: .53, metalness: .01 })'),'olhos P14 R5 preservados');
ok(avatar.includes('roughness: .88')&&avatar.includes('bottomColor, roughness: .86')&&!avatar.includes('requestAnimationFrame(animate)'),'Fênix mais fosca sem novo loop WebGL');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const required of ['test-p15-r9-r8-appointment-visibility-evidence.cjs','test-p15-r9-r7-owner-timeline-ux.cjs','test-p15-r9-r6-modularity-brain-avatar.cjs','test-home-today-v9-contract.mjs','test-v196-progressive-shell-avatar.cjs','test-p14-r4-structural-hierarchy-brain-avatar.cjs','test-v253-brain-readiness-calibration-avatar.cjs'])ok(gate.includes(required),'gate preserva '+required);
console.log('VAULT P15 R9 R8:',n,'contratos aprovados');
