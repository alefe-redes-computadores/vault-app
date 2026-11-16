#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const files=['app/page.tsx','app/saude/medicamentos/page.tsx','components/BottomNav.tsx','components/home/HomeDoseQuantityFollowUp.tsx','components/updates/VaultUpdateCenter.tsx','components/galeria/DocumentViewer.tsx','components/home/HomeQuickMetrics.tsx','components/vault-intelligence/HealthInsightSheet.tsx','components/health-intelligence/HealthInsightExplanationSheet.tsx','lib/health-intelligence/medication-pending-priority-p5.ts'];
let checks=0;const check=(label,run)=>{run();checks++;console.log('✓ M153 P5 '+String(checks).padStart(2,'0')+' '+label)};
for(const p of files)check('Sintaxe '+p,()=>{
 const text=fs.readFileSync(p,'utf8'),kind=p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const s=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,kind);
 assert.equal(s.parseDiagnostics.length,0,p+': '+s.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(' | '));
});
const read=p=>fs.readFileSync(p,'utf8');
const helper='lib/health-intelligence/medication-pending-priority-p5.ts';
const m={exports:{}};new Function('module','exports',ts.transpileModule(read(helper),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
const {createMedicationPendingPriorityP5:comparator,pendingClockP5}=m.exports;
const med=(name,time,pend=1,extra={})=>({med:{id:name,nome:name,tipo_uso:'continuo',estoque_horarios:[time]},dosesPendentesHoje:pend,isSOS:false,isSuspenso:false,...extra});
const logs=['BUP','PRISTIQ','VENVANSE'].map(n=>({medicamento_id:n,horario:'10:00',tomado_em:'2026-11-15T10:00:00'}));
const list=[med('BUP','10:00',0),med('DONAREN','22:00'),med('PRISTIQ','10:00',0),med('CERUMIN','16:00'),med('VENVANSE','10:00',0)];
check('pendentes 16h/22h antes dos tomados 10h',()=>assert.deepEqual([...list].sort(comparator(logs)).map(x=>x.med.id),['CERUMIN','DONAREN','BUP','PRISTIQ','VENVANSE']));
check('dose tomada 10h e pendente 22h continua na fila',()=>{
 const d=med('DONAREN','10:00',1,{med:{id:'DONAREN',nome:'DONAREN',tipo_uso:'continuo',estoque_horarios:['10:00','22:00']}});
 assert.equal(pendingClockP5(d,[{medicamento_id:'DONAREN',horario:'10:00',tomado_em:'2026-11-15T10:00:00'}]),'22:00');
});
check('dose ignorada nao aparece como pendente',()=>assert.equal(pendingClockP5(med('CERUMIN','16:00'),[{medicamento_id:'CERUMIN',horario:'16:00',ignorado_em:'2026-11-15T16:00:00'}]),null));
check('SOS sem horário não entra na fila',()=>assert.equal(comparator([])(med('TRAMAL','',0,{isSOS:true}),med('DONAREN','22:00')),2));
check('futuro não é fabricado a partir da ausência de slots',()=>assert.equal(pendingClockP5(med('CICLO','',1,{med:{id:'CICLO',nome:'CICLO',tipo_uso:'temporario',estoque_horarios:[]}}),[]),null));
check('pessoa errada nao pode resolver dose pelo ID de outro medicamento',()=>assert.equal(pendingClockP5(med('CERUMIN','16:00'),[{medicamento_id:'OUTRO',horario:'16:00',tomado_em:'2026-11-15T16:00:00'}]),'16:00'));
const meds=read('app/saude/medicamentos/page.tsx');
check('grupo visível sem paginação',()=>assert(meds.includes('medsPendentesHoje.map(renderCard)')&&meds.includes('id="medicamentos-pendentes-hoje"')&&meds.includes('forceOpen progressive={false}')));
check('compacto sem altura mínima rígida de 172px',()=>assert(!meds.includes('min-h-[172px]')&&meds.includes('compactCards && <div className="max-w-[43%]')));
check('CTA secundária acessível no modo conforto',()=>assert(meds.includes('{!compactCards && <div aria-label="Ações do medicamento"')&&meds.includes('actionLayoutM150P3.secondary.includes("care")')));
check('BottomNav retorna em detalhes, mas não em novo/editar',()=>{let n=read('components/BottomNav.tsx');assert(n.includes('readOnlyClinicalDetails'));assert(n.includes('normalizedPathname.includes("/editar")'));assert(n.includes('medicamentos|tratamentos|retiradas'));});
check('P7: resumo e indicadores unificados antes da Agenda',()=>{
 const h=read('app/page.tsx'), hero=read('components/home/HomeDailyHero.tsx');
 const heroAt=h.indexOf('<HomeDailyHero'), indicatorsAt=h.indexOf('indicators={<HomeQuickMetrics'), agendaAt=h.indexOf('id="home-compromissos"');
 assert(heroAt>=0&&indicatorsAt>heroAt&&agendaAt>indicatorsAt,'Home: hero + indicadores antes da Agenda');
 assert(hero.includes('Resumo unificado da rotina'),'P7: uma unica superficie para rotina e indicadores');
 assert(!h.includes('id="home-resumo-da-rotina"'),'P7: nenhum segundo painel de resumo');
});
check('Acompanhamento sem duplicação e com apoio',()=>{let s=read('components/home/HomeDoseQuantityFollowUp.tsx');assert.equal(s.split('{insight.titulo}').length-1,1);assert(s.includes('/saude/plano-seguranca'));});
check('diagnóstico de atualizações recolhido, instalador visível',()=>{let s=read('components/updates/VaultUpdateCenter.tsx');assert(s.includes('<details className="mt-3 rounded-xl border border-surface-border/45'));assert(s.indexOf('VaultNativeUpdateFlow release={release}')<s.indexOf('Detalhes técnicos e histórico'));});
check('PDF visível e fallback externo',()=>{let s=read('components/galeria/DocumentViewer.tsx');assert(s.includes('<iframe src={item.url}')&&s.includes('Abrir PDF externamente se necessário'));});
check('Plural e safe-area dos sheets corrigidos',()=>{for(let p of ['components/vault-intelligence/HealthInsightSheet.tsx','components/health-intelligence/HealthInsightExplanationSheet.tsx'])assert(read(p).includes('insight.periodoDias === 1 ? "dia" : "dias"'));});
check('Sem novas mutações clínicas ou SQL',()=>{let s=read(helper);assert(!/supabase|\.put\(|\.update\(|\.insert\(/.test(s));});
console.log('M153 P5 TESTES DIRECIONADOS OK | total='+checks);
