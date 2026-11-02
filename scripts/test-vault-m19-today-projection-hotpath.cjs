#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
const ok=(condition,label)=>{assert.ok(condition,'M19 '+label);checks++;console.log('M19 ✓ '+label)};
const files=['lib/today/build-timeline-items.ts','lib/dose-schedule-groups.ts','scripts/test-v63-release-gate.mjs'];
for(const p of files){const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS);ok(ast.parseDiagnostics.length===0,'sintaxe '+p);}
const buildSource=read(files[0]), groupSource=read(files[1]), gate=read(files[2]);
ok(!buildSource.includes('list.some(item => item.logId === log.id)')&&buildSource.includes('existingLogIds.has(log.id)')&&buildSource.includes('existingLogIds.add(log.id)'),'duplicatas usam Set de IDs, sem varreduras de cards');
ok(buildSource.includes('const existingLogIds = new Set(list.map(item => item.logId))'),'registros legados sem ID preservam semântica anterior');
ok(buildSource.includes('const unidadeDose = doseUnit(med);')&&buildSource.includes('const diasRestantes = getDaysUntil(med.proxima_renovacao);'),'derivações por medicamento não repetidas por horário');
ok(groupSource.includes('for(const {item} of group.entries)')&&groupSource.includes('pending.push(item)')&&groupSource.includes('unavailable++'),'agrupamento de horários em passagem única');
ok(gate.includes('scripts/test-vault-m19-today-projection-hotpath.cjs')&&gate.includes('scripts/test-vault-m18-today-hotpath.cjs')&&gate.includes('scripts/test-vault-m17-today-dose-performance.cjs'),'gate inclui M17, M18 e M19');
function load(p,imports={}){const code=ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const mod=new Module(p,module);mod.require=id=>{if(Object.prototype.hasOwnProperty.call(imports,id))return imports[id];throw Error('M19 unexpected import '+id)};mod._compile(code,p);return mod.exports;}
const grouping=load('lib/dose-schedule-groups.ts');
const oldGroup=items=>{const groups=new Map();items.forEach((item,index)=>{const key=item.medicamentoId&&!item.isAvulsa&&!item.isSintoma&&item.doseKind!=='planned'?`time:${item.horario}`:`single:${index}`;let group=groups.get(key);if(!group){group={key,entries:[]};groups.set(key,group);}group.entries.push({item,index});});return [...groups.values()].map(group=>{const slots=group.entries.map(entry=>entry.item),pending=slots.filter(x=>!x.tomada&&!x.ignorada);return {...group,slots,pending,resolved:slots.length-pending.length,unavailable:pending.filter(x=>typeof x.estoqueRestante==='number'&&x.estoqueRestante<=0).length};});};
const slots=[
 {medicamentoId:'a',horario:'08:00',tomada:false,ignorada:false,estoqueRestante:0},
 {medicamentoId:'b',horario:'08:00',tomada:true,ignorada:false,estoqueRestante:0},
 {medicamentoId:'c',horario:'08:00',tomada:false,ignorada:true,estoqueRestante:1},
 {medicamentoId:'d',horario:'08:00',tomada:false,ignorada:false,estoqueRestante:null},
 {medicamentoId:'e',horario:'08:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'sos',estoqueRestante:0},
 {medicamentoId:'f',horario:'08:00',tomada:false,ignorada:false,isAvulsa:true,doseKind:'planned'},
 {medicamentoId:'g',horario:'12:00',tomada:false,ignorada:false,isSintoma:true},
 {medicamentoId:'h',horario:'20:00',tomada:false,ignorada:false,estoqueRestante:-1},
 {medicamentoId:'i',horario:'20:00',tomada:false,ignorada:false,isExpectedUnconfirmed:true},
];
for(const fixture of [[],slots,slots.slice(0,1),Array.from({length:2000},(_,i)=>({...slots[i%slots.length],medicamentoId:'m'+i,horario:i%2?'08:00':'20:00'}))]){
  const before=JSON.stringify(fixture);
  assert.deepEqual(grouping.groupScheduleSlots(fixture),oldGroup(fixture));
  ok(JSON.stringify(fixture)===before,'agrupamento preserva ordem, pendência, saldo e não altera entrada; '+fixture.length+' slots');
}
const counters={days:0,stock:0,behavior:0};
const builder=load('lib/today/build-timeline-items.ts',{
  '@/lib/dose-slot-authority':{buildDoseSlotIndex:()=>new Map(),resolveDoseSlot:()=>({state:'absent'})},
  '@/lib/health-utils':{computeEstoqueInfo:()=>{counters.stock++;return {quantidadeRestante:6}},getDaysUntil:()=>{counters.days++;return 5}},
  '@/lib/health-insights':{analisarComportamentoUso:()=>{counters.behavior++;return null},isReceitaAtualVencida:()=>false,sugerirRenovacao:()=>({deveRenovar:false,mensagem:'',urgencia:'nenhuma'})},
}).buildTodayTimelineItems;
function input(medications,logs){return {medicamentos:medications,doseLogs:logs,medicos:[],tratamentos:[],farmacias:[],hospitais:[],historicoDoses:[],registros:[],renovacoes:[],dataSelecionada:'2026-11-02',isHoje:true,userId:'u1',personId:'p1'};}
const med={id:'m1',nome:'Teste',tipo_uso:'continuo',status:'ativo',estoque_horarios:['08:00','20:00'],created_at:'2026-10-01',estoque_unidade_por_dose:1,estoque_unidade_medida:'comprimidos'};
const log=(id,kind,time,taken=true)=>({id,medicamento_id:'m1',horario:time,dose_kind:kind,tomado_em:taken?'2026-11-02T12:00:00Z':null,data:'2026-11-02',quantidade:1});
const data=[log('a','sos','12:00'),log('a','sos','12:00'),log('b','extra','13:00'),log('c','planned','16:00',false),log(undefined,'sos','17:00'),log('d','scheduled','08:00')];
let rows=builder(input([med],data));
ok(rows.length===5&&rows.filter(x=>x.isAvulsa).length===3,'duas doses programadas + SOS + extra + planejada, sem ID duplicado ou legado incompleto');
ok(rows.filter(x=>x.isAvulsa).map(x=>x.logId).join(',')==='a,b,c','primeira ocorrência de log duplicado prevalece e SOS sem ID mantém semântica antiga');
ok(rows.find(x=>x.logId==='c')?.doseKind==='planned'&&rows.find(x=>x.logId==='c')?.tomada===false,'agendada continua não tomada, sem baixa fictícia');
ok(counters.days===1&&counters.stock===1&&counters.behavior===1,'cálculos clínicos por medicamento apenas uma vez para dois horários');
ok(rows.filter(x=>!x.isAvulsa).every(x=>x.diasRestantes===5&&x.unidadeDose==='comprimidos'),'todos os slots preservam metadados por medicamento');
// Legacy behavior when no scheduled row exists: first record without ID was previously accepted,
// the second was suppressed by list.some(logId===undefined). That remains exact.
const sosMed={...med,tipo_uso:'sos'};
rows=builder(input([sosMed],[log(undefined,'sos','12:00'),log(undefined,'sos','14:00')]));
ok(rows.length===1&&rows[0].isAvulsa,'legado sem ID continua a deduplicar primeira ocorrência quando não há rotina');
// Actual large cases must retain every unique id; no wall-clock threshold is imposed on Android.
const dense=Array.from({length:4000},(_,i)=>log('id-'+i,'extra',String(i%24).padStart(2,'0')+':00'));
const denseRows=builder(input([sosMed],dense));
ok(denseRows.length===4000&&new Set(denseRows.map(x=>x.logId)).size===4000,'quatro mil eventos únicos continuam visíveis e ordenados');
console.log('VAULT M19: '+checks+' verificações estruturais/comportamentais aprovadas; sem alegar ganhos medidos no celular');
