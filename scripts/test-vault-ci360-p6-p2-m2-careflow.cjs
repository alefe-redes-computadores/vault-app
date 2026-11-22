/** CI360 M2: deterministic clinical/data safety and syntax contracts. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const ROOT=process.cwd();const text=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const loaded=new Map();
function loadPure(file){
  if(loaded.has(file))return loaded.get(file);
  const js=ts.transpileModule(text(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((js.diagnostics||[]).filter(x=>x.category===1).length,0,file+' syntax errors');
  const mod={exports:{}};loaded.set(file,mod.exports);
  const requireMock=(id)=>{
    if(id==='./domain')return loadPure('lib/careflow-m2/domain.ts');
    if(id==='@/lib/withdrawal-agenda')return {isOpenWithdrawal:(x)=>x.status==='agendada'&&!x.renovacao_realizada_id&&!x.realizada_em};
    throw new Error('Unexpected dependency '+id+' in '+file);
  };
  vm.runInNewContext(`(function(require,module,exports){${js.outputText}\n})`,{}, {filename:file})(requireMock,mod,mod.exports);
  loaded.set(file,mod.exports);return mod.exports;
}
let passed=0;const yes=(condition,msg)=>{assert.ok(condition,msg);passed++};
const fails=(fn,msg)=>{assert.throws(fn,undefined,msg);passed++};
const domain=loadPure('lib/careflow-m2/domain.ts');
yes(domain.isIsoDateM2('2026-11-17'),'day');
yes(!domain.isIsoDateM2('2026-02-30'),'invalid day');
yes(domain.isClockM2('23:59'),'hour');
yes(!domain.isClockM2('26:01'),'invalid hour');
const items=[{label:'Hemograma',mark:'checked',confirmed:true},{label:'Creatinina',mark:'unchecked',confirmed:true},{label:'TSH',mark:'uncertain',confirmed:true}];
yes(JSON.stringify(domain.checkedExamItemsM2(items))===JSON.stringify(['Hemograma']),'selection rule');
fails(()=>domain.checkedExamItemsM2([{label:'Hemograma',mark:'checked',confirmed:false}]),'unreviewed');
fails(()=>domain.checkedExamItemsM2([{label:'TSH',mark:'uncertain',confirmed:true}]),'not checked');
fails(()=>domain.requireCareFlowInputM2({kind:'exam_item',payload:{name:'Hemograma'}}),'missing parent');
fails(()=>domain.requireCareFlowInputM2({kind:'monitor_plan',payload:{start:'2026-11-10',end:'2026-11-09',slots:['08:00']}}),'inverted plan');
for(const kind of ['exam_order','exam_item','exam_result','exam_status','monitor_plan','monitor_reading','monitor_note']){
  const payload=kind==='exam_order'?{title:'pedido',date:'2026-11-17'}:kind==='exam_item'?{name:'Hemograma'}:kind==='exam_result'?{result:'4.3',date:'2026-11-17'}:kind==='exam_status'?{state:'collected'}:kind==='monitor_plan'?{start:'2026-11-17',end:'2026-11-20',slots:['08:00','20:00']}:{};
  const inp={kind,payload,parent_id:'p',related_id:'r'};domain.requireCareFlowInputM2(inp);passed++;
}
const row=(kind,id,parent_id,payload,created_at='2026-11-17T12:00:00Z')=>({kind,id,parent_id,payload,created_at,person_id:'p',user_id:'u'});
let orders=domain.projectExamOrdersM2([row('exam_order','o',null,{title:'Pedido'}),row('exam_item','e','o',{name:'Hemograma'}),row('exam_result','v','e',{result:'5.5'}),row('exam_status','s','e',{state:'result_received'})],'u','p');
yes(orders.length===1&&orders[0].items.length===1,'individual exams');
yes(orders[0].items[0].state==='result_received','individual state');
yes(domain.projectExamOrdersM2([row('exam_order','o',null,{title:'Pedido'})],'u','other').length===0,'person isolation');
const coh=loadPure('lib/careflow-m2/withdrawal-coherence.ts');
const w=(id,status,date,cycle='c',person='p')=>({id,status,data:date,fornecimento_ciclo_id:cycle,person_id:person,user_id:'u',medicamento_id:'m',...(status==='realizada'?{realizada_em:'2026-11-12T16:00:00Z'}:{})});
const upcoming=w('agendada','agendada','2026-12-11'),completed=w('realizada','realizada','2026-12-11');
yes(Boolean(coh.conflictingWithdrawalM2(upcoming,[upcoming,completed])),'same-cycle same-day completion conflict');
yes(coh.availableWithdrawalsM2([upcoming,completed]).length===0,'do not offer phantom pickup');
yes(coh.conflictingWithdrawalM2(upcoming,[upcoming,w('other','realizada','2026-12-12')])===null,'different day independently open');
yes(coh.conflictingWithdrawalM2(upcoming,[upcoming,w('other','realizada','2026-12-11','other-cycle')])===null,'different cycle independently open');
yes(coh.conflictingWithdrawalM2(upcoming,[upcoming,w('other','realizada','2026-12-11','c','other-person')])===null,'person isolation withdraw');
yes(coh.availableWithdrawalsM2([upcoming,w('future','agendada','2027-01-11')]).length===2,'legitimate future pickups persist');
yes(coh.withdrawalConflictForMedicationM2({id:'m',user_id:'u',person_id:'p'},[upcoming,completed])?.pendingId==='agendada','exact medication conflict');
yes(coh.withdrawalConflictForMedicationM2({id:'m',user_id:'u',person_id:'other'},[upcoming,completed])===null,'cross-person no match');
const action=coh.contextualWithdrawalHrefM2({href:'/saude/retiradas/detalhes?id=agendada',medicationId:'m',title:'Abrir retirada'},[{id:'m',user_id:'u',person_id:'p'}],[upcoming,completed]);
yes(action.href.includes('review=')&&action.title.includes('Conferir'),'Brain action rewritten to review');
// FIX3: verify the actual legacy Node alias path before the long V63 batch.
const childProcess=require('node:child_process');
const smoke=childProcess.spawnSync(process.execPath,[
 '--require',path.join(ROOT,'scripts/vault-m2-test-alias-preload.cjs'),'-e',
 `const assert=require('node:assert/strict');
 const wd=require('@/lib/careflow-m2/withdrawal-coherence');
 const rw=require('@/lib/careflow-m2/reminder-window');
 assert.equal(typeof wd.availableWithdrawalsM2,'function');
 assert.equal(typeof wd.conflictingWithdrawalM2,'function');
 assert.equal(typeof rw.reminderDayEligibleM2,'function');
 assert.equal(rw.reminderDayEligibleM2({careflow_m2:{plan_id:'p',start:'2026-11-17',end:'2026-11-19'}},'2026-11-20'),false);
 assert.equal(rw.reminderDayEligibleM2({careflow_m2:{plan_id:'p',start:'2026-11-17',end:'2026-11-19'}},'2026-11-18'),true);
 const a={id:'a',user_id:'u',person_id:'p',medicamento_id:'m',fornecimento_ciclo_id:'c',data:'2026-12-11',status:'agendada'};
 const b={...a,id:'b',status:'realizada'};
 assert.equal(wd.availableWithdrawalsM2([a,b]).length,0);
 console.log('M2 TEST ALIAS: real modules and finite reminder verified');`
],{cwd:ROOT,encoding:'utf8',timeout:15000});
yes(smoke.status===0, 'FIX3: old Node runners resolve real M2 aliases: '+(smoke.stderr||smoke.stdout||'').slice(0,500));
const m2='lib/careflow-m2/reminder-window.ts';
const rw=loadPure(m2);yes(!rw.reminderDayEligibleM2({careflow_m2:{plan_id:'a',start:'2026-11-17',end:'2026-11-19'}},'2026-11-20'),'no infinite schedule');
yes(rw.reminderDayEligibleM2({careflow_m2:null},'2026-11-20'),'legacy reminder unaffected');
yes(rw.reminderDayEligibleM2({careflow_m2:{plan_id:'a',start:'2026-11-17',end:'2026-11-19'}},'2026-11-19'),'end inclusive');

// FIX2: prevent the exact global TypeScript failures before entering full release gates.
// An obligatory picker callback must never be dropped by a design-system refactor.
const pressureView = text('app/saude/careflow/pressao/page.tsx');
const symptomView = text('app/saude/careflow/sintomas/page.tsx');
yes(/<CustomDatePicker\s+label="Fim"\s+value=\{end\}[\s\S]*?onChange=\{setEnd\}/.test(pressureView),
  'FIX2: end date picker has the required onChange callback');
yes(symptomView.includes("nome:name,data:date,horario:time,intensidade:intensity"),
  'FIX2: symptom consultation association records date from selected value');

// FAIL FAST design-system contract: reuse Vault pickers instead of visible native controls.
for(const p of [
 'app/saude/careflow/exames/page.tsx','app/saude/careflow/pressao/page.tsx',
 'app/saude/careflow/sintomas/page.tsx','app/saude/careflow/relatorios/page.tsx'
]){
  const source=text(p);
  for(const match of source.matchAll(/<select\b[^>]*>/g))yes(match[0].includes('sr-only'),p+': visible native select forbidden');
  yes(!/<input\b[^>]*\btype\s*=\s*["'](?:date|time|datetime-local)["']/s.test(source),p+': visible native calendar/clock forbidden');
  yes(source.includes('CustomDatePicker'),p+': calendar must reuse Vault component');
  yes(source.includes('HealthRelationPicker')||source.includes('HealthTimePicker'),p+': picker must reuse Vault component');
}

const code={sync:text('hooks/useSyncQueue.ts'),pull:text('lib/sync/pull.ts'),db:text('lib/db/index.ts'),med:text('lib/medication-access-action.ts'),today:text('lib/today/reminder-day-projection.ts'),home:text('app/page.tsx'),reminders:text('lib/health-reminders/scheduler.ts')};
yes(code.sync.includes('const syncCareFlowM2')&&code.sync.includes(".insert(row)"),'insert only');
yes(code.pull.includes("remoteTable: 'careflow_events_m2'")&&code.pull.includes('batchSize=400'),'real pull paginated');
yes(code.db.includes('careflow_reports_m2:')&&code.db.includes('careflow_events_m2:'),'local storage');
yes(code.med.includes('availableWithdrawalsM2(rows)'),'canonical index guard');
yes(code.home.includes('safePrimaryCareCommandM2'),'Home authority');
yes(code.today.includes('reminderDayEligibleM2'),'Today finite');
yes(code.reminders.includes('reminderDayEligibleM2(rule,dateKey(date))'),'native finite');
yes(!text('lib/careflow-m2/withdrawal-coherence.ts').includes('.update('),'no implicit withdrawal update');
for(const p of [
 'lib/careflow-m2/domain.ts','lib/careflow-m2/pdf-library.ts','lib/careflow-m2/reminder-window.ts','lib/careflow-m2/withdrawal-coherence.ts',
 'lib/repositories/careflowM2.ts','hooks/useCareFlowM2.ts','components/saude/WithdrawalConflictReviewM2.tsx',
 'app/saude/careflow/page.tsx','app/saude/careflow/exames/page.tsx','app/saude/careflow/pressao/page.tsx',
 'app/saude/careflow/sintomas/page.tsx','app/saude/careflow/relatorios/page.tsx']){
  const src=text(p);const transpiled=ts.transpileModule(src,{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  const errors=(transpiled.diagnostics||[]).filter(d=>d.category===1);
  yes(!errors.length,p+' syntax: '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(','));
}
console.log(`VAULT M2 CareFlow: ${passed} contratos direcionados aprovados (TypeScript e V63 em seguida).`);
