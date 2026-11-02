#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const {Module}=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
const parse=p=>ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS).parseDiagnostics;
let checks=0;const ok=(x,label)=>{assert.ok(x,'M18 '+label);checks++;console.log('✓ M18 '+label)};
for(const file of ['lib/today/timeline-summary.ts','app/hoje/page.tsx','hooks/useTodayOwnerData.ts'])ok(parse(file).length===0,`typescript syntax ${file}`);
const today=read('app/hoje/page.tsx'),timeline=read('lib/today/timeline-summary.ts'),owner=read('hooks/useTodayOwnerData.ts'),gate=read('scripts/test-v63-release-gate.mjs'),card=read('components/hoje/TodayDoseTimelineCard.tsx');
const v98=read('scripts/test-v98-final-medication-intelligence-contract.mjs');

ok(timeline.includes('bucket.push(item)')&&!timeline.includes('[...(groups.get(key) || []), item]'),'group append is linear');
ok(timeline.includes('for (const item of items)')&&timeline.includes('if (item.isExpectedUnconfirmed) totalEsperadasSemConfirmacao++'),'metrics preserve temporal evidence');
ok(v98.includes("summary.includes('if (item.isExpectedUnconfirmed) totalEsperadasSemConfirmacao++')") &&
   v98.includes("summary.includes('if (item.isExpectedUnconfirmed || item.isDataConflict || item.isAvulsa || item.isSintoma) continue;')") &&
   !v98.includes("summary.includes('!item.isAvulsa && !item.isSintoma')"),
   'V98 validates the optimized SOS/extra, symptoms, conflict and historical exclusions');
ok(today.includes('const operationalMinute = isHoje ? horaAtual : "00:00"'),'clock only groups today');
ok(today.includes('nowTime: operationalMinute')&&today.includes('[dosesParaExibir, operationalMinute, isHoje, hoje, dataSelecionada]'),'past/future grouping avoids minute dependency');
ok(today.includes('dose.horario <= operationalMinute')&&today.includes('[isHoje, metricItems, batchTargetKeys, operationalMinute]'),'batch eligibility remains current for today');
ok(today.includes('const concluidasOcultas = useMemo(() => countHiddenTodayResolved(dosesFiltradas,')&&today.includes('[dosesFiltradas, isHoje, filtroStatus, mostrarConcluidas]'),'hidden count only recomputes on relevant change');
ok(owner.includes('const EMPTY_TODAY_ROWS: never[] = [];')&&(owner.match(/: EMPTY_TODAY_ROWS,/g)||[]).length===10,'ten unavailable Dexie rows share stable empty identity');
ok(owner.includes('dayData?.userId === userId')&&owner.includes('historyData?.userId === userId')&&owner.includes('[user_id+person_id+data]'),'owner-scope and indexed day reads intact');
ok(owner.includes('.where("[user_id+person_id]").equals([userId, personId]).toArray()'),'complete longitudinal evidence remains available');
ok(today.includes('useTodayOwnerData({')&&today.includes('renderItem={(item) => <TodayDoseTimelineCard item={item} scope={doseCardScope} />}')&&card.includes('handleCancelPlannedDose(item)'),'M17 cards and Codex owner hook remain wired');
for(const f of ['scripts/test-vault-m17-today-dose-performance.cjs','scripts/test-vault-m16-today-data-evidence-fenix.cjs','scripts/test-vault-m18-medication-navigation-fenix.cjs'])ok(gate.includes(f),'release retains '+f);
ok(gate.includes('scripts/test-vault-m18-today-hotpath.cjs'),'M18 installed in global gate');
// Run the real optimized module. Clinical-time implementation is intentionally
// the REAL TS source, not a mocked medical classification.
const compile=p=>ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const timeMod=new Module('lib/health-intelligence/clinical-time.ts',module);
timeMod._compile(compile('lib/health-intelligence/clinical-time.ts'),'lib/health-intelligence/clinical-time.ts');
const mod=new Module('lib/today/timeline-summary.ts',module);
mod.require=id=>{if(id==='@/lib/health-intelligence/clinical-time')return timeMod.exports;throw Error('M18 unexpected timeline import '+id)};
mod._compile(compile('lib/today/timeline-summary.ts'),'lib/today/timeline-summary.ts');
const {groupTimelineItems, summarizeTimeline, filterTimelineItems, visibleTimelineItems}=mod.exports;
const originalSummary=items=>{const routine=items.filter(x=>!x.isExpectedUnconfirmed&&!x.isDataConflict&&!x.isAvulsa&&!x.isSintoma);return {totalTomadas:routine.filter(x=>x.tomada).length,totalPendentes:routine.filter(x=>!x.tomada&&!x.ignorada).length,totalEsperadasSemConfirmacao:items.filter(x=>x.isExpectedUnconfirmed).length,totalIgnoradas:routine.filter(x=>x.ignorada).length}};
const originalGroup=(items,c)=>{const groups=new Map();const add=(k,x)=>groups.set(k,[...(groups.get(k)||[]),x]);for(const x of items){if(!c.isToday){add(mod.exports.timelinePeriod(x.horario),x);continue}if(x.isDataConflict){add('revisao',x);continue}if(x.tomada){add('concluidas',x);continue}if(x.ignorada){add('ignoradas',x);continue}if(x.isAvulsa&&x.doseKind!=='planned'){add('avulsas',x);continue}const b=timeMod.exports.classifyClinicalSchedule({eventDate:c.selectedDate,scheduledTime:x.horario,today:c.today,nowTime:c.nowTime,nowWindowMinutes:15});add(b==='now'?'agora':b==='past'||b==='past-day'?'atrasadas':'depois',x)}return (c.isToday?['agora','atrasadas','depois','avulsas','revisao','concluidas','ignoradas']:['manha','tarde','noite']).flatMap(key=>{const rows=groups.get(key);return rows?.length?[[key,rows.sort((a,b)=>a.horario.localeCompare(b.horario))]]:[]})};
const day='2026-11-02';
const fixture=[
 {id:'pending',horario:'10:00',tomada:false,ignorada:false},
 {id:'taken',horario:'10:00',tomada:true,ignorada:false},
 {id:'ignored',horario:'21:00',tomada:false,ignorada:true},
 {id:'conflict',horario:'07:00',tomada:false,ignorada:false,isDataConflict:true},
 {id:'sos',horario:'13:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'sos'},
 {id:'extra',horario:'13:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'extra'},
 {id:'planned',horario:'13:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'planned'},
 {id:'historical',horario:'22:00',tomada:false,ignorada:false,isExpectedUnconfirmed:true},
 {id:'symptom',horario:'09:00',tomada:false,ignorada:false,isSintoma:true},
 {id:'takenignored',horario:'20:00',tomada:true,ignorada:true},
 ];
for(const c of [{isToday:true,selectedDate:day,today:day,nowTime:'10:00'},{isToday:true,selectedDate:day,today:day,nowTime:'14:00'},{isToday:false,selectedDate:'2026-11-01',today:day,nowTime:'09:00'},{isToday:false,selectedDate:'2026-11-03',today:day,nowTime:'19:00'}]){
  const before=JSON.stringify(fixture);
  assert.deepEqual(groupTimelineItems(fixture,c),originalGroup(fixture,c));
  ok(JSON.stringify(fixture)===before,`group matches old buckets/order and leaves input untouched ${c.isToday?'today '+c.nowTime:c.selectedDate}`);
}
for(const items of [fixture,[],[fixture[0]],[fixture[3]],[fixture[7]],Array.from({length:250},(_,i)=>({...fixture[i%fixture.length],id:`generated${i}`,horario:`${String(i%24).padStart(2,'0')}:00`}))]){
  assert.deepEqual(summarizeTimeline(items),originalSummary(items));
  checks++;
}
ok(summarizeTimeline(fixture).totalEsperadasSemConfirmacao===1,'missing historical confirmation stays separate from nonadherence');
ok(summarizeTimeline(fixture).totalPendentes===1,'SOS, planned, conflict and symptoms do not count as routine pending');
for(const opts of [{isToday:true,status:'todos',showResolved:false},{isToday:true,status:'pendentes',showResolved:false},{isToday:true,status:'todos',showResolved:true},{isToday:false,status:'todos',showResolved:false}]){
 const visible=visibleTimelineItems(filterTimelineItems(fixture,opts.status,'todos',opts.isToday),opts);
 ok(visible.every(x=>fixture.includes(x)),`filtered view keeps original items ${opts.status}/${opts.isToday}/${opts.showResolved}`);
}
const large=Array.from({length:3000},(_,i)=>({id:i,horario:'12:00',tomada:false,ignorada:false}));
const grouped=groupTimelineItems(large,{isToday:true,selectedDate:day,today:day,nowTime:'12:00'});
ok(grouped[0][0]==='agora'&&grouped[0][1].length===3000&&grouped[0][1][2999]===large[2999],'dense 3,000-slot group remains complete and ordered');
// Do not assert wall-time thresholds on arbitrary Android hardware.
console.log(`VAULT M18: ${checks} checks approved; no performance speedup invented`);
