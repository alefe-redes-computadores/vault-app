#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
let n=0;const ok=(v,m)=>{assert.ok(v,'M147 P1: '+m);n++;};
const read=x=>fs.readFileSync(x,'utf8');
const source=read('lib/home/home-agenda-m147.ts');
const parsed=ts.createSourceFile('lib/home/home-agenda-m147.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
ok(parsed.parseDiagnostics.length===0,'parse helper');
const m=new Module('m147home',module);m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,'m147home');const x=m.exports;
for(const [data,horario,today,now,want] of [
 ['2026-11-12','17:00','2026-11-13','20:28','pendente_anterior'],
 ['2026-11-13','17:38','2026-11-13','20:28','horario_passado'],
 ['2026-11-13','22:00','2026-11-13','20:28','ainda_hoje'],
 ['2026-11-13','20:28','2026-11-13','20:28','horario_passado'],
 ['2026-11-13',null,'2026-11-13','20:28','sem_horario'],
 ['2026-11-13','25:61','2026-11-13','20:28','sem_horario'],
 ['2026-11-14','17:00','2026-11-13','20:28','data_futura'],
 ['2026-02-30','17:00','2026-11-13','20:28','sem_horario'],
 ])ok(x.homeAgendaBucketM147({data,horario},today,now)===want,'classificação '+want);
const rows=[{id:'later',data:'2026-11-13',horario:'22:00'},{id:'unknown',data:'2026-11-13'},{id:'past',data:'2026-11-13',horario:'17:38'},{id:'old',data:'2026-11-12',horario:'08:00'},{id:'again',data:'2026-11-13',horario:'22:00'}];
const ordered=x.sortHomeWithdrawalsM147(rows,'2026-11-13','20:28');
ok(ordered.map(r=>r.id).join(',')==='old,past,later,again,unknown','ordenação estável com todas as retiradas');
ok(rows.map(r=>r.id).join(',')==='later,unknown,past,old,again','nenhuma mutação no input');
const counts=x.homeAgendaCountsM147(rows,'2026-11-13','20:28');
ok(counts.pendenteAnterior===1&&counts.horarioPassado===1&&counts.aindaHoje===2&&counts.semHorario===1,'contagem de relógio exata');
const alerts=[{id:'same',kind:'sus',level:'atencao',href:'/saude/retiradas/detalhes?id=with1',title:'Retirada'},{id:'critical',kind:'sus',level:'urgente',href:'/saude/retiradas/detalhes?id=with1'},{id:'overdue',kind:'sus',level:'vencido',href:'/saude/retiradas/detalhes?id=with1'},{id:'stock',kind:'estoque',level:'atencao',href:'/saude/retiradas/detalhes?id=with1'},{id:'another',kind:'sus',level:'atencao',href:'/saude/retiradas/detalhes?id=with2'},{id:'external',kind:'sus',level:'ok',href:'https://evil.invalid/saude/retiradas/detalhes?id=with1'},{id:'med',kind:'sus',level:'ok',href:'/saude/medicamentos/detalhes?id=with1'}];
const aliases=x.mergeExactWithdrawalAliasesM147([{id:'with1'}],alerts);
ok(aliases.aliasIds.size===1&&aliases.aliasIds.has('same'),'só mesmíssima retirada identificada');
ok(aliases.byWithdrawal.get('with1')?.length===1,'resumo de alias preserva detalhe');
for(const id of ['critical','overdue','stock','another','external','med'])ok(!aliases.aliasIds.has(id),'nunca ocultar evidência distinta '+id);
ok(x.mergeExactWithdrawalAliasesM147([],alerts).aliasIds.size===0,'sem retirada visível, nenhum alias');
const home=read('app/page.tsx'),gate=read('scripts/test-v63-release-gate.mjs');
for(const p of ['app/page.tsx']){const parsed=ts.createSourceFile(p,home,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);ok(parsed.parseDiagnostics.length===0,'TSX parse Home');}
for(const key of ['VAULT_M147_P1_AGENDA','homeAgendaCountsM147(','sortHomeWithdrawalsM147(','mergeExactWithdrawalAliasesM147(','homeAgendaBucketM147(','aliasIds.has(alert.id)','id="home-compromissos"','id="home-atencao"','id="home-brain"','HomeAttentionRail alerts={unifiedAlerts}','<HomeDoseQuantityFollowUp','<HomeBrainEvidenceGroup','withReturnTarget(`/saude/retiradas/detalhes?id=${retirada.id}`, "/")','VAULT_M144_HOME_ENTRY'])ok(home.includes(key),'integração preservada '+key);
ok(home.indexOf('id="home-compromissos"')<home.indexOf('id="home-atencao"')&&home.indexOf('id="home-atencao"')<home.indexOf('id="home-brain"'),'M145/M146 ordem preservada');
ok(home.includes('Math.max(0, retiradasAgendaM147.length - 1)'),'retiradas compactas e contagem correta');
ok(home.includes('defaultOpen={quantityFollowUpInsight.gravidadeSeguranca === "critica" || quantityFollowUpInsight.gravidadeSeguranca === "importante"}'),'alertas de gravidade importante não recolhidos');
ok(home.includes('renderAlert={alert => <AlertRow alert={alert} />}'),'alerta real renderiza pela autoridade anterior');
ok(home.includes('suppressOperationalOverlap('),'Brain mantém supressão canônica anterior');
ok(gate.split('"scripts/test-vault-m147-p1.cjs"').length===2,'suite P1 registrada uma única vez');
ok(gate.includes('"scripts/test-vault-m147-p0.cjs"')&&gate.includes('"scripts/test-vault-m146-premium-ux.cjs"'),'gates P0/M146 preservados');
console.log('M147 P1: '+n+' contratos de tempo, equivalência real, preservação clínica e UI aprovados.');
