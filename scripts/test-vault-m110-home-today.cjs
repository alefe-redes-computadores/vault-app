#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const read = path => fs.readFileSync(path, 'utf8');
let checks = 0;
function ok(v, label) { assert.ok(v, `M110: ${label}`); console.log('✓', ++checks, label); }
function parsed(path) {
  const source = read(path);
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  ok(ast.parseDiagnostics.length === 0, `${path}: sem erros de sintaxe`);
  return source;
}
function loadPureTS(path) {
  const s = parsed(path);
  const code = ts.transpileModule(s, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const obj={exports:{}};
  new Function('module','exports',code)(obj,obj.exports);
  return obj.exports;
}
const date=loadPureTS('lib/home/format-clinical-date.ts').formatVaultClinicalDateBR;
ok(date('2026-10-09')==='09/10/2026','Data ISO de aquisicao aparece em formato BR');
ok(date('2026-10-09T00:00:00Z')==='09/10/2026','Exibicao independe de fuso horario');
ok(date('09/10/2026')==='09/10/2026' && date('2026-02-31')==='2026-02-31','Nao reinterpreta data BR nem corrige dados invalidos');
const agenda=loadPureTS('lib/today/agenda-overview.ts');
const sample=agenda.buildTodayAgendaOverview({now:'12:00',doses:[{horario:'10:00',tomada:false,ignorada:false,medicamentoNome:'Metadona',formato:'partido',cores:['#FFFFFF','#222222']},{horario:'22:00',tomada:false,ignorada:false,medicamentoNome:'Donaren',formato:'capsula',cores:['#EF4444']}],reminders:[{id:'r',time:'15:00',title:'Hidratação'}],appointments:[]});
ok(sample.rows.length===3&&sample.rows[0].time==='10:00'&&sample.rows[2].time==='22:00','Agenda permanece cronologica');
ok(sample.rows[0].formato==='partido'&&sample.rows[0].cores[0]==='#FFFFFF','Formato e cor de medicamento na agenda sem consulta paralela');
ok(sample.rows[1].kind==='reminder'&&sample.rows[1].formato===undefined,'Lembretes nao se apresentam como medicamentos');
ok(sample.dueDoseCount===1&&sample.nextUpcoming?.time==='15:00','Pendencias e proximo evento preservados');
const home=parsed('app/page.tsx'), today=parsed('app/hoje/page.tsx');
const metrics=parsed('components/home/HomeQuickMetrics.tsx');
ok(home.includes('completedDoses={dosesTomadasDaRotinaHoje}')&&metrics.includes('label: completedDoses === undefined ? "Remédios" : "Concluídas"'),'Contador Concluidas usa somente doses programadas confirmadas');
ok(metrics.includes('"/hoje?focus=doses&status=tomados"')&&metrics.includes('"/saude/medicamentos"'),'Navegacao nova sem quebrar consumidor antigo');
ok(metrics.includes('grid grid-cols-4')&&metrics.includes('key: "medicamentos"')&&metrics.includes('key: "extra"'),'Quatro indicadores e contratos existentes preservados');
ok(home.includes('formatVaultClinicalDateBR(primaryMedicationCareOpportunity.latestRenewalDate)'),'Data de aquisicao apenas formatada na UI');
ok(home.includes('HomeDailyHero')&&home.includes('HomeQuickMetrics')&&home.includes('getVaultTreatmentIcon'),'Ação agora e tratamentos coloridos preservados');
ok(home.includes('home-continuity-other')&&home.includes('medicationCareOpportunities.slice(1)'),'Fila secundária da M109 preservada');
const preview=parsed('components/hoje/TodayAgendaOverview.tsx');
ok(preview.includes('MedicationFormatIcon formato={item.formato} cores={item.cores}')&&preview.includes('onJumpDose(item.time)'),'Horario mostra iconografia real e passa hora correta');
ok(today.includes('onJumpDose={(time) =>')&&today.includes('status=pendentes&time=${encodeURIComponent(time)}'),'Horarios usam deep-link contextual de pendentes');
ok(today.includes('commandDoseStatus !== "tomados"')&&today.includes('setFiltroStatus(commandDoseStatus)'),'Deep link de tomadas ativa filtro diretamente');
ok(today.includes('Exibindo {filtroStatus === "tomados"')&&today.includes('onClick={limparFiltros}'),'Filtro contextual visível e reversivel');
ok(today.indexOf('<TodayAgendaOverview')<today.indexOf('<TodayActionCenter')&&today.indexOf('<TodayActionCenter')<today.indexOf('id="hoje-doses"'),'Brain depois da atenção e antes das doses, sem perder autoridade');
ok(today.includes('visibleTimelineItems(dosesFiltradas')&&today.includes('summarizeTimeline(doses)')&&today.includes('DoseScheduleGroups items={grupo.items}'),'Projeções e agrupamento canônicos preservados');
const treatment=parsed('app/saude/tratamentos/detalhes/page.tsx');
ok(treatment.includes('bg-sky-400/10 text-sky-300')&&treatment.includes('bg-rose-400/10 text-rose-300')&&treatment.includes('bg-emerald-400/10 text-emerald-400'),'Rede de apoio diferencia medico, hospital e local');
ok(treatment.includes('loadTreatmentDetailRelations')&&treatment.includes('possibleMedications.map(')&&treatment.includes('tratamento_id=${encodeURIComponent(id)}'),'Vinculos clinicos e revisao manual de possiveis medicamentos preservados');
const tile=parsed('components/home/HomeClinicalAreaTile.tsx');
const command=parsed('components/home/HomeCommandCenter.tsx');
const care=parsed('components/home/HomeCareOrganizationTiles.tsx');
ok(tile.includes('min-h-[84px]')&&tile.includes('onNavigate(path)')&&tile.includes('${tone}'),'Area clicavel e cor especifica por modulo');
ok(command.includes('id="home-outras-areas" title=') && !command.includes('id="home-outras-areas" defaultOpen')&&command.includes('id="home-organizacao"')&&command.includes('networkTone="text-emerald-300/80"'),'Home preserva revelação da central e rede');
ok(care.includes('min-h-[56px]')&&care.includes('Compras de medicamentos')&&care.includes('Documentos de saúde'),'Acessos secundários mais compactos');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-vault-m110-home-today.cjs"'),'Contrato M110 incorporado ao gate completo');
console.log(`VAULT M110: ${checks} garantias de UI, segurança e retrocompatibilidade OK`);
