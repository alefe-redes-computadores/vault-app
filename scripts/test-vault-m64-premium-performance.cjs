#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
let count = 0;
function check(ok, message) { assert.ok(ok, `M64: ${message}`); count++; }
function file(p) { return fs.readFileSync(p, 'utf8'); }
const files = [
 'hooks/useTodayOwnerData.ts', 'components/hoje/TodayRoutinePulse.tsx',
 'components/home/HomeDailyHero.tsx', 'components/saude/MedicationCareNetworkDetails.tsx',
 'components/home/HomeCommandCenter.tsx', 'components/saude/HealthAvatar.tsx',
 'app/saude/minha-saude/page.tsx', 'app/saude/medicamentos/page.tsx',
 'components/saude/ClinicalDisclosure.tsx','lib/medications/list-personal-accent.ts',
];
function load(p, imports={}) {
 const compiled = ts.transpileModule(file(p), { compilerOptions: {
  module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2021, jsx:ts.JsxEmit.ReactJSX,
  esModuleInterop:true,
 }, reportDiagnostics:true });
 check(!compiled.diagnostics.length, `transpila ${p}`);
 const m = new Module(path.resolve(p), module);
 m.require = id => Object.hasOwn(imports,id) ? imports[id] : require(id);
 m._compile(compiled.outputText,path.resolve(p));
 return m.exports;
}
for(const p of files){
 const source=file(p), f=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(!f.parseDiagnostics.length,`sem erro sintático ${p}`);
 check(!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["']/s.test(source),`M64 sem novo input nativo em ${p}`);
}
const accent = load('lib/medications/list-personal-accent.ts');
check(accent.medicationPersonalAccent({cor_principal:'#af2',cores:['#123456']})==='#AAFF22','cor principal do usuário tem prioridade');
check(accent.medicationPersonalAccent({cor_principal:'',cores:['#123456']})==='#123456','cor farmacêutica registrada é fallback');
check(accent.medicationPersonalAccent({cor_principal:'url(javascript:1)',cores:[]})===null,'CSS não confiável rejeitado');
check(accent.medicationPersonalAccent({cor_principal:'var(--unsafe)',cores:['red']})===null,'nomes e expressões não são injetados');
check(accent.medicationPersonalAccentStyle({cor_principal:'#cafe99'}).borderColor==='#CAFE9955','borda semântica translúcida');
check(accent.medicationPersonalAccentStyle({cor_principal:'bad'})===undefined,'sem cor não inventa borda');
const list=file('app/saude/medicamentos/page.tsx');
// M64 R2: verify the JSX ownership of the regulatory rail, not source indentation.
// The visual accent is restricted to the icon and never takes over ListCard.color.
const listAst = ts.createSourceFile('medications-list.tsx',list,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const cards = [];
function visitList(node) {
 if (ts.isJsxOpeningElement(node) && node.tagName.getText(listAst) === 'ListCard') cards.push(node);
 ts.forEachChild(node,visitList);
}
visitList(listAst);
const cardColorAttribute = cards.length === 1 && cards[0].attributes.properties.find(attr =>
 ts.isJsxAttribute(attr) && attr.name.text === 'color');
const cardRailAttribute = cards.length === 1 && cards[0].attributes.properties.some(attr =>
 ts.isJsxAttribute(attr) && attr.name.text === 'rail');
check(Boolean(cardColorAttribute && ts.isJsxAttribute(cardColorAttribute) &&
 cardColorAttribute.initializer && ts.isJsxExpression(cardColorAttribute.initializer) &&
 cardColorAttribute.initializer.expression && ts.isIdentifier(cardColorAttribute.initializer.expression) &&
 cardColorAttribute.initializer.expression.text === 'regulatoryBorderColor' &&
 cardRailAttribute && /const\s+regulatoryBorderColor\s*=\s*regulatorySurface\.rail\s*;/.test(list)),
 'classificação na faixa regulatória preservada via AST e origem do valor');
check(list.includes('style={medicationPersonalAccentStyle(med)}'),'cor pessoal limitada ao ícone');
check(list.includes('const personalAccent = medicationPersonalAccent(med);'),'uma resolução por medicamento');
check(list.includes('aria-hidden="true" className="inline-block h-2 w-2'),'marca visual decorativa sem redundância');
const hook=file('hooks/useTodayOwnerData.ts');
check(hook.includes('const ownerData = useLiveQuery')&&hook.includes('const dayData = useLiveQuery'),'duas consultas reativas independentes');
check(hook.includes('}, [userId, personId]);') && hook.includes('}, [userId, personId, date]);'),'consulta de dono não depende da data');
check(hook.includes('const ready = ownerReady && dayReady;'),'dados novos só aparecem com dono e dia coerentes');
check(hook.includes('historicoDosesCompleto: historyReady ? historyData!.rows'),'histórico M62 completo mantido');
check(!hook.includes('.limit('),'sem truncamento silencioso do histórico clínico');
let queries = [], views=[];
const db = new Proxy({}, {get(_t,name){return {where(index){return {equals(value){return {toArray:async()=>{views.push([name,index,value]);return [{id:String(name)}]}}}}}}}});
let returned = [];
const useLiveQuery = (fn,deps)=>{ queries.push({fn,deps}); return returned[queries.length-1]; };
const {useTodayOwnerData} = load('hooks/useTodayOwnerData.ts',{
 'dexie-react-hooks':{useLiveQuery},'@/lib/db':{db}
});
function render(data) {queries=[];return useTodayOwnerData(data)};
(async()=>{
 let state=render({userId:'u1',personId:'p1',date:'2026-10-29'});
 check(state.ready===false && state.tratamentos.length===0,'carregamento inicial falha fechado');
 check(queries.length===3,'três subscrições: dono, dia e histórico');
 check(JSON.stringify(queries[0].deps)===JSON.stringify(['u1','p1']),'leitura de dono por conta/pessoa');
 check(JSON.stringify(queries[1].deps)===JSON.stringify(['u1','p1','2026-10-29']),'leitura do dia com data selecionada');
 check(JSON.stringify(queries[2].deps)===JSON.stringify(['u1','p1']),'histórico independente da navegação de dia');
 await queries[0].fn(); await queries[1].fn(); await queries[2].fn();
 const ownerRows=views.filter(x=>['tratamentos','renovacoes','medicos','farmacias','hospitais'].includes(String(x[0])));
 const dayRows=views.filter(x=>['consultas','cirurgias','exames','registros_saude'].includes(String(x[0])));
 check(ownerRows.length===5 && ownerRows.every(x=>x[1]==='[user_id+person_id]'),'cinco áreas estáveis indexadas por dono');
 check(dayRows.length===4 && dayRows.every(x=>x[1]==='[user_id+person_id+data]'),'quatro áreas de agenda indexadas por dia');
 returned=[{userId:'u1',personId:'p1',tratamentos:[{id:'t'}],renovacoes:[],medicos:[],farmacias:[],hospitais:[]},
 {userId:'u1',personId:'p1',date:'2026-10-29',consultasHoje:[],cirurgiasHoje:[],examesHoje:[],registrosHoje:[]},
 {userId:'u1',personId:'p1',rows:[{id:'dose'}]}];
 state=render({userId:'u1',personId:'p1',date:'2026-10-29'});
 check(state.ready && state.tratamentos[0].id==='t' && state.historicoDosesCompleto[0].id==='dose','snapshot consistente exibido');
 state=render({userId:'u1',personId:'p1',date:'2026-10-30'});
 check(!state.ready && state.consultasHoje.length===0 && state.tratamentos.length===0,'troca de data nunca exibe dia anterior');
 state=render({userId:'u2',personId:'p1',date:'2026-10-29'});
 check(!state.ready && state.historicoDosesCompleto.length===0,'troca de conta isola todas as consultas');
 state=render({userId:'u1',personId:'p2',date:'2026-10-29'});
 check(!state.ready && state.tratamentos.length===0,'troca de pessoa falha fechado');
 const pulse=file('components/hoje/TodayRoutinePulse.tsx');
 check(pulse.includes('Entender este resumo')&&pulse.includes('<details'),'orientação temporal progressiva');
 check(pulse.includes('aria-valuetext={`${completed} concluídas, ${ignored} ignoradas, ${unconfirmed} sem confirmação`}'),'progresso mantém três autoridades de dose');
 check(pulse.includes('todayTemporalGuidance')&&pulse.includes('role="note"'),'explicação clínica preservada');
 const home=file('components/home/HomeDailyHero.tsx');
 check(home.includes('scheduled > 0')&&home.includes('homeRoutineSummaryNote(scheduled, safeCompleted)'),'denominador de doses e ausência de horários preservados');
 check(home.includes('min-h-[104px]') && home.includes('active:bg-surface-raised/40') &&
 home.includes('scheduled > 0 && Number.isFinite(progress)'),
 'M24/M25: alvo tátil de 104px, feedback ao toque e denominador real preservados');
 const network=file('components/saude/MedicationCareNetworkDetails.tsx');
 check(network.includes('size-12') && network.includes('onNavigate(') &&
 network.includes('onMap(') && network.includes('onCall('),
 'M25: ações da rede com 48px e destinos autênticos preservados');
check(network.includes('text-sky-300" label="Médico Prescritor"'),'médico identificado em azul');
 check(network.includes('text-emerald-300" label="Farmácia Vinculada"'),'farmácia identificada em verde');
 check(network.includes('Vínculo não confirma atendimento, fornecimento ou retirada'),'sem inferência clínica');
 const hub=file('components/home/HomeCommandCenter.tsx');
 // Existing V9 semantics: preserve each clinical route's original color exactly.
 const hasClinicalTone=(route,tone)=>hub.split("\n").some(line=>
   line.includes(`path: "${route}"`) && line.includes(`text-${tone}`));
 check(hasClinicalTone('/saude/minha-saude','emerald-400') &&
   hasClinicalTone('/saude/consultas','violet-300') &&
   hasClinicalTone('/saude/exames','emerald-400') &&
   hasClinicalTone('/saude/lembretes','amber-400') &&
   hasClinicalTone('/saude/registros','coral') &&
   hub.includes('networkTone="text-emerald-300/80"') &&
   !hub.includes('networkTone="text-cyan-400/70"'),
   'V9: cores clínicas por rota mantidas, sem ciano excessivo na rede');
 check(hub.includes('grid min-w-0 grid-cols-2 gap-2.5'),
   'M64 R4: grade de atalhos secundários sem overflow, sem mudar identidade');
 const health=file('app/saude/minha-saude/page.tsx');
  const healthAst=ts.createSourceFile('my-health.tsx',health,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  check(healthAst.statements.some(node => ts.isImportDeclaration(node) &&
    node.moduleSpecifier.text === 'lucide-react' && node.importClause &&
    node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
    node.importClause.namedBindings.elements.some(item => item.name.text === 'HeartPulse')),
    'HeartPulse usado em Minha Saúde está importado (contrato TypeScript)');
 check(health.includes('id="minha-saude-panorama"')&&health.includes('{() => <PersonalHealthOverview'),'panorama sob demanda sem abandonar seção');
 check(health.includes('Como explorar seu Avatar')&&health.includes('não um diagnóstico'),'orientação de Avatar acessível sob demanda');
 const avatar=file('components/saude/HealthAvatar.tsx');
 check(avatar.includes("size==='expanded'?<details open className=") &&
 avatar.includes('Toque no Avatar para ampliar. O botão do Brain mostra o contexto sem sair desta tela.') &&
 avatar.includes('não diagnósticos'),
 'V178/M7/M11/M13: inspeção ampliada visível e orientação original preservadas');
 check(avatar.includes('shouldMount3D')&&avatar.includes('previewVisible')&&avatar.includes('documentVisible'),'Fênix mantém WebGL condicionado à visibilidade');
 const disclosure=file('components/saude/ClinicalDisclosure.tsx');
 check(disclosure.includes('aria-describedby={descriptionId}')&&disclosure.includes('open ? "sr-only" : "line-clamp-2"'),'título compacto com descrição ainda acessível');
 check(disclosure.includes('vault:reveal-clinical-section'),'deep links de seções preservados');
 const gate=file('scripts/test-v63-release-gate.mjs');
 for(const name of ['test-vault-m64-premium-performance.cjs','test-vault-m63-notifications-search.cjs','test-vault-m62-retro-batch.cjs','test-vault-m61-help.cjs'])
  check(gate.includes(name),`release gate inclui ${name}`);
 console.log(`VAULT M64: ${count} verificações de performance, identidade, Owner, UX, navegação, Fênix e release OK`);
})().catch(e=>{console.error(e);process.exitCode=1});
