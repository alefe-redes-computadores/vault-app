#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const r = p => fs.readFileSync(p,"utf8");
let passes = 0;
const ok=(truth,label)=>{assert.ok(truth,"UI360 R2: "+label);console.log("OK "+(++passes)+": "+label);};
const files=[
 "components/home/HomeActionNowCardP7R3.tsx","components/home/HomeAttentionRail.tsx",
 "components/hoje/TodayAgendaOverview.tsx","components/hoje/TodayAppointmentCard.tsx",
 "components/hoje/TodayRemindersPanel.tsx","app/saude/medicamentos/page.tsx",
 "components/saude/MedicationPortfolioOverview.tsx","app/mais/page.tsx","app/ajuda/page.tsx",
 "hooks/useVisualDisclosureMemoryR2.ts"
];
for(const p of files){const src=r(p);const ast=ts.createSourceFile(p,src,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(ast.parseDiagnostics.length===0,'parse '+p);}
const home=r(files[0]),attention=r(files[1]),today=r(files[2]),appointment=r(files[3]),reminders=r(files[4]),med=r(files[5]),panorama=r(files[6]),more=r(files[7]),help=r(files[8]),memory=r(files[9]);
ok(home.includes('data-vault-ui360-r2-action') && home.includes('onClick={onAction}') && home.includes('Por que aparece?'),'Home preserva unica acao e justificativa');
ok(!home.includes('Conferir próximo passo') && !home.includes('Indicadores de rotina') && !home.includes('Ver agenda'),'Home nao reinstala botoes antigos');
ok(attention.includes('renderAlert(alert)')&&attention.includes('alerts.slice(0, 1)')&&attention.includes('onToggle'),'Atenção preserva alertas reais e revelacao');
ok(today.includes('previewRows=overview.rows.filter(item=>item.kind!=="appointment")') && today.includes('onOpenWithdrawals') && today.includes('onJumpDose(item.time)'),'Hoje nao duplica compromissos na previa e preserva destinos');
ok(today.includes('MedicationFormatIcon formato={item.formato} cores={item.cores}'),'Hoje preserva iconografia contextual');
ok(appointment.includes('onClick={onOpen}')&&appointment.includes('WithdrawalPreparationView')&&appointment.includes('presentTodayAppointment(item,today,dayLabel)'),'Compromisso usa dono/autoridade do caller');
ok(!appointment.includes('>Ver</span>')&&appointment.includes('ChevronRight'),'Compromisso sem badge Ver redundante');
ok(reminders.includes('reveal.showMore')&&reminders.includes('isSafeLocalActionHref')&&reminders.includes('onNavigate(reminder.target_route)'),'Lembretes reais e paginacao preservados');
ok(med.includes('data-vault-ui360-r2-med-evidence')&&med.includes('pointer-events-auto relative z-20')&&med.includes('<MedicationProvenanceLineM150P3')&&med.includes('latestManufacturer={latestManufacturer}')&&med.includes('declaredManufacturer={med.laboratorio_etiqueta}'),'Conforto fabricante visivel e proveniencia completa sob demanda');
ok(med.includes('data-vault-compact-medication-meta')&&med.includes('activeIngredient')&&med.includes('cardTreatments.length > 0'),'Compacto e tratamentos preservados');
ok(med.includes('data-vault-filter-sheet="r1"')&&med.includes('Limpar filtros')&&med.includes('MedicationFilterBar value={medicationFilter}'),'Todos filtros continuam na sheet');
ok(med.includes('setQuickDoseMedId(med.id!)') && med.includes('router.push(careAction.href)') && med.includes('MedicationRestockAction'),'Tomar/SOS, retirada e estoque permanecem distintos');
ok(med.includes('setSelectedRegulatory(regulatoryProfile)')&&med.includes('railSize="label"'),'Faixa regulatoria abre autoridade');
ok(panorama.includes('condensedInList')&&med.includes('condensedInList')&&panorama.includes('MedicationScopeReconciliation')&&panorama.includes('onNavigate(decision.href!)'),'Panorama nao duplica barra na lista mas preserva decisao e diferencas');
ok(more.includes('data-vault-remember-r2="preferences"')&&more.includes('data-vault-remember-r2="advanced"')&&more.includes('data-vault-remember-r2="updates"'),'Mais lembra acordeoes');
ok((more.match(/<OperationalReadinessM103/g)||[]).length===1&&more.indexOf('<OperationalReadinessM103')>more.indexOf('Ferramentas avançadas'),'Prontidao recolhida uma vez, ainda acessivel');
ok(more.includes('isDiagnosticOwner')&&more.includes('<VaultUpdateCenter />')&&more.includes('<ExportButton')&&more.includes('setShowClearDataModal(true)'),'Mais preserva diagnostico, update, exportacao, limpeza protegida');
ok(memory.includes('sessionStorage')&&memory.includes('userId')&&memory.includes('personId')&&!memory.includes('localStorage.clear'),'Memoria visual separada por usuario/pessoa sem limpeza');
ok(help.includes('searchHelpTopics(query)')&&help.includes('topicGroupsR4')&&help.includes('helpIconR1(topic)')&&help.includes('router.push(topic.destination)')&&help.includes('router.push(returnTo)'),'Ajuda guias, busca, icones e retornos preservados');
const gate=r('scripts/test-v63-release-gate.mjs');ok(gate.includes('const contracts = [')&&gate.includes('scripts/test-vault-m92-medication-premium-2.cjs'),'V63 canonico nao removido');
console.log('UI360_R2_VISUAL_CONTRACT_OK: '+passes);
