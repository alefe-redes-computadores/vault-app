#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=(p)=>fs.readFileSync(p,'utf8');
const today=read('app/hoje/page.tsx'),home=read('app/page.tsx'),search=read('lib/navigation/clinical-directory-m150.ts');
const check=(name,fn)=>{fn(); console.log('✓ P5 P5 '+name)};
for(const path of ['app/hoje/page.tsx','app/page.tsx','lib/navigation/clinical-directory-m150.ts']){
 check('TSX/TS parse '+path,()=>{const text=read(path),kind=path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,kind);assert.equal(ast.parseDiagnostics.length,0,ast.parseDiagnostics.map(d=>d.messageText).join('; '));});
}
check('Hoje: doses antes de briefing e agenda',()=>{
 assert(today.indexOf('id="hoje-doses"')>0);
 assert(today.indexOf('id="hoje-doses"')<today.indexOf('<TodayActionCenter'));
 assert(today.indexOf('<TodayActionCenter')<today.indexOf('<TodayAgendaOverview'));
 assert.equal((today.match(/<TodayAgendaOverview/g)||[]).length,1);
 assert.equal((today.match(/<TodayActionCenter/g)||[]).length,1);
 assert(!today.includes('data-vault-p5p5-dose-shortcut="true"') && today.includes('onOpenDoses={() =>') && today.includes('getElementById("hoje-doses")?.scrollIntoView'));
 assert(today.includes('focusDoseQueue = searchParams.get("focus") === "doses"'));
 assert(today.includes('getElementById("hoje-doses")?.scrollIntoView'));
});
check('Hoje: mesma autoridade de retirada aberta da Home',()=>{
 assert(today.includes('isOpenWithdrawal(item) && item.data < hoje'));
 assert(home.includes('openWithdrawalsDueBy(retiradas, hoje)'));
 assert(read('lib/withdrawal-agenda.ts').includes('export function isOpenWithdrawal'));
});
check('Home: acessos essenciais depois do resumo e antes da agenda',()=>{
 assert(home.indexOf('<HomeDailyHero')<home.indexOf('mode="primary"'));
 assert(home.indexOf('mode="primary"')<home.indexOf('id="home-compromissos"'));
 assert(home.includes('onOpenToday={() => { trigger("vibrate"); router.push("/hoje?focus=doses"); }}'));
 assert(home.includes('id="home-brain"'));
 assert(home.includes('<HomeDoseQuantityFollowUp'));
});
const m=new Module('lib/navigation/clinical-directory-m150.ts',module);
m._compile(ts.transpileModule(search,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'lib/navigation/clinical-directory-m150.ts');
const d=m.exports;
check('Explorar: todos os 22 destinos reais preservados',()=>{
 const es=d.clinicalDirectoryM150.flatMap(x=>x.items); assert.equal(es.length,22);assert.equal(new Set(es.map(x=>x.href)).size,22);
});
for(const [term,id] of [['remedio','medicamentos'],['farmacia','rede'],['dose de hoje','hoje'],['laboratorio','pharmalens'],['agendar medico','consultas'],['anexar receita','renovacao'],['sus','fornecimento']]){
 check('Busca '+term,()=>assert(d.searchClinicalDirectoryM150(term).flatMap(x=>x.items).some(x=>x.id===id),term));
}
check('Busca mantém diacríticos e resultado vazio',()=>{
 assert(d.searchClinicalDirectoryM150('MedIcAçÃo').flatMap(x=>x.items).some(x=>x.id==='medicamentos'));
 assert.equal(d.searchClinicalDirectoryM150('zzzinexistente-9426').length,0);
});
check('Proibição: nenhum novo motor de dose, estoque ou banco',()=>{
 assert(!/supabase\.|\.put\(|insert\(|marcarComoTomada\(/.test(search));
 assert(today.includes('confirmarDosesNaoTomadasPorEstoque'));
 assert(home.includes('homeAdministrativeWithdrawalAlertsP5P4'));
});
check('Contratos legados M76 e M110 migrados para nova ordem sem remover autoridade',()=>{
 const m76=read('scripts/test-vault-m76-final-visual-ux.cjs');
 const m110=read('scripts/test-vault-m110-home-today.cjs');
 assert(m76.includes('agenda preservada apos doses prioritarias'));
 assert(m76.includes('Brain preservado no bloco de prioridades e doses acessiveis sem CTA duplicado'));
 assert(m76.includes("today.indexOf('<TodayActionCenter')<today.indexOf('<TodayAgendaOverview')"));
 assert(m76.includes("!today.includes('data-vault-p5p5-dose-shortcut"));
 assert(m110.includes('Doses prioritarias; Brain e agenda preservados'));
 assert(m76.includes('buildTodayAgendaOverview'));
 assert(m110.includes('DoseScheduleGroups items={grupo.items}'));
});
check('Release V63 registra exatamente um contrato P5 P5',()=>{
 assert.equal(read('scripts/test-v63-release-gate.mjs').split('"scripts/test-vault-m150-p5-p5.cjs"').length-1,1);
});
console.log('P5 P5 R1 — smoke de navegacao, autoridade, semantica e sintaxe APROVADO');
