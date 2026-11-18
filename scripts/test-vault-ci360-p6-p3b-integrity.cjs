/* CI360 P6 P3-B — teste de codigo real, sem rede/banco/escrita. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
function load(path,aliases={}){
  const code=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const m={exports:{}};
  vm.runInNewContext(code,{module:m,exports:m.exports,require:id=>{
    if(Object.prototype.hasOwnProperty.call(aliases,id))return aliases[id];
    throw Error(`CI360 P3B: unexpected dependency ${id} in ${path}`);
  },Date,Array,Object,Map,Set,Boolean,Number,String,RegExp,JSON,Error,Math,console}, {filename:path,timeout:8000});
  return m.exports;
}
const coh=load('lib/careflow-m2/withdrawal-coherence.ts');
const agenda=load('lib/withdrawal-agenda.ts',{'@/lib/careflow-m2/withdrawal-coherence':coh});
const m=load('lib/withdrawal-operational-p6p3b.ts',{'@/lib/withdrawal-agenda':agenda,'@/lib/careflow-m2/withdrawal-coherence':coh});
const docs=load('lib/sync/document-pull-guard-p6p3b.ts');
const base={user_id:'owner-A',person_id:'person-A',medicamento_id:'med-met-10',fornecimento_ciclo_id:'cycle-1',data:'2026-11-17',status:'agendada'};
const w=(id,more={})=>({...base,id,...more});
const pending=w('pending');
const finished=w('finished',{status:'realizada',realizada_em:'2026-11-17T15:00:00-03:00'});
const same=[pending,finished];
assert.equal(m.withdrawalReadStateP6P3B(pending,same),'revisar','pending with proved same cycle/day remains review');
assert.equal(m.withdrawalReadStateP6P3B(finished,same),'realizada');
const actual=w('old-status',{realizada_em:'2026-11-17T16:00:00-03:00'});
assert.equal(m.withdrawalReadStateP6P3B(actual,[actual]),'realizada_vinculada','own recorded completion suppresses old scheduled badge');
assert.equal(m.withdrawalMatchesFilterP6P3B(actual,[actual],'2026-11-18','atrasada'),false);
assert.equal(m.withdrawalMatchesFilterP6P3B(actual,[actual],'2026-11-18','realizada'),true);
const future=w('future',{data:'2026-12-18'});
const anotherCycle=w('new-cycle',{fornecimento_ciclo_id:'cycle-2'});
const anotherPerson=w('other-person',{person_id:'person-B'});
const anotherOwner=w('other-owner',{user_id:'owner-B'});
const anotherDay=w('other-day',{data:'2026-11-18'});
for(const row of [future,anotherCycle,anotherPerson,anotherOwner,anotherDay]){
  const finishedLike={...finished,id:'other-finished'};
  assert.equal(m.withdrawalReadStateP6P3B(row,[row,finishedLike]),'agendada','different owner/person/cycle/day still scheduled');
}
const canceled=w('cancelled',{status:'cancelada'});
assert.equal(m.withdrawalReadStateP6P3B(canceled,[canceled]),'cancelada');
const contradictory=w('contradictory',{status:'cancelada',realizada_em:'2026-11-17T15:00:00Z'});
assert.equal(m.withdrawalReadStateP6P3B(contradictory,[contradictory]),'revisar');
const ignored=w('ignored',{status:'nao_realizada'});
assert.equal(m.withdrawalReadStateP6P3B(ignored,[ignored]),'nao_realizada');
const rows=[pending,finished,actual,future,anotherCycle,canceled,contradictory,ignored];
const snapshot=JSON.stringify(rows);
const idx=m.withdrawalReadMapP6P3B(rows);
assert.equal(idx.size,rows.length);
const counts=m.withdrawalSummaryP6P3B(rows,'2026-11-18',idx);
assert.equal(counts.total,8);
assert.equal(counts.revisar,2);
assert.equal(counts.realizadas,2);
assert.equal(counts.agendadas,2);
assert.equal(counts.atrasadas,1);
assert.equal(JSON.stringify(rows),snapshot,'no clinical record mutation');
assert.equal(m.withdrawalMatchesFilterP6P3B(pending,rows,'2026-11-18','revisar',idx),true);
assert.equal(m.withdrawalMatchesFilterP6P3B(pending,rows,'2026-11-18','agendada',idx),false);
assert.equal(m.withdrawalMatchesFilterP6P3B(future,rows,'2026-11-18','agendada',idx),true);
assert.equal(m.withdrawalMatchesFilterP6P3B(future,rows,'2026-11-18','atrasada',idx),false);

const good=docs.documentPullResultP6P3B({own:[{id:'a'}],shared:[{id:'b'}],ownError:null,sharedError:null,sharedRequired:true});
assert.equal(good.error,null);assert.equal(good.data.length,2);
const absentShared=docs.documentPullResultP6P3B({own:[{id:'a'}],shared:[],ownError:null,sharedError:null,sharedRequired:false});
assert.equal(absentShared.data.length,1);
for(const input of [
  {own:null,shared:[],ownError:null,sharedError:null,sharedRequired:false},
  {own:[{id:'a'}],shared:[],ownError:{message:'RLS denied'},sharedError:null,sharedRequired:false},
  {own:[{id:'a'}],shared:[{id:'b'}],ownError:null,sharedError:{message:'network error'},sharedRequired:true},
  {own:[{id:'a'}],shared:null,ownError:null,sharedError:null,sharedRequired:true},
  {own:Array.from({length:900},(_,i)=>({id:String(i)})),shared:[],ownError:null,sharedError:null,sharedRequired:false},
]){
  const result=docs.documentPullResultP6P3B(input);
  assert.equal(result.data,null,'partial result must not masquerade as valid empty data');
  assert.ok(result.error?.message);
}
const empty=docs.documentPullResultP6P3B({own:[],shared:[],ownError:null,sharedError:null,sharedRequired:false});
assert.equal(empty.error,null);assert.equal(empty.data.length,0,'real remote empty result preserved without deletion assumption');

const page=read('app/saude/retiradas/page.tsx');
const pull=read('lib/sync/pull.ts');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const token of ['operationalMapP6P3B','withdrawalSummaryP6P3B','withdrawalMatchesFilterP6P3B','"revisar", "Conferir vínculos"','operationalMapP6P3B.get(row) === "agendada"','Concluída (vínculo)','Conferir vínculo'])
  assert.ok(page.includes(token),`retiradas page lost ${token}`);
assert.ok(pull.includes('documentPullResultP6P3B<RemoteRow>')&&pull.includes('sharedDocumentsError=error')&&pull.includes('error: documentDecisionP6P3B.error'),'errors are not laundered to success');
assert.ok(!pull.includes('error:\n            null,\n        }),\n    });\n\n    // ==========================================================\n    // SAÚDE'),'old false success branch must disappear');
assert.equal(gate.split('"scripts/test-vault-ci360-p6-p3b-integrity.cjs"').length-1,1);
for(const token of ['scripts/test-vault-ci360-m3-p3.cjs','scripts/test-vault-ui360-r5.cjs','scripts/test-vault-ci360-p6-p3-premium-pdf.cjs'])assert.ok(gate.includes(token));
console.log('VAULT CI360 P6 P3-B: retirada/ciclo/titular, filtros, prescricao intacta, documentos fail-closed e V63 OK');
