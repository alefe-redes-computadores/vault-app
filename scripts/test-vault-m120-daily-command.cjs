#!/usr/bin/env node
"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let checks=0;
const ok=(label,fn)=>{fn();checks++;console.log(`M120 OK ${String(checks).padStart(2,'0')}: ${label}`)};
function loadPure(file,requireOverrides={}){
  const src=read(file);
  const compiled=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(compiled.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length??0,0,'TS transpile: '+file);
  const mod=new Module(path.resolve(file),module);
  mod.filename=path.resolve(file);mod.paths=Module._nodeModulePaths(process.cwd());
  mod.require=id=>Object.hasOwn(requireOverrides,id)?requireOverrides[id]:require(id);
  mod._compile(compiled.outputText,mod.filename);
  return mod.exports;
}
const ret=loadPure('lib/navigation/return-context.ts');
const m=loadPure('lib/navigation/today-context-m120.ts',{'./return-context':ret});
const params=s=>new URLSearchParams(s);
const input=(q='',more={})=>({date:'2026-11-12',today:'2026-11-11',query:params(q),status:'pendentes',period:'noite',appointment:'retiradas',showResolved:false,...more});
const route=m.buildTodayContextUrlM120(input('focus=doses&time=23%3A00&return_to=%2Finteligencia%23insight-evidencias&action=dose'));
const u=new URL(route,'https://vault.local');
ok('retorna data concreta selecionada',()=>assert.equal(u.searchParams.get('data'),'2026-11-12'));
ok('preserva filtro de status selecionado',()=>assert.equal(u.searchParams.get('status'),'pendentes'));
ok('preserva período selecionado',()=>assert.equal(u.searchParams.get('periodo'),'noite'));
ok('preserva categoria de compromisso',()=>assert.equal(u.searchParams.get('compromisso'),'retiradas'));
ok('preserva fila de doses',()=>assert.equal(u.searchParams.get('focus'),'doses'));
ok('preserva horário sem inventar tomada',()=>assert.equal(u.searchParams.get('time'),'23:00'));
ok('retorno relativo mantém âncora da inteligência',()=>assert.equal(u.searchParams.get('return_to'),'/inteligencia#insight-evidencias'));
ok('ação de escrita jamais é transportada em mudança de data',()=>assert.equal(u.searchParams.get('action'),null));
ok('action=dose consumida preserva filtro explícito antes da hidratação',()=>{
  const url=m.consumeTodayActionM120(params('action=dose&status=pendentes&periodo=noite&compromisso=retiradas&focus=doses&time=23%3A00'),'2026-11-12','2026-11-11');
  const q=new URL(url,'https://vault.local').searchParams;
  assert.equal(q.get('action'),null);assert.equal(q.get('status'),'pendentes');assert.equal(q.get('periodo'),'noite');assert.equal(q.get('compromisso'),'retiradas');assert.equal(q.get('time'),'23:00');
});
ok('nenhuma pessoa/conta é serializada',()=>assert(!route.includes('user_id')&&!route.includes('person_id')));
ok('revisão retroativa mantém medicação explícita',()=>{
  const q=new URL(m.buildTodayContextUrlM120(input('retro=1&medicamento=abc-123')),'https://vault.local').searchParams;
  assert.equal(q.get('retro'),'1');assert.equal(q.get('medicamento'),'abc-123');
});
ok('revisão não herda medicação inválida',()=>assert(!m.buildTodayContextUrlM120(input('retro=1&medicamento=../../foo')).includes('medicamento=')));
ok('retorno externo é rejeitado',()=>assert.equal(m.todayOriginM120(params('return_to=https%3A%2F%2Fevil.test')),null));
ok('retorno // é rejeitado',()=>assert.equal(m.todayOriginM120(params('return_to=%2F%2Fevil.test')),null));
ok('retorno com barra reversa é rejeitado',()=>assert.equal(m.todayOriginM120(params('return_to=%2F%5Cevil.test')),null));
ok('retorno recursivo Hoje é rejeitado',()=>assert.equal(m.todayOriginM120(params('return_to=%2Fhoje%3Fdata%3D2026-11-11')),null));
ok('retorno interno é aceito',()=>assert.equal(m.todayOriginM120(params('return_to=%2Fsaude%2Fmedicamentos')), '/saude/medicamentos'));
ok('datas reais e anos bissextos',()=>{
  for(const v of ['2024-02-29','2026-11-11','2000-02-29'])assert.equal(m.validTodayDateM120(v),true,v);
  for(const v of ['2026-02-29','2026-04-31','2026-13-01','2026-00-01','2026-11-32','2026-11-1','foo'])assert.equal(m.validTodayDateM120(v),false,v);
});
ok('data inválida retorna ao hoje canônico',()=>assert.equal(m.buildTodayContextUrlM120(input('',{date:'2026-02-30',status:'todos',period:'todos',appointment:'todos'})),'/hoje'));
ok('sem filtros adicionais não polui URL',()=>assert.equal(m.buildTodayContextUrlM120(input('',{date:'2026-11-11',status:'todos',period:'todos',appointment:'todos'})),'/hoje'));
ok('visualização concluída é independente de status explícito',()=>{
  const yes=m.buildTodayContextUrlM120(input('',{status:'todos',showResolved:true}));
  assert(yes.includes('concluidas=1'));
  const no=m.buildTodayContextUrlM120(input('',{status:'pendentes',showResolved:true}));
  assert(!no.includes('concluidas='));
});
ok('horário impossível não é aceito',()=>assert(!m.buildTodayContextUrlM120(input('focus=doses&time=25%3A61')).includes('time=')));
ok('sem foco de doses não transporta horário',()=>assert(!m.buildTodayContextUrlM120(input('time=23%3A00')).includes('time=')));
ok('texto passado mantém ausência de registros explícita',()=>{
  const out=m.todayContextLabelM120({status:'pendentes',period:'manha',time:'08:00',isPast:true,isFuture:false});
  assert(out.some(v=>v.includes('sem confirmação')));assert(out.includes('Manhã'));assert(out.includes('Horário 08:00'));
});
ok('futuro usa previsão e não atraso',()=>{
  const out=m.todayContextLabelM120({status:'pendentes',period:'todos',time:null,isPast:false,isFuture:true});
  assert(out.includes('Doses previstas'));
});
ok('módulo puro não possui persistência ou requisições',()=>{
 const source=read('lib/navigation/today-context-m120.ts');
 assert.doesNotMatch(source,/\bdb\.|supabase|localStorage|\.put\(|\.update\(|fetch\(|navigator\.serviceWorker/);
});
for(const p of ['app/hoje/page.tsx','app/page.tsx','components/hoje/TodayFilterPanel.tsx','components/hoje/TodayNavigationContextM120.tsx','lib/navigation/today-context-m120.ts']){
 ok(`AST válido: ${p}`,()=>{
  const s=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(s.parseDiagnostics.length,0,s.parseDiagnostics.map(x=>String(x.messageText)).join(' | '));
 });
}
const today=read('app/hoje/page.tsx'),home=read('app/page.tsx'),panel=read('components/hoje/TodayFilterPanel.tsx');
ok('Hoje conserva motores e autoridade de doses',()=>{
  assert(today.includes('buildTodayTimelineItems({'));assert(today.includes('useDoseLogs('));assert(today.includes('DoseScheduleGroups items={grupo.items}'));
  assert(today.includes('command={healthIntelligence.careCommand}'));
});
ok('Hoje preserva foco por horário',()=>assert(today.includes('focusTime={focusDoseTime}')));
ok('Hoje mantém status explícitos para legado M110',()=>assert(today.includes('commandDoseStatus !== "tomados"')&&today.includes('setFiltroStatus(commandDoseStatus)')));
ok('Hoje conserva filtros canônicos persistidos',()=>assert(today.includes('useTodayPersistedFilters()')));
ok('Mudança de data usa URL contextual',()=>assert(today.includes('buildTodayContextUrlM120({')));
ok('Brain/Hojé navegam com retorno, não com gravação',()=>assert(today.includes('navigateWithReturnM120(href)')));
ok('Filtro fica acessível ao abrir por contexto',()=>assert(panel.includes('data-vault-today-filters')&&today.includes('querySelector<HTMLDetailsElement>')));
ok('Home mantém prioridade já existente',()=>assert(home.includes('primaryCareCommand')&&home.includes('primaryCareCommand.reason')&&home.includes('HomeDailyHero')));
ok('Home, Hoje e Brain têm funções comunicadas',()=>assert(home.includes('Home: prioridades e decisões · Hoje: horários e registros · Brain: explicações e evidências')));
ok('Brain preserva a decisão original no seu componente',()=>assert(read('app/inteligencia/page.tsx').includes('BrainNextStep decision={health.careCommand.decision}')));
ok('M119 permanece no gate e M120 também',()=>{
 const g=read('scripts/test-v63-release-gate.mjs');
 assert(g.includes('"scripts/test-vault-m119-trust-spine.cjs"'));
 assert(g.includes('"scripts/test-vault-m120-daily-command.cjs"'));
});
console.log(`=== M120: ${checks} verificações PASS, sem dado real nem operação de escrita ===`);
