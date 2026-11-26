'use strict';
// The same canonical reader is exercised through real clinical projections, no data mutation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(name){const f=path.resolve(root,name);assert(f.startsWith(root+'/lib/')&&f.endsWith('.ts'));if(cache.has(f))return cache.get(f).exports;const m={exports:{}};cache.set(f,m);const code=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',code)(m,m.exports,id=>load(id.startsWith('@/lib/')?id.slice(2)+'.ts':id.startsWith('.')?path.resolve(path.dirname(f),id)+'.ts':(()=>{throw Error('Unexpected dependency '+id)})()));return m.exports;}
const {classifyDoseRealization:classify}=load('lib/dose-slot-authority.ts');
const {projectLongitudinalA10:project}=load('lib/a10/longitudinal.ts');
const {buildDoseMonthMetrics:metrics}=load('lib/health-intelligence/dose-month-metrics.ts');
const {buildMedicationDoseHistoryMonth:history}=load('lib/medication-dose-history.ts');
const {buildBrainEvidenceWindowCI360:brain}=load('lib/health-intelligence/brain-evidence-window-ci360.ts');
const {buildBrainLongitudinalCI360:long}=load('lib/health-intelligence/brain-longitudinal-ci360.ts');
const {clinicalLongitudinalEvidenceP6:p6}=load('lib/health-intelligence/clinical-longitudinal-evidence-p6.ts');
const {buildClinicalReport360:report}=load('lib/clinical-report-360.ts');
const {buildClinicalMonthReport:month}=load('lib/clinical-month-report.ts');
let n=0;function eq(a,b,label){assert.deepEqual(a,b,label);console.log('PASS '+(++n)+' '+label);}
const owner={user_id:'u',person_id:'p'},med={...owner,id:'m',nome:'Synthetic',status:'ativo',tipo_uso:'continuo',estoque_horarios:['08:00']};
const actual='2026-11-26T01:30:00Z',date='2026-11-25';
const row=(id,kind,fields={})=>({...owner,id,medicamento_id:'m',data:date,horario:String(id).padStart(2,'0')+':00',dose_kind:kind,quantidade:1,created_at:'2026-11-24T12:00:00Z',...fields});
const rows=[row('1','scheduled',{tomado_em:actual}),row('2','planned',{tomado_em:actual}),row('3','scheduled',{ignorado_em:actual}),row('4','planned',{ignorado_em:actual}),row('5','scheduled'),row('6','planned'),row('7','scheduled',{tomado_em:actual,ignorado_em:actual}),row('8','planned',{tomado_em:actual,ignorado_em:'invalid'}),row('9','scheduled',{tomado_em:'2026-11-26T01:30:00'}),row('10','planned',{tomado_em:'2026-02-30T01:30:00Z'}),row('11','planned',{ignorado_em:'2026-11-26T01:30:00-00:00'}),row('12','sos',{tomado_em:actual}),row('13','planned',{tomado_em:actual,person_id:'other'}),row('14','planned',{tomado_em:actual,user_id:'other'})];
const snapshot=JSON.stringify(rows),data={medicamentos:[med],doseLogs:rows};
const facts=(tz)=>project(data,'u','p',false,tz).facts;const f=facts('America/Sao_Paulo');const get=id=>f.find(x=>x.id===id);
for(const id of ['1','2']){eq(get(id).status,'Tomada registrada','taken '+id);eq(get(id).dateKind,'factual','factual '+id);}
for(const id of ['3','4']){eq(get(id).status,'Ignorada — informada','ignored '+id);eq(get(id).dateKind,'factual','ignored marking '+id);}
eq(get('5').dateKind,'scheduled','routine pending');eq(get('6').dateKind,'planned','explicit planning');
for(const id of ['7','8']){eq(get(id).dateKind,'unknown','conflict not planning '+id);eq(get(id).status.includes('contraditório'),true,'conflict '+id);eq(get(id).day,null,'no invented day '+id);}
for(const id of ['9','10','11']){eq(classify(rows.find(x=>x.id===id)).state,'unknown','invalid or ambiguous '+id);eq(get(id).day,null,'no fallback registration '+id);}
eq(get('2').day,'2026-11-25','São Paulo actual civil day');eq(facts('UTC').find(x=>x.id==='2').day,'2026-11-26','UTC actual civil day');eq(facts('America/New_York').find(x=>x.id==='2').day,'2026-11-25','New York actual civil day');eq(facts('Invalid/Zone').find(x=>x.id==='2').dateKind,'unknown','invalid timezone');eq(get('2').detail.includes(actual),true,'original timestamp preserved');eq(get('2').detail.includes('25/11/2026'),true,'scheduled day distinct');eq(f.length,12,'owner isolation');
const m=metrics({logs:rows,personId:'p',userId:'u',today:'2026-11-26'});eq([m.total.taken,m.total.ignored,m.total.conflicts,m.total.unconfirmed,m.total.sos],[2,2,5,2,1],'registered slot metrics');
const h=history({medication:med,logs:rows,monthKey:'2026-11',today:'2026-11-26'});eq(h.days.flatMap(d=>d.events).find(x=>x.id==='2').kind,'scheduled_taken','historical planned realization');eq(h.days.flatMap(d=>d.events).find(x=>x.id==='4').kind,'scheduled_ignored','historical planned ignored');
const c={userId:'u',personId:'p',hoje:'2026-11-26',medicamentos:[med],doseLogs:rows,registrosSaude:[],consultas:[],retiradas:[],renovacoes:[],tratamentos:[],documentos:[]};
const b=brain(c,'2026-11-26T12:00:00Z');eq([b.confirmed30d,b.ignored30d,b.confirmed24h,b.plannedConfirmed24h],[3,2,3,1],'Brain P1 planned confirmed');
const l=long(c,'2026-11-26T12:00:00Z').periods[0];eq([l.confirmedScheduled,l.confirmedPlanned,l.explicitlyIgnored,l.confirmedSos,l.conflictsExcluded,l.unverifiedClockExcluded],[1,1,2,1,2,3],'Brain P3 realization parity');
const p=p6({owner,today:c.hoje,days:30,doses:rows,symptoms:[],consultations:[],medications:[med],withdrawals:[],acquisitions:[]});eq([p.taken,p.ignored,p.extra],[3,2,1],'P6 factual count');
const r=report({context:c,ledger:[],ownerId:'u',personId:'p',personName:'Synthetic',start:'2026-11-01',end:c.hoje,sections:['doses'],mode:'factual'});eq([r.summary.confirmed,r.summary.explicitlyIgnored],[3,2],'Report360 factual counts');
const mo=month({monthKey:'2026-11',userId:'u',personId:'p',doseLogs:rows,medications:[med],healthRecords:[],brainLedger:[]});eq([mo.summary.taken,mo.summary.ignored],[3,2],'monthly report factual counts');eq(mo.doses.find(x=>x.id==='2').confirmedAt,actual,'monthly actual timestamp');eq(JSON.stringify(rows),snapshot,'all original facts untouched');
// Ownership transfer: reconcile the residual equivalence expectations against the final Guardian semantics.
const {explainBrainA10}=load('lib/a10/brain-evidence.ts'),{compareConsumerA10,safeA10ReportScope}=load('lib/a10/consumer-parity.ts');
const {filterLongitudinalA10}=load('lib/a10/longitudinal.ts');
const one=(fields={})=>project({medicamentos:[med],doseLogs:[Object.freeze({...rows[1],...fields})]},'u','p',false,'America/Sao_Paulo').facts;
const valid=one()[0],alert={key:'a',person_id:'p',snapshot:{entidade_tipo:'medicamento',entidade_id:'m',entidade_ids:[]}};
const linked=explainBrainA10(alert,[valid],'u','p');eq([linked.state,linked.facts[0].id,linked.facts[0].status,linked.facts[0].dateKind],['linked','2','Tomada registrada','factual'],'Brain A10 ID and factual parity');
const candidate={authority:valid.authority,id:valid.id,userId:'u',personId:'p',status:valid.status};
eq(compareConsumerA10([valid],[candidate],'careflow','u','p').length,0,'consumer parity');
eq(compareConsumerA10([valid],[{...candidate,status:'Registro contraditório — conferir origem'}],'careflow','u','p')[0].type,'different_state','reject old state');
eq(compareConsumerA10([valid],[],'careflow','u','p',[valid.key])[0].type,'missing','reject missing ID');
eq(explainBrainA10(alert,[valid],'u','other').state,'wrong_scope','Brain person switch');
eq(safeA10ReportScope('u','p',{uid:'u',pid:'other'},[valid]).length,0,'stale report selection');
eq(filterLongitudinalA10([valid],{domain:'doses',query:'Tomada registrada',from:date,to:date}).length,1,'Linha Clínica filter');
eq(one({deleted_at:actual}).length,0,'deleted dose excluded');
eq(one({user_id:'other'}).length,0,'other account excluded');
eq(one({tomado_em:undefined})[0].dateKind,'planned','Brain association with plan is not realization');
eq(one({dose_kind:'scheduled',tomado_em:undefined})[0].dateKind,'scheduled','routine distinct from plan');
eq(one({tomado_em:undefined,ignorado_em:undefined,dose_kind:'sos'})[0].dateKind,'unknown','unconfirmed SOS no factual date');
eq(one({tomado_em:'not a timestamp'})[0].dateKind,'unknown','invalid timestamp has no factual date');
eq(one({tomado_em:undefined,ignorado_em:actual})[0].status,'Ignorada — informada','planned ignored ownership parity');
eq(one({tomado_em:actual,ignorado_em:actual})[0].dateKind,'unknown','conflict ownership parity');
eq(one({tomado_em:actual,ignorado_em:actual,dose_kind:undefined})[0].dateKind,'unknown','legacy conflict ownership parity');
const v52=load('lib/health-intelligence/brain-v52-context.ts').v52ExplicitSkippedDays;
const yesterday='2026-11-25',skip={...row('25','planned',{data:yesterday,horario:'08:00',ignorado_em:'2026-11-25T08:00:00Z'})};
eq(v52(med,[skip],'2026-11-26',14,Date.parse('2026-11-26T12:00:00Z')).days,1,'planned ignored counts only with evidence');
eq(v52(med,[skip,{...skip,id:'26',tomado_em:actual}],'2026-11-26',14,Date.parse('2026-11-26T12:00:00Z')).days,0,'contradictory routine never counted as fully ignored');
console.log('MACRO02_A10_DOSE_ORIGIN_GATE_OK | assertions='+n);
