#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const assert=require("node:assert/strict");
const ts=require("typescript");
const Module=require("node:module");
const read=p=>fs.readFileSync(p,"utf8");
let checks=0;
const ok=(truth,why)=>{assert(truth,`P14 R5: ${why}`);checks++;};
const sources=[
"app/saude/medicamentos/page.tsx","app/saude/medicamentos/detalhes/page.tsx",
"components/saude/MedicationDecisionAuthority.tsx",
"components/saude/MedicationListRouteLabel.tsx","components/saude/HealthAvatar3D.tsx",
"lib/health-intelligence/medication-owner-events.ts","lib/medication-intelligence/controlled-filter.ts",
"lib/health-intelligence/medication-decision-authority.ts","lib/health-intelligence/avatar-decision-brief.ts"
];
for(const file of sources){const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(parsed.parseDiagnostics.length===0,"TS/TSX válido: "+file);}
function load(path){const m=new Module(path,module);m._compile(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);return m.exports;}
const meds=read(sources[0]),detail=read(sources[1]),avatar=read(sources[4]);
const owner=load(sources[5]).ownedMedicationRenewals;
const controlled=load(sources[6]).hasConfirmedControlledRegime;
const authority=load(sources[7]).medicationDecisionNotice;
const brief=load(sources[8]).buildAvatarDecisionBrief;
const medication={id:"same",user_id:"account-A",person_id:"person-A"};
const r=(id,user,person)=>({id,medicamento_id:"same",user_id:user,person_id:person});
ok(owner([r("a","account-A","person-A"),r("b","account-A","person-B"),r("c","account-B","person-A"),r("d","account-A",undefined)],medication).map(x=>x.id).join(",")==="a","receitas isoladas por conta + pessoa");
ok(owner([r("a","account-A","person-A")],{...medication,person_id:undefined}).length===0,"pessoa ausente falha fechado");
ok(!controlled({verified:true,tone:"neutral"}),"receita comum verificada não é controlada");
for(const tone of ["red","yellow","black"])ok(controlled({verified:true,tone}),"regime de controle verificado: "+tone);
ok(!controlled({verified:false,tone:"red"}),"regime manual não vira classificação confirmada");
ok(!controlled(null)&&!controlled(undefined),"catálogo ausente não presume controle");
for(const stage of ["withdrawal_overdue","withdrawal_planned","prescription_needed","acquisition_needed","acquisition_planned","stock_review"]){ok(Boolean(authority(stage)),"decisão explicável: "+stage);}
ok(authority("stable")===null,"sem alerta redundante no estado estável");
ok(authority("withdrawal_planned").meaning.includes("confirmada"),"retirada futura não vira estoque");
ok(authority("acquisition_planned").meaning.includes("não conta"),"aquisição futura não vira gasto");
ok(meds.includes("indexScheduledWithdrawalsByOwner(retiradas)"),"índice de retiradas com conta e pessoa");
ok(!meds.includes("indexScheduledWithdrawals(retiradas)"),"índice antigo não usado na listagem clínica");
ok(meds.includes('scheduledWithdrawals.get(medicationWithdrawalKey(item.med) ?? "")'),"decisão de cuidado usa chave do proprietário");
ok(meds.includes('scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "")'),"ação de retirada também usa chave do proprietário");
ok(meds.includes("ownedMedicationRenewals(renewalsByMedication.get(id) ?? [], item.med)"),"receitas da listagem isoladas antes de decisão");
ok(meds.includes("hasConfirmedControlledRegime(regulatoryProfile)"),"filtro Controlados não usa só verified");
ok(meds.includes('"continuos","temporarios","sos"'),"preferência Por período restaurada corretamente");
ok(meds.includes('supplyRoute?.mode === "hybrid"')&&meds.includes('supplyRoute?.mode === "private"')&&meds.includes('supplyRoute?.mode === "public"'),"origem SUS/privado/híbrido reconhecida sem conversão");
ok(meds.includes("<MedicationListRouteLabel route={supplyRoute}"),"label de origem modularizado");
ok(meds.includes('label={supplyRoute.labels.join(" + ")}')&&read(sources[3]).includes("{label}"),"V271: origem canônica permanece visível sem duplicar cálculo");
ok(read(sources[3]).includes("Origem registrada")&&read(sources[3]).includes('route.mode === "none"'),"origem histórica não promete fornecimento");
ok(meds.includes('density="compact"')&&meds.includes('navigationLabel={`Ver detalhes de ${med.nome}`}'),"cards compactos acessíveis");
ok(meds.includes('VAULT_V318_OPERATIONAL_STRIP')&&meds.includes('humanizeStockText(textoEstoquePrincipal)'),"rotina e estoque continuam do estado real");
ok(meds.includes('router.push(careAction.href)')&&meds.includes('setQuickDoseMedId(med.id!)'),"ações existentes preservadas");
ok(detail.indexOf('id="medicamento-rotina"') < detail.indexOf('<ClinicalDisclosure id="medicamento-jornada"'),"rotina antes de jornada secundária");
ok(detail.indexOf('ESTOQUE') < detail.indexOf('<ClinicalDisclosure id="medicamento-fornecimento"'),"estoque antes de fornecimento secundário");
ok(detail.includes('<ClinicalDisclosure id="medicamento-lembretes"')&&detail.includes('activePersonId === med.person_id'),"lembretes mantêm escopo da pessoa");
ok(detail.includes('<MedicationJourneySummary snapshot={journeySnapshot}'),"jornada mantém resumo de eventos da autoridade original");
ok(detail.includes('<MedicationDecisionAuthority stage={careDecision.stage} />'),"decisão exibe autoridade sem segunda lógica");
ok(detail.includes('navigateCareAction(brainCareAction?.href || careDecision.actionHref'),"Brain mantém ação canônica");
ok(detail.includes('V332_CARE_EVIDENCE_DISCLOSURE')&&detail.includes('(brainCareAction?.evidence || careDecision.evidence).slice(0,3).map('),"evidências completas continuam disponíveis");
ok(detail.includes('DoseScheduleGroups')===false || detail.includes('QuickDoseModal'),"registro de dose não substituído");
ok(detail.includes('<QuickDoseModal')&&detail.includes('MedicationAlertPreferences'),"dose rápida e alertas permanecem");
ok(authority("withdrawal_overdue").meaning.includes("não comprova recebimento"),"retirada vencida não é recebimento");
const projected=brief({evidenceKind:"projected",reason:"Verificar continuidade"});
ok(projected.explanation.includes("Projeção não confirma realização"),"Brain não confunde futuro com fato");
const association=brief({evidenceKind:"association",reason:"Sintomas nos mesmos dias"});
ok(association.explanation.includes("não demonstra causa"),"Fênix rejeita causalidade não comprovada");
ok(brief({overdueWithdrawals:2,missingDocuments:3}).explanation.includes("3 documento"),"Brain preserva pendências simultâneas");
ok(avatar.includes("P14 R5: esclerótica menos brilhante")&&avatar.includes("roughness: .81")&&avatar.includes("roughness: .53"),"Avatar refina olhos sem malhas extras");
for(const token of ["P14 R4: menos brilho artificial","P14 R3: iluminação do palco menos neon","P14 R2: ponta nasal menos esférica","expressionEyeScaleY","expressionLidScaleY","expressionHighlightScale","avatarAdaptiveRatio(","renderer.forceContextLoss()"])ok(avatar.includes(token),"proteção anterior Avatar "+token);
ok(!avatar.includes("requestAnimationFrame(function")&&!avatar.includes("requestAnimationFrame(animate)"),"sem animação WebGL contínua");
const journey=read('components/saude/MedicationJourneySummary.tsx');
ok(journey.includes('Eventos e datas')&&journey.includes('Entenda os eventos e o estoque'),"jornada sem título duplicado e explicação sob demanda");
ok(journey.includes('Receita, aquisição e retirada são eventos independentes')&&journey.includes('journeyHeadline(snapshot)'),"histórico preserva semântica de eventos");
const gate=read('scripts/test-v63-release-gate.mjs');
for(const test of ["test-p14-r5-medication-scope-regulatory-ux.cjs","test-p14-r4-structural-hierarchy-brain-avatar.cjs","test-p14-r3-home-today-brain-avatar.cjs","test-p14-r2-medication-ux-avatar-brain.cjs","test-p13-device-cert.cjs"])ok(gate.includes(test),"release gate preserva "+test);
console.log(`P14 R5: ${checks} contratos aprovados.`);
