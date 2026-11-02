#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let count=0;
const ok=(cond,label)=>{assert.ok(cond,'M22: '+label);console.log('✓ M22 '+label);count++};
for(const p of ['app/hoje/page.tsx','lib/today/timeline-identity.ts']){
 const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,'parser '+p);
}
const page=read('app/hoje/page.tsx'),gate=read('scripts/test-v63-release-gate.mjs'),card=read('components/hoje/TodayDoseTimelineCard.tsx');
for(const source of [
 'const committedTimeline = useRef<TodayTimelineSnapshot<DoseItemExt> | null>(null)',
 'const doseIdentityContext = JSON.stringify([',
 'user?.id ?? null, activePersonId ?? null, dataSelecionada',
 'retroReviewMode, retroReviewMedicationId ?? null',
 'return reconcileTodayTimelineItems(committedTimeline.current, doseIdentityContext, projected).items',
 'useLayoutEffect(() => {',
 'committedTimeline.current = {scopeKey: doseIdentityContext, items: doses}',
]) ok(page.includes(source),'owner/commit wiring '+source);
ok(page.includes('const doses = useMemo<DoseItemExt[]>')&&page.includes('buildTodayTimelineItems({')&&page.includes('summarizeTimeline(doses)'),'M17-M20 clinical projection remains intact');
ok(page.includes('renderItem={(item) => <TodayDoseTimelineCard item={item} scope={doseCardScope} />}')&&card.includes('memo(function TodayDoseTimelineCardBody'),'M21 memoized cards still wired');
for(const id of ['test-vault-m21-committed-card-render.cjs','test-vault-m20-owner-day-dose-read.cjs','test-vault-m19-today-projection-hotpath.cjs','test-vault-m18-today-hotpath.cjs','test-vault-m17-today-dose-performance.cjs','test-vault-m22-timeline-reconciliation.cjs']) ok(gate.includes(id),'release gate '+id);
const path='lib/today/timeline-identity.ts',mod=new Module(path,module);
mod._compile(ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,path);
const {reconcileTodayTimelineItems:reconcile,todayTimelineIdentity:key,sameTodayTimelineValue:same}=mod.exports;
const base={medicamentoId:'m1',horario:'08:00',tomada:false,ignorada:false,cor:'#123',estoqueRestante:10,cores:['red','blue'],insight:{deveRenovar:false,mensagem:'OK',urgencia:'nenhuma'},comportamento:{metricas:{tomadasUltimos7Dias:5}}};
const sos={medicamentoId:'m1',horario:'08:00',logId:'L1',isAvulsa:true,doseKind:'sos',tomada:true,ignorada:false};
const extra={medicamentoId:'m1',horario:'09:00',logId:'L2',isAvulsa:true,doseKind:'extra',tomada:true,ignorada:false};
const planned={medicamentoId:'m1',horario:'10:00',logId:'L3',isAvulsa:true,doseKind:'planned',tomada:false,ignorada:false};
const symptom={isSintoma:true,sintomaId:'S1',horario:'07:00',tomada:true,ignorada:false};
const rows=[base,sos,extra,planned,symptom];
const scope='["u1","p1","2026-11-02",false,null]';
let first=reconcile(null,scope,rows);
ok(first.items===rows&&first.scopeKey===scope,'initial projection untouched');
ok(key(base)!==key(sos)&&key(sos)!==key(extra)&&key(planned)!==key(base),'planned vs SOS vs scheduled slot identities separate');
const refresh=rows.map(r=>JSON.parse(JSON.stringify(r)));
let second=reconcile(first,scope,refresh);
ok(second===first&&second.items.every((item,i)=>item===rows[i]),'unchanged semantic rows AND array retain references');
const nested=rows.map(r=>JSON.parse(JSON.stringify(r)));
nested[0].comportamento.metricas.tomadasUltimos7Dias=6;
let third=reconcile(first,scope,nested);
ok(third.items[0]===nested[0]&&third.items.slice(1).every((r,i)=>r===rows[i+1]),'nested clinical evidence invalidates own item only');
const updated=rows.map(r=>JSON.parse(JSON.stringify(r)));
updated[1].tomada=false;
let fourth=reconcile(first,scope,updated);
ok(fourth.items[1]===updated[1]&&fourth.items[0]===base&&fourth.items[2]===extra,'dose completion updates own card without invalidating neighbors');
const stock=rows.map(r=>JSON.parse(JSON.stringify(r))); stock[0].estoqueRestante=0;
ok(reconcile(first,scope,stock).items[0]===stock[0],'zero stock never remains stale');
const changedColor=rows.map(r=>JSON.parse(JSON.stringify(r)));changedColor[0].cores[0]='green';
ok(reconcile(first,scope,changedColor).items[0]===changedColor[0],'nested visual classification changes invalidate card');
for(const newScope of ['["u2","p1","2026-11-02",false,null]','["u1","p2","2026-11-02",false,null]','["u1","p1","2026-11-01",false,null]','["u1","p1","2026-11-02",true,"m1"]']){
 const next=rows.map(x=>JSON.parse(JSON.stringify(x)));
 ok(reconcile(first,newScope,next).items.every((x,i)=>x===next[i]),'different scope rejects reuse: '+newScope);
}
const reordered=[...refresh].reverse(); const swapped=reconcile(first,scope,reordered);
ok(swapped.items.every((x,i)=>x===rows[rows.length-1-i]),'reordered rows reuse correct identities and preserve order');
const d1={...base}, d2={...base};const duplicated=reconcile(first,scope,[d1,d2]);
ok(duplicated.items[0]===d1&&duplicated.items[1]===d2,'duplicate projected slot identities are not reused');
const oldDuplicate=reconcile(null,scope,[{...base},{...base}]);const newDistinct={...base};
ok(reconcile(oldDuplicate,scope,[newDistinct]).items[0]===newDistinct,'duplicate previous identities not reused');
const missing={...sos,logId:undefined}; const missing2={...missing};
ok(key(missing)===null&&reconcile({scopeKey:scope,items:[missing]},scope,[missing2]).items[0]===missing2,'legacy SOS without ID never incorrectly reused');
const symptomMissing={...symptom,sintomaId:undefined};
ok(key(symptomMissing)===null,'legacy symptoms without ID are not cached');
ok(!same({evidence:{observed:1}},{evidence:{observed:2}})&&same({a:1,nested:[1,2]},{a:1,nested:[1,2]}),'nested data compared rather than ignored');
ok(!same({x:NaN},{x:null})&&!same({x:undefined},{})&&!same({x:new Date(0)},{x:new Date(0)})&&!same(new Array(1),[]),'nonprimitive edge cases fail closed');
const cycle1={a:1};cycle1.self=cycle1;const cycle2={a:1};cycle2.self=cycle2;
ok(!same(cycle1,cycle2),'cyclic evidence fails closed rather than becoming stale');
const many=Array.from({length:3500},(_,i)=>({...base,medicamentoId:'m'+i,horario:'08:00'}));
const manyFirst=reconcile(null,scope,many);
const manySecond=reconcile(manyFirst,scope,many.map(x=>({...x,cores:[...x.cores],insight:{...x.insight},comportamento:{metricas:{...x.comportamento.metricas}}})));
ok(manySecond===manyFirst&&manySecond.items.length===3500,'3500 distinct dose slots reused without changing output');
const manyUpdated=many.map(x=>({...x,cores:[...x.cores]}));manyUpdated[1200].tomada=true;
const manyThird=reconcile(manyFirst,scope,manyUpdated);
ok(manyThird.items[1200]===manyUpdated[1200]&&manyThird.items.filter((x,i)=>x===many[i]).length===3499,'one status update invalidates only 1 of 3500 rows');
console.log('VAULT M22:',count,'checks approved; no synthetic speed number claimed');
