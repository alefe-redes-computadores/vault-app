#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const read = p => fs.readFileSync(p,"utf8");
let count = 0;
const check = (ok,message) => {assert(ok,`P14 R3: ${message}`);count++;console.log(`✓ P14 R3 ${count}: ${message}`);};
const files = [
  "app/page.tsx", "app/hoje/page.tsx", "components/home/HomeDailyHero.tsx",
  "components/hoje/TodayRoutinePulse.tsx", "components/home/HomeQuickMetrics.tsx",
  "components/hoje/TodayActionCenter.tsx", "components/saude/AvatarCareReadiness.tsx",
  "components/saude/HealthAvatar3D.tsx", "lib/health-intelligence/avatar-decision-brief.ts",
];
for (const path of files) {
  const tree = ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(tree.parseDiagnostics.length===0,`parse TS/TSX ${path}`);
}
const home=read(files[0]),today=read(files[1]),hero=read(files[2]),pulse=read(files[3]),metrics=read(files[4]),todayAction=read(files[5]),readiness=read(files[6]),avatar=read(files[7]),briefSrc=read(files[8]);
check(home.includes('import { HomeDailyHero }')&&home.includes('<HomeDailyHero eyebrow={resumoContextual.eyebrow}'),'Home usa componente extraído em vez de render duplicado');
for (const field of ['title={resumoContextual.title}','description={resumoContextual.description}','completed={dosesTomadasDaRotinaHoje}','scheduled={totalDosesPlanejadasHoje}','progress={progressoDosesHoje}']) check(home.includes(field),'Home preserva origem canônica '+field);
check(hero.includes('role="progressbar"')&&hero.includes('safeProgress')&&hero.includes('onOpen')&&hero.includes('Rotina programada'),'hero só apresenta progresso e navega');
check(home.includes('<HomeQuickMetrics')&&home.includes('pendingDoses={dosesPendentesAtrasadas.length}')&&home.includes('extrasTaken={Math.max(0, dosesTomadasHoje - dosesTomadasDaRotinaHoje)}'),'métricas e SOS permanecem intactos');
check(metrics.includes('onOpenPending')&&metrics.includes('min-h-[58px]'),'atalho dose continua acessível');
check(today.includes('import { TodayRoutinePulse }')&&today.includes('<TodayRoutinePulse isHoje={isHoje}'),'Hoje separa visualização das métricas');
for (const field of ['pending={totalPendentes}','unconfirmed={totalEsperadasSemConfirmacao}','completed={totalTomadas}','ignored={totalIgnoradas}','recorded={totalRegistros}','projected={totalItensPlanejados}','percentage={percentualConclusao}']) check(today.includes(field),'Hoje usa autoridade existente '+field);
check(pulse.includes('Previsão e registro não são a mesma autoridade clínica')&&pulse.includes('!isFuturo && recorded > 0')&&pulse.includes('Math.min(100, percentage)'),'projeções não viram adesão registrada');
check(today.includes('Navegar por data')&&today.includes('navegarData(')&&today.includes('voltarParaHoje'),'navegação temporal e histórico mantidos');
check(today.includes('>Todas</button>')&&today.includes('Período {filtroPeriodo !== "todos"')&&today.includes('DoseScheduleGroups'),'filtros e agrupamento de doses preservados');
check(today.includes('dosesElegiveisLote')&&today.includes('dosesComEstoqueNoLote')&&today.includes('retroReviewMode'),'lote e revisão retroativa continuam');
check(today.includes('id="hoje-mes"')&&today.includes('id="hoje-diario"'),'mes e diario preservados sem perda de ancora');
check(today.lastIndexOf('<DoseScheduleGroups')<today.indexOf('id="hoje-mes"')&&today.indexOf('id="hoje-mes"')<today.indexOf('Versículo do dia'),'mês abaixo da lista de doses');
check(today.lastIndexOf('<DoseScheduleGroups')<today.indexOf('id="hoje-diario"')&&today.indexOf('id="hoje-diario"')<today.indexOf('Versículo do dia'),'diário abaixo da lista de doses');
check(today.includes('DoseMonthOverview')&&today.includes('Registrar humor')&&today.includes('Registrar sintoma'),'navegação e registro sob demanda intactos');
check(todayAction.includes('CareCommandStrip command={command}')&&todayAction.includes('pendingDoses > 0'),'decisão do Brain e alerta de doses permanecem no topo');
const m=new Module('lib/health-intelligence/avatar-decision-brief.ts',module);
m._compile(ts.transpileModule(briefSrc,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'lib/health-intelligence/avatar-decision-brief.ts');
const build=m.exports.buildAvatarDecisionBrief;
for(const [lane,expected] of [['now','revisar agora'],['prepare','preparar'],['discuss','levar à consulta'],['observe','acompanhar']]) check(build({lane}).posture===expected,`Fênix usa postura canônica ${lane}`);
check(build({evidenceKind:'projected'}).authority==='Projeção, não confirmação','previsão distinta de fato');
check(build({evidenceKind:'association'}).authority==='Associação temporal, não causal','sem causalidade inventada');
const two=build({overdueWithdrawals:2,missingDocuments:3});
check(two.explanation.includes('2 retirada')&&two.explanation.includes('3 documento'),'nenhuma pendência simultânea oculta');
check(build({reason:'x'.repeat(1000)}).explanation.length<=370,'briefing limitado em comprimento');
check(readiness.includes('Brain · {brief.posture}')&&readiness.includes('planFocus.priorityScore')&&readiness.includes('authorityLabel ?? brief.authority'),'Avatar exibe postura sem substituir autoridade');
check(avatar.includes('P14 R3: iluminação do palco menos neon')&&avatar.includes('roughness: .86')&&avatar.includes('roughness: .90')&&avatar.includes('roughness: .46, metalness: .24'),'Avatar materiais reaproveitados sem nova geometria');
for(const v of ['P14: crânio e mandíbula','P14 R2: ponta nasal menos esférica','expressionEyeScaleY','expressionLidScaleY','expressionHighlightScale','renderer.forceContextLoss()','avatarAdaptiveRatio(']) check(avatar.includes(v),'Avatar mantém preservação '+v);
check(!avatar.includes('requestAnimationFrame(function')&&!avatar.includes('requestAnimationFrame(animate)'),'sem loop GPU permanente');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const v of ['test-p14-r3-home-today-brain-avatar.cjs','test-p14-r2-medication-ux-avatar-brain.cjs','test-p14-focus-hierarchy-brain-avatar.cjs','test-p13-device-cert.cjs']) check(gate.includes(v),'release gate mantém '+v);
console.log(`VAULT P14 R3: ${count} contratos aprovados`);
