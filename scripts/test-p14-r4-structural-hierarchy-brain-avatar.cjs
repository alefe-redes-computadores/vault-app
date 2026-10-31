#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=(path)=>fs.readFileSync(path,'utf8');
let checked=0;
const ok=(condition,description)=>{assert(condition,`P14 R4: ${description}`);checked++;console.log(`✓ R4 ${checked}: ${description}`)};
const sources=[
  'app/page.tsx','app/hoje/page.tsx','components/home/HomeDailyHero.tsx',
  'components/home/HomeQuickMetrics.tsx','components/hoje/TodayRoutinePulse.tsx',
  'components/hoje/TodayDateNavigation.tsx','components/hoje/TodayBatchAction.tsx',
  'components/hoje/TodayUnscheduledRoutine.tsx','components/hoje/TodayActionCenter.tsx',
  'components/saude/HealthAvatar3D.tsx','components/saude/AvatarCareReadiness.tsx',
  'lib/health-intelligence/avatar-decision-brief.ts'
];
for(const path of sources){
  const tree=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(tree.parseDiagnostics.length===0,'TS/TSX sem erro sintático: '+path);
}
const home=read(sources[0]),today=read(sources[1]),hero=read(sources[2]);
const quick=read(sources[3]),navigation=read(sources[5]),batch=read(sources[6]),missing=read(sources[7]);
const avatar=read(sources[9]),readiness=read(sources[10]);
const brief=read(sources[11]);
const gate=read('scripts/test-v63-release-gate.mjs');
for(const x of ['<HomeDailyHero','<HomeQuickMetrics','pendingDoses={dosesPendentesAtrasadas.length}',
  'appointments={totalCompromissosHoje}','extrasTaken={Math.max(0, dosesTomadasHoje - dosesTomadasDaRotinaHoje)}']){
  ok(home.includes(x),'Home preserva autoridade de métricas '+x);
}
ok(hero.includes('Rotina programada')&&hero.includes('scheduled > 0')&&hero.includes('Sem horários'),'Home não confunde 0/0 com rotina cumprida');
ok(hero.includes('role="progressbar"')&&hero.includes('safeProgress')&&hero.includes('onOpen'),'Home mantém progresso e navegação acessíveis');
ok(quick.includes('opacity-70 hover:opacity-100')&&quick.includes('min-h-[58px]'),'Home reduz contraste de métricas zero sem remover atalhos');
ok(today.includes('import { TodayDateNavigation }')&&today.includes('<TodayDateNavigation'),'Hoje extrai a navegação de data');
for(const x of ['description={dataSelecionadaDescricao}','onPrevious={() => navegarData(-1)}',
 'onNext={() => navegarData(1)}','onToday={voltarParaHoje}'])ok(today.includes(x),'Navegação mantém autoridade anterior '+x);
ok(today.includes('label="Navegar por data"')&&navigation.includes('Dia anterior')&&navigation.includes('Próximo dia')&&navigation.includes('onToday'),'Navegação histórica e futura acessível');
ok(navigation.includes('Histórico: doses sem registro são projeções')&&navigation.includes('Planejamento futuro: doses previstas ainda não podem ser registradas'),'Futuro e passado não são tomados como doses confirmadas');
ok(today.includes('dosesElegiveisLote.length > 1')&&today.includes('<TodayBatchAction')&&today.includes('count={dosesElegiveisLote.length}'),'Lote usa elegibilidade existente');
ok(today.includes('onClick={() => void handleTomarTodos()}')&&today.includes('disabled={Boolean(processandoTodos || processandoDoseId)}'),'Lote usa handler e trava existentes');
ok(batch.includes('count < 2')&&batch.includes('SOS e futuras ficam de fora')&&batch.includes('onClick={onClick}'),'UI de lote não autoriza SOS nem futuras');
ok(today.includes('dosesComEstoqueNoLote')&&today.includes('dosesSemEstoqueNoLote')&&today.includes('retroReviewMode'),'Safeguards de estoque e revisão preservados');
ok(today.includes('medicamentosSemHorario.length > 0')&&today.includes('<TodayUnscheduledRoutine')&&today.includes('encodeURIComponent(medicationId)'),'Rotinas sem horário mantidas e URL codificada');
ok(missing.includes('não entram nas doses pendentes')&&missing.includes('onEdit(m.id!)'),'Falta de horário é cadastro e não adesão');
ok(today.includes('DoseScheduleGroups')&&today.includes('QuickDoseModal')&&today.includes('TodayActionCenter'),'Fila, modal de dose e priorização permanecem');
ok(today.includes('id="hoje-mes"')&&today.includes('id="hoje-diario"')&&today.includes('onClick={() => void handleTomarTodos()}'),'Âncoras e confirmação de lote permanecem');
ok(today.lastIndexOf('<DoseScheduleGroups')<today.indexOf('id="hoje-mes"')&&today.indexOf('id="hoje-mes"')<today.indexOf('Versículo do dia'),'Mês fica abaixo da fila de doses');
ok(today.lastIndexOf('<DoseScheduleGroups')<today.indexOf('id="hoje-diario"'),'Diário fica abaixo da fila de doses');
const m=new Module('lib/health-intelligence/avatar-decision-brief.ts',module);
m._compile(ts.transpileModule(brief,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'lib/health-intelligence/avatar-decision-brief.ts');
const build=m.exports.buildAvatarDecisionBrief;
ok(build({evidenceKind:'missing_data'}).title==='Conferir dados antes de concluir','Fênix não afirma ação registrada sem dados');
ok(build({lane:'now'}).posture==='revisar agora'&&build({lane:'prepare'}).posture==='preparar','Fênix respeita autoridade da decisão');
ok(build({evidenceKind:'association'}).authority==='Associação temporal, não causal','Associação não vira diagnóstico');
ok(build({evidenceKind:'projected'}).authority==='Projeção, não confirmação','Projeção não vira fato');
const simultaneous=build({reason:'A'.repeat(260),overdueWithdrawals:2,missingDocuments:3});
ok(simultaneous.explanation.includes('2 retirada')&&simultaneous.explanation.includes('3 documento'),'Ambas pendências visíveis mesmo com motivo longo');
ok(simultaneous.explanation.length<=370,'Resumo do Brain limitado a 370 caracteres');
ok(readiness.includes('Brain · {brief.posture}')&&readiness.includes('planFocus.priorityScore'),'Avatar usa sinal do Brain sem duplicar autoridade');
ok(avatar.includes('P14 R4: menos brilho artificial')&&avatar.includes('toneMappingExposure=1.03')&&avatar.includes('DirectionalLight(0xb1dbd5, 1.28)'),'Avatar ajusta a luz sem novas malhas');
for(const legacy of ['P14 R3: iluminação do palco menos neon','P14 R2: ponta nasal menos esférica','P14: crânio e mandíbula',
  'expressionEyeScaleY','expressionLidScaleY','expressionHighlightScale','avatarAdaptiveRatio(', 'renderer.forceContextLoss()']){
  ok(avatar.includes(legacy),'Avatar mantém segurança e aparência anterior '+legacy);
}
ok(!avatar.includes('requestAnimationFrame(function')&&!avatar.includes('requestAnimationFrame(animate)'),'Avatar permanece sem loop de GPU permanente');
for(const contract of ['test-p14-r4-structural-hierarchy-brain-avatar.cjs','test-p14-r3-home-today-brain-avatar.cjs',
  'test-p14-r2-medication-ux-avatar-brain.cjs','test-p14-focus-hierarchy-brain-avatar.cjs','test-p13-device-cert.cjs'])
  ok(gate.includes(contract),'Gate mantém '+contract);
console.log(`P14 R4: ${checked} contratos aprovados.`);
