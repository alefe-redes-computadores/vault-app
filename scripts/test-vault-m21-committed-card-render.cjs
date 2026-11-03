#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
let checks=0;
function ok(cond,desc){assert.ok(cond,'M21 '+desc);checks++;console.log('✓ M21 '+desc)}
const cardPath='components/hoje/TodayDoseTimelineCard.tsx';
const helperPath='lib/today/card-render-scope.ts';
const gatePath='scripts/test-v63-release-gate.mjs';
for(const path of [cardPath,helperPath]){
 const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,'TS/TSX parser '+path);
}
const card=read(cardPath),gate=read(gatePath),page=read('app/hoje/page.tsx');
ok(card.includes('export function TodayDoseTimelineCard')&&card.includes('memo(function TodayDoseTimelineCardBody'),'public component and real memoized visual body both retained');
ok(card.includes('useLayoutEffect(() => { committedScope.current = scope; }, [scope])'),'callback ref updates only after committed render');
for(const command of ['handleToggle','handleIgnorar','handleCancelPlannedDose','abrirRevisaoHistorica','trigger'])
 ok(card.includes('committedScope.current.'+command+'('),'no stale '+command+' closure');
ok(!card.includes('committedScope.current.setModalAberto(') &&
   !card.includes('committedScope.current.setMedicamentoSelecionado(') &&
   card.includes('router: {push: (href: string) => committedScope.current.router.push(href)}') &&
   card.includes('medicationRestockHref(item.medicamentoId!, returnTo)') &&
   card.includes('medicationStockCountHref(item.medicamentoId!, returnTo)'),
   'legacy modal removed; stock actions use latest committed router');
ok(card.includes('scope.regulatoryProfiles[item.medicamentoId]')&&card.includes('scope.medicamentosById.get(item.medicamentoId)'),'per-medication visual state selected');
ok(card.includes('regulatoryProfiles, processingId, medicationsById, commands'),'stable visual dependency projection');
ok(card.includes('isHistoricalProcessing: scope.isHistoricalProcessing')&&card.includes('isProcessing: scope.isProcessing')&&card.includes('horaAtual: scope.horaAtual'),'important disabled/clock state remains reactive');
ok(card.includes('handleToggle(')&&card.includes('handleIgnorar(')&&card.includes('handleCancelPlannedDose(item)'),'all clinical buttons remain wired');
ok(page.includes('<TodayDoseTimelineCard item={item} scope={doseCardScope} />')&&page.includes('const doseCardScope: TodayDoseTimelineCardScope ='),'parent operations unchanged');
ok(gate.includes('scripts/test-vault-m21-committed-card-render.cjs')&&gate.includes('scripts/test-vault-m20-owner-day-dose-read.cjs'),'M20 and M21 retained in global gate');
const compile=(src,jsx=ts.JsxEmit.None)=>ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx}}).outputText;
const helperModule=new Module(helperPath,module);
helperModule._compile(compile(read(helperPath)),helperPath);
const relevant=helperModule.exports.relevantDoseProcessingId;
const planned={medicamentoId:'m1',horario:'23:00'};
const sos={medicamentoId:'m1',horario:'23:00',logId:'sos-1'};
ok(relevant(planned,'m1-23:00')==='m1-23:00'&&relevant(planned,'m2-23:00')===null,'only own scheduled slot triggers visual processing');
ok(relevant(sos,'log-sos-1')==='log-sos-1'&&relevant(sos,'m1-23:00')===null,'SOS log never confused with scheduled slot');
ok(relevant(planned,null)===null,'null processing remains idle');

// Small React hook simulation: actually execute the exported wrapper from the
// transpiled TSX and check reference reuse + committed callback dispatch.
let slots=[],index=0,effects=[];
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
const fakeReact={
 useRef(value){const n=index++;if(!slots[n])slots[n]={current:value};return slots[n]},
 useMemo(factory,deps){const n=index++,prior=slots[n];if(prior&&same(prior.deps,deps))return prior.value;const value=factory();slots[n]={deps:[...deps],value};return value},
 useLayoutEffect(fn,deps){const n=index++,prior=slots[n];if(!prior||!same(prior.deps,deps)){slots[n]={deps:[...deps]};effects.push(fn)}},
 memo(fn){fn.__memoized=true;return fn},
};
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const cardModule=new Module(cardPath,module);
cardModule.require=id=>{
 if(id==='react')return fakeReact;
 if(id==='react/jsx-runtime')return jsx;
 if(id==='@/lib/today/card-render-scope')return {relevantDoseProcessingId:relevant};
 // No visual child rendering in this test: all other modules are inert.
 return {};
};
cardModule._compile(compile(read(cardPath),ts.JsxEmit.ReactJSX),cardPath);
const render=(item,scope)=>{index=0;effects=[];const el=cardModule.exports.TodayDoseTimelineCard({item,scope});for(const f of effects)f();return el};
const sample={medicamentoId:'m1',horario:'23:00',tomada:false,ignorada:false};
const profile1={tone:'black'};const med1={id:'m1',nome:'Dose principal'};
let calls=[];
const makeScope=(patch={})=>({
 isHoje:true,isPassado:false,isFuturo:false,horaAtual:'22:00',regulatoryProfiles:{m1:profile1},processandoDoseId:null,
 trigger:()=>calls.push('old trigger'),router:{push:()=>calls.push('old navigate')},
 medicamentosById:new Map([['m1',med1]]),
 abrirRevisaoHistorica:()=>calls.push('old history'),isHistoricalProcessing:false,
 handleCancelPlannedDose:async()=>calls.push('old cancel'),isProcessing:false,
 handleIgnorar:async()=>calls.push('old ignore'),handleToggle:async()=>calls.push('old toggle'),...patch,
});
let scope=makeScope();const first=render(sample,scope);
ok(first.type.__memoized===true,'heavy JSX lives in a memo-wrapped component');
ok(first.props.scope.regulatoryProfiles.m1===profile1&&first.props.scope.medicamentosById.get('m1')===med1,'visual scope preserves selected medication and regulatory profile');
const next=render(sample,makeScope({
 regulatoryProfiles:{m1:profile1,m2:{tone:'red'}},medicamentosById:new Map([['m1',med1],['m2',{id:'m2'}]]),
 processandoDoseId:'m2-23:00',handleToggle:async()=>calls.push('new toggle'),router:{push:()=>calls.push('new navigate')},
}));
ok(next.props.scope===first.props.scope,'unrelated medication, processing or callback changes do not invalidate visual');
next.props.scope.handleToggle(sample);next.props.scope.router.push('/hoje');
ok(calls.join(',')==='new toggle,new navigate','buttons dispatch latest committed callbacks even when heavy JSX was skipped');
const active=render(sample,makeScope({processandoDoseId:'m1-23:00'}));
ok(active.props.scope!==next.props.scope&&active.props.scope.processandoDoseId==='m1-23:00','own processing state invalidates its visual');
const historical=render(sample,makeScope({isHoje:false,isPassado:true,isProcessing:true,isHistoricalProcessing:true}));
ok(historical.props.scope.isPassado&&historical.props.scope.isProcessing&&historical.props.scope.isHistoricalProcessing,'historical actions and global lock remain reactive');
const regulatory=render(sample,makeScope({regulatoryProfiles:{m1:{tone:'yellow'}}}));
ok(regulatory.props.scope.regulatoryProfiles.m1.tone==='yellow'&&regulatory.props.scope!==historical.props.scope,'own regulatory change invalidates visual');
const queued=render(sample,makeScope({handleIgnorar:async()=>calls.push('current ignore')}));
queued.props.scope.handleIgnorar(sample);
ok(calls.at(-1)==='current ignore','ignore action never uses stale callback');
console.log('VAULT M21:',checks,'checks passed; no claimed wall-clock speedup');
