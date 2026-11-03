#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
let checks=0;
const ok=(cond,desc)=>{assert.ok(cond,'M23 '+desc);checks++;console.log('✓ M23 '+desc)};
const paths=['lib/today/acquisition-date-index.ts','lib/today/build-timeline-items.ts',
  'lib/today/retro-review-projection.ts','lib/dose-slot-authority.ts'];
for(const p of paths){
 const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 ok(ast.parseDiagnostics.length===0,'TypeScript parse '+p);
}
const body=read(paths[1]),retroSource=read(paths[2]),slotSource=read(paths[3]);
const gate=read('scripts/test-v63-release-gate.mjs');
const m19=read('scripts/test-vault-m19-today-projection-hotpath.cjs');
const v94=read('scripts/test-v94-sos-after-discontinuation-contract.mjs');
const v346=read('scripts/test-v346-today-home-projection-avatar.cjs');
const m16=read('scripts/test-vault-m16-today-data-evidence-fenix.cjs');
ok(m19.includes("const acquisitionModule=load('lib/today/acquisition-date-index.ts')") &&
   m19.includes("'@/lib/today/acquisition-date-index':acquisitionModule"),
   'legacy M19 mock loader resolves real acquisition module');
ok(v94.includes('"@/lib/today/acquisition-date-index":acquisitionSandbox.exports') &&
   v94.includes('r("lib/today/acquisition-date-index.ts")'),
   'legacy V94 SOS runtime resolves real acquisition module');
ok(v346.includes('firstAcquisitionByMedication.get(med.id)') &&
   !v346.includes('\"renewalsByMedication\"'),
   'legacy V346 asserts the new linear acquisition index');
ok(m16.includes("const puritySource = projection.replaceAll('logsBySlot.add(', '')") &&
   m16.includes('const logsBySlot = new Set<string>();') &&
   m16.includes("const acquisitionIndex=load('lib/today/acquisition-date-index.ts')") &&
   m16.includes("'@/lib/today/acquisition-date-index':acquisitionIndex") &&
   m16.includes('new Brain projection and panel are pure'),
   'M16 distinguishes in-memory Set evidence from persistence and loads real acquisition helper');
ok(gate.includes('scripts/test-vault-m23-history-hotpath.cjs')&&
 gate.includes('scripts/test-vault-m22-timeline-reconciliation.cjs')&&
 gate.includes('scripts/test-vault-m21-committed-card-render.cjs')&&
 gate.includes('scripts/test-vault-m20-owner-day-dose-read.cjs'),'release gate keeps M20-M23');
ok(body.includes('firstAcquisitionByMedication.get(med.id)')&&
 body.includes('const historyByMedication = groupedBy(input.historicoDoses')&&
 body.includes('const comportamento = analisarComportamentoUso('),'dates faster, longitudinal insight unchanged');
ok(retroSource.includes('hasUnconfirmedSlot')&&
 !retroSource.includes('pendingDates.includes(cursor)')&&
 retroSource.includes('confidence: "bounded"'),'pending dates linear, uncertainty unchanged');
ok(slotSource.includes('let taken=false,ignored=false,latest:DoseLog|null=null;')&&
 slotSource.includes('taken&&ignored?"conflict"')&&
 slotSource.includes('const records=index.get('),'one-pass slot resolution retains conflicts and ownership');
const compile=p=>ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(p,imports={}){
 const m=new Module(p,module);m.require=id=>{
  if(Object.prototype.hasOwnProperty.call(imports,id))return imports[id];
  throw Error('M23 unexpected import '+id);
 };m._compile(compile(p),p);return m.exports;
}
const helper=load(paths[0]).earliestAcquisitionByMedication;
const oldFirst=(rows,id)=>rows.filter(r=>r.medicamento_id===id)
 .map(r=>String(r.data_aquisicao||r.data||'').slice(0,10))
 .filter(s=>/^\d{4}-\d{2}-\d{2}$/.test(s)).sort()[0];
const acquisitions=[
 {medicamento_id:'m1',data:'2024-12-30'},
 {medicamento_id:'m1',data_aquisicao:'2025-01-02T23:59:00',data:'2022-01-01'},
 {medicamento_id:'m1',data:'2020-01-02'},
 {medicamento_id:'m1',data_aquisicao:'desconhecido',data:'2021-01-01'},
 {medicamento_id:'m2',data:'2025-12-01'},
 {medicamento_id:'m2',data:'2025-01-01'},
 {medicamento_id:'',data:'2000-01-01'},
 {medicamento_id:'m3',data:'invalid'},
 {medicamento_id:'m4',data:'0000-00-00'},
 ];
const a=helper(acquisitions);
for(const id of ['m1','m2','m3','m4','empty'])ok(a.get(id)===oldFirst(acquisitions,id),'acquisition date precedence '+id);
ok(a.get('m1')==='2020-01-02'&&a.get('m4')==='0000-00-00','first valid-shaped date, no inferred clinical validity');
const dense=Array.from({length:12000},(_,i)=>({medicamento_id:'m'+(i%40),data:`${2020+(i%5)}-${String(1+i%12).padStart(2,'0')}-${String(1+i%27).padStart(2,'0')}`}));
const all=helper(dense);
for(let i=0;i<40;i++)assert.equal(all.get('m'+i),oldFirst(dense,'m'+i));
ok(all.size===40,'12k acquisition records across 40 medications exact minimum');
const realSlots=load(paths[3]);
const oldResolve=(records)=>{
 if(!records.length)return {state:'absent',records,latest:null};
 const taken=records.some(r=>Boolean(r.tomado_em));
 const ignored=records.some(r=>Boolean(r.ignorado_em));
 const latest=records.reduce((current,r)=>!current||String(r.updated_at||r.created_at||'')>String(current.updated_at||current.created_at||'')?r:current,null);
 return {state:taken&&ignored?'conflict':taken?'taken':ignored?'ignored':'pending',records,latest};
};
const fixture=[
 {id:'1',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-11-02',horario:'23:00',created_at:'2026-11-02T06:00',tomado_em:'2026-11-02T23:30'},
 {id:'2',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-11-02',horario:'23:00',created_at:'2026-11-02T06:00',ignorado_em:'2026-11-02T06:01'},
 {id:'3',user_id:'u2',person_id:'p1',medicamento_id:'m1',data:'2026-11-02',horario:'23:00',created_at:'2026-11-03T06:00',tomado_em:'2026-11-02T06:01'},
 {id:'4',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-11-02',horario:'09:00',created_at:'2026-11-03T06:00',dose_kind:'sos',tomado_em:'2026-11-02T09:00'},
 {id:'5',user_id:'u1',person_id:'p1',medicamento_id:'m2',data:'2026-11-02',horario:'08:00',dose_kind:'planned'},
 ];
const index=realSlots.buildDoseSlotIndex(fixture,{userId:'u1',personId:'p1'});
const snap=realSlots.resolveDoseSlot(index,'m1','2026-11-02','23:00');
assert.deepEqual(snap,oldResolve(fixture.slice(0,2)));
ok(snap.state==='conflict'&&snap.records.length===2&&snap.latest===fixture[0],'conflicts, owner and oldest-tie winner preserved');
ok(realSlots.resolveDoseSlot(index,'m1','2026-11-02','09:00').state==='absent','SOS not silently treated as scheduled');
ok(realSlots.resolveDoseSlot(index,'m2','2026-11-02','08:00').state==='pending','planned does not prove taken');
for(const rows of [[],[fixture[0]],[fixture[1]],fixture.slice(0,2),
 Array.from({length:10000},(_,i)=>({id:'r'+i,created_at:`${i}`,tomado_em:i%3===0?'yes':null,ignorado_em:i%4===0?'yes':null}))]){
 const k='m1|2026-11-02|23:00';const idx=new Map([[k,rows]]);
 assert.deepEqual(realSlots.resolveDoseSlot(idx,'m1','2026-11-02','23:00'),oldResolve(rows));
 checks++;
}
ok(true,'empty, taken, ignored, conflict and 10k same-slot legacy records identical');
const plus=(day,n)=>{const d=new Date(day+'T12:00:00.000Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const retro=load(paths[2],{'@/lib/health-utils':{addDaysToLocalDate:plus},'@/lib/today/acquisition-date-index':{earliestAcquisitionByMedication:helper}}).buildTodayRetroReviewSummary;
function oldRetro(input){
 if(!input.enabled||!input.medicationId)return null;
 const med=input.medications.find(x=>x.id===input.medicationId);if(!med)return null;
 const times=[...new Set((med.estoque_horarios||[]).map(x=>String(x||'').trim()).filter(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x)))].sort();
 const acquisitionDates=input.renewals.filter(x=>x.medicamento_id===med.id).map(x=>String(x.data_aquisicao||x.data||'').slice(0,10)).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
 const created=String(med.created_at||'').slice(0,10);const startDate=acquisitionDates[0]||(/^\d{4}-\d{2}-\d{2}$/.test(created)?created:null)||med.estoque_data_referencia||med.data_receita||null;
 const empty=confidence=>({medicamento:med,startDate,horarios:times,totalSlots:0,confirmedSlots:0,pendingSlots:0,pendingDates:[],firstPendingDate:null,confidence});
 if(!startDate||!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!times.length)return empty('limited');
 const yesterday=plus(input.today,-1);if(!yesterday||startDate>yesterday)return empty('bounded');
 const slots=new Set(input.doseLogs.filter(x=>x.medicamento_id===med.id&&x.person_id===input.personId).map(x=>`${x.data}|${x.horario}`));
 const pendingDates=[];let cursor=startDate,totalSlots=0,confirmedSlots=0,guard=0;
 while(cursor<=yesterday&&guard<3660){
  for(const time of times){totalSlots++;if(slots.has(`${cursor}|${time}`))confirmedSlots++;else if(!pendingDates.includes(cursor))pendingDates.push(cursor);}
  const next=plus(cursor,1);if(!next||next===cursor)break;cursor=next;guard++;
 }
 pendingDates.sort();return {medicamento:med,startDate,horarios:times,totalSlots,confirmedSlots,pendingSlots:Math.max(0,totalSlots-confirmedSlots),pendingDates,firstPendingDate:pendingDates[0]||null,confidence:'bounded'};
}
const medication={id:'m1',nome:'Teste',estoque_horarios:['08:00','23:00','23:00','12:30'],created_at:'2026-10-27'};
const logs=[{medicamento_id:'m1',person_id:'p1',data:'2026-11-01',horario:'08:00'},
{medicamento_id:'m1',person_id:'p1',data:'2026-10-31',horario:'23:00'},
{medicamento_id:'m1',person_id:'p2',data:'2026-11-01',horario:'23:00'},
{medicamento_id:'m2',person_id:'p1',data:'2026-11-01',horario:'12:30'}];
const common={enabled:true,medicationId:'m1',medications:[medication],renewals:[],doseLogs:logs,personId:'p1',today:'2026-11-02'};
for(const scenario of [common,{...common,enabled:false},{...common,medicationId:'missing'},
{...common,medications:[{...medication,estoque_horarios:[]}]},
{...common,renewals:[{medicamento_id:'m1',data_aquisicao:'2026-10-30'},{medicamento_id:'m1',data_aquisicao:'2026-10-25'}]},
{...common,medications:[{...medication,created_at:'2026-11-03'}]},
{...common,personId:'p2'},
{...common,today:'2026-11-10'},
{...common,medications:[{...medication,created_at:'2010-01-01',estoque_horarios:['08:00','23:00']}],today:'2026-11-02'}]){
 const old=oldRetro(scenario),newer=retro(scenario);
 assert.deepEqual(newer,old);checks++;
}
ok(true,'retro-review same dates, owner-scope, no evidence inference and 3660-day limit');
// M47 CI: carregamento do estoque clinico real; isolamos apenas o estimador.
const clinicalStock=load('lib/health-intelligence/clinical-stock.ts',{
 '@/lib/health-utils':{computeEstoqueInfo:med=>({
  quantidadeRestante:med.estoque_quantidade,
  diasRestantes:null,
  estimativaDosesDisponivel:false,
 })},
});
ok(clinicalStock.getClinicalStockSnapshot({estoque_quantidade:null}).state==='unknown' &&
   clinicalStock.getClinicalStockSnapshot({estoque_quantidade:0}).state==='empty',
   'unknown stock remains distinct from confirmed zero');
const builder=load(paths[1],{
 '@/lib/today/acquisition-date-index':{earliestAcquisitionByMedication:helper},
 '@/lib/dose-slot-authority':{buildDoseSlotIndex:realSlots.buildDoseSlotIndex,resolveDoseSlot:realSlots.resolveDoseSlot},
 '@/lib/health-intelligence/clinical-stock':clinicalStock,
 '@/lib/health-utils':{computeEstoqueInfo:()=>({quantidadeRestante:5}),getDaysUntil:()=>null},
 '@/lib/health-insights':{analisarComportamentoUso:()=>null,isReceitaAtualVencida:()=>false,sugerirRenovacao:()=>({deveRenovar:false,mensagem:'',urgencia:'nenhuma'})},
}).buildTodayTimelineItems;
const mk=(renewals)=>builder({medicamentos:[{...medication,tipo_uso:'continuo',status:'ativo',cor_principal:'#fff'}],doseLogs:[],medicos:[],tratamentos:[],farmacias:[],hospitais:[],historicoDoses:[],registros:[],renovacoes:renewals,dataSelecionada:'2026-11-02',isHoje:true,userId:'u1',personId:'p1'});
ok(mk(acquisitions).length===3&&mk([{medicamento_id:'m1',data:'2026-11-03'}]).length===0,'actual Today builder still respects documented start-date boundary');
console.log('VAULT M23:',checks,'checks passed; historic absent data never inferred missed');
