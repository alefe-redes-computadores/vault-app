#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const ts = require('typescript');
let passed = 0;
const read = path => fs.readFileSync(path, 'utf8');
const ok = (condition, label) => { assert.ok(condition, `VAULT M2 R2: ${label}`); console.log(`✓ M2 ${++passed}: ${label}`); };
const pagePaths = [
  'app/page.tsx', 'app/hoje/page.tsx',
  'app/saude/medicamentos/page.tsx', 'app/saude/medicamentos/detalhes/page.tsx',
];
const purePaths = [
  'lib/home/home-view-projections.ts', 'lib/home/home-dashboard-alerts.ts',
  'lib/today/timeline-date-presentation.ts', 'lib/today/reminder-day-projection.ts',
  'lib/health-intelligence/medication-detail-presenters.ts',
];
for (const path of [...pagePaths, ...purePaths]) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  ok(ast.parseDiagnostics.length === 0, `AST sintatica ${path}`);
}
function load(file, mocks = {}) {
  const output = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }}).outputText;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = module.paths;
  m.require = name => name in mocks ? mocks[name] : require(name);
  m._compile(output, file);
  return m.exports;
}
const dateAdd = (s, n) => {
  const d = new Date(s+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0,10);
};
const dates = load(purePaths[2], {'@/lib/health-utils': { addDaysToLocalDate: dateAdd }});
const today = dates.describeTodayDate('2026-11-01', null);
ok(today.dataSelecionada === '2026-11-01' && today.isHoje && !today.isPassado && !today.isFuturo, 'sem data solicitada retorna hoje');
ok(today.dataSelecionadaLabel === 'Hoje' && today.dataSelecionadaDescricao === '01/11/2026', 'rotulos civis de hoje preservados');
ok(dates.describeTodayDate('2026-11-01','2026-10-31').dataSelecionadaLabel === 'Ontem', 'retrospectiva continua Ontem');
ok(dates.describeTodayDate('2026-11-01','2026-11-02').dataSelecionadaLabel === 'Amanhã', 'planejamento futuro continua Amanhã');
ok(dates.describeTodayDate('2026-11-01','sem-data').dataSelecionada === '2026-11-01', 'entrada invalida nao escapa da data base');
const reminder = load(purePaths[3], {'@/lib/health-reminders/domain': {
  reminderRunsOnWeekday: (freq, days, day) => freq === 'daily' || days.includes(day),
}}).projectRemindersForDay;
const reminderRows = [
  {id:'late', status:'active', frequency:'daily', weekdays:[], time:'21:00'},
  {id:'pause', status:'paused', frequency:'daily', weekdays:[], time:'01:00'},
  {id:'early', status:'active', frequency:'daily', weekdays:[], time:'08:00'},
  {id:'not-today',status:'active',frequency:'weekly',weekdays:[1],time:'07:00'},
];
const reminderIds=reminder(reminderRows,'2026-11-01').map(x=>x.id);
ok(JSON.stringify(reminderIds)===JSON.stringify(['early','late']), 'lembretes ativos, dia correto, ordenacao por horario');
ok(reminderRows[0].id==='late', 'origem dos lembretes nao e mutada');
const homeView=load(purePaths[0], {
  '@/lib/health-utils': { getDocumentAlerts: docs => docs },
  '@/lib/withdrawal-agenda': { isOverdueWithdrawal: (row, day)=>row.status==='agendada' && row.data<day },
});
ok(homeView.countHomeTakenDoseLogs([{tomado_em:'2026-11-01T09:00:00'}, {}, {tomado_em:null}])===1,'contagem usa evidencia tomada');
ok(homeView.selectHomeDocumentAlerts([{daysUntil:5},{daysUntil:-7},{daysUntil:6},{daysUntil:-8}], 'p').length===2, 'janela documental [-7,5] preservada');
ok(homeView.selectHomeDocumentAlerts([{daysUntil:1}],null).length===0,'sem pessoa nao projeta alertas documentais');
ok(homeView.selectHomeOverdueWithdrawals([{status:'agendada',data:'2026-10-31'}, {status:'realizada',data:'2026-10-29'}], '2026-11-01').length===1,'apenas retirada aberta vencida');
const homeAlerts = load(purePaths[1], {'@/lib/health-utils': {getDocumentAlerts:()=>[]}}).projectHomeDashboardAlerts;
const urgency = {alta:'urgente',media:'atencao',baixa:'ok'};
const rows=homeAlerts([
  {id:'i',tipo:'estoque',urgencia:'alta',titulo:'Estoque',mensagem:'Revisar',link:'/saude/medicamentos',dias:1}
], [
  {id:'a',title:'Minha receita',subtitle:'Expirou',level:'vencido',href:'/documentos',daysUntil:-1},
  {id:'b',title:'Documento',subtitle:'Revisar',level:'atencao',href:'/documentos',daysUntil:2},
], {getLevel: u=>urgency[u]||'ok',getIcon: k=>k,getColor: l=>l});
ok(rows.length===2 && rows[0].id==='i' && rows[1].id==='documento-b', 'alerta clinico + documento sem receita isolada');
ok(rows[0].href==='/saude/medicamentos' && rows[0].icon==='estoque', 'rotas e icones dos alertas conservados');
const detail = load(purePaths[4], {
  '@/lib/health-utils': { parseLocalDate: s=>new Date(s+'T12:00:00') },
});
ok(detail.formatQuantidade(1.5)==='1,5' && detail.formatQuantidade(2)==='2', 'quantidades decimais sem arredondamento incorreto');
ok(detail.getKnownDoseQuantity({quantidade:0})===null && detail.getKnownDoseQuantity({quantidade:0.5})===0.5, 'quantidade desconhecida nao significa zero ingerido');
const summary=detail.summarizeKnownQuantity([{quantidade:1},{quantidade:undefined}]);
ok(summary.complete===false && summary.knownCount===1 && summary.totalCount===2, 'historia com quantidade faltante permanece incompleta');
ok(detail.formatKnownQuantitySummary(summary)==='1*', 'marcador de incompletude preservado');
ok(detail.getDoseSortTimestamp({data:'2026-11-01',horario:'23:00'})>0, 'data e hora da dose continuam ordenaveis');
const home=read(pagePaths[0]),todayPage=read(pagePaths[1]),listing=read(pagePaths[2]),details=read(pagePaths[3]);
ok(details.includes('function formatMedicationDosageDisplay(') && details.includes('\"$1 mg\"'), 'formatador V70 mantém conversão de rótulo local no Detalhes');
ok(home.includes('projectHomeDashboardAlerts(healthInsights, documentInsights') && home.includes('buildHomePendingDoseProjection'), 'Home delega alertas mas conserva motor de doses');
ok(home.includes('retiradasAtrasadas.length') && home.includes('selectHomeOverdueWithdrawals'), 'Home preserva retirada vencida');
ok(todayPage.includes('describeTodayDate(hoje, requestedDate)') && todayPage.includes('projectRemindersForDay(healthReminders, dataSelecionada)'), 'Hoje delega data e lembretes');
ok(todayPage.includes('await marcarDose(') && todayPage.includes('<TodayRemindersPanel reminders={remindersDoDia}'), 'confirmacao e destinos de doses conservados');
ok(listing.includes('formatQuantidade } from "@/lib/health-intelligence/medication-detail-presenters"'), 'Listagem usa formatador comum');
ok(details.includes('formatKnownQuantitySummary') && details.includes('getDoseSortTimestamp'), 'Detalhes usa helpers extraidos');
ok(details.includes('VAULT_BUP_DOSAGE_DISPLAY_V70') && details.includes('function formatMedicationDosageDisplay('), 'Contrato V70 da bupropiona preservado no arquivo original');
ok(details.includes('formatDose={(dose)=>formatMedicationDosageDisplay(med.nome,dose)}'), 'V70 mantém formatador de dosagem efetivamente usado');
ok(home.includes('const documentInsights =') && home.includes('!activePersonId'), 'Contrato legado de guarda documental na Home');

for (const file of purePaths) ok(!/\b(fetch\(|\.put\(|\.add\(|\.delete\(|requestAnimationFrame|useEffect|useLiveQuery|supabase\b|\bdb\.)/.test(read(file)), `modulo puro sem IO ou hooks: ${file}`);
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m2-pure-projections.cjs') && gate.includes('scripts/test-vault-m1-structural.cjs'), 'M2 entra no release gate sem retirar a M1');
console.log(`VAULT M2 R2 APROVADA: ${passed} contratos locais.`);
