#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
let n=0;
const ok=(condition,label)=>{assert.ok(condition,'CI360 P3: '+label);console.log('✓ P3 '+(++n)+' '+label)};
const files=[
 'lib/health-intelligence/brain-longitudinal-ci360.ts',
 'lib/health-intelligence/active-probing/governance-ci360.ts',
 'components/health-intelligence/BrainLongitudinalCI360.tsx',
 'components/health-intelligence/ProbeGovernanceCI360.tsx',
 'components/health-intelligence/BrainActiveProbeCard.tsx',
 'app/inteligencia/page.tsx',
];
for(const file of files){const tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(tree.parseDiagnostics.length===0,'AST TS/TSX '+file)};
function compile(file,imports={}){
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m=new Module(file,module);m.require=id=>id in imports?imports[id]:require(id);m._compile(js,file);return m.exports;
}
const long=compile(files[0]).buildBrainLongitudinalCI360;
const at='2026-11-16T13:00:00.000Z';
const med=(id,p='p',u='u')=>({id,user_id:u,person_id:p,nome:id,status:'ativo'});
const dose=(id,medication,day,taken,extras={})=>({id,user_id:'u',person_id:'p',medicamento_id:medication,data:day,horario:'12:00',tomado_em:taken,dose_kind:'scheduled',synced:true,...extras});
const record=(id,day,axis,value,extras={})=>({id,user_id:'u',person_id:'p',data:day,registro_chave:axis,valor_numerico:value,...extras});
const data={userId:'u',personId:'p',hoje:'2026-11-16',
 medicamentos:[med('m'),med('n'),med('foreign','q')],
 doseLogs:[
  dose('a','m','2026-11-16','2026-11-16T09:00:00.000Z'),
  dose('a','m','2026-11-16','2026-11-16T09:00:00.000Z'), // duplicate
  dose('b','m','2026-11-16','2026-11-16T11:00:00.000Z',{dose_kind:'sos',synced:false}),
  dose('c','n','2026-11-15','2026-11-15T15:00:00.000Z',{dose_kind:'extra'}),
  dose('ign','m','2026-11-15',undefined,{ignorado_em:'2026-11-15T14:00:00Z'}),
  dose('plan','m','2026-11-16',undefined,{dose_kind:'planned'}),
  dose('dual','m','2026-11-16','2026-11-16T08:00:00Z',{ignorado_em:'2026-11-16T09:00:00Z'}),
  dose('badClock','m','2026-11-16','2026-11-16 08:00'),
  dose('tomorrow','m','2026-11-16','2026-11-17T09:00:00Z'),
  dose('previous','m','2026-11-10','2026-11-10T08:00:00Z'),
  dose('prevWindow','m','2026-11-05','2026-11-05T08:00:00Z'),
  dose('other','foreign','2026-11-16','2026-11-16T08:00:00Z',{person_id:'q'}),
 ],
 registrosSaude:[
  record('h1','2026-11-12','humor',7),record('h2','2026-11-14','humor',7),record('h3','2026-11-16','humor',7),
  record('h4','2026-11-02','humor',5),record('h5','2026-11-04','humor',5),record('h6','2026-11-08','humor',5),
  record('h6','2026-11-08','humor',5),record('other','2026-11-16','humor',10,{person_id:'q'}),
  record('bad','2026-11-16','energia',NaN),
 ],
 consultas:[{id:'co',user_id:'u',person_id:'p',data:'2026-11-16',status:'realizada'},
            {id:'otherco',user_id:'u',person_id:'q',data:'2026-11-16',status:'realizada'}],
 retiradas:[{id:'w1',user_id:'u',person_id:'p',data:'2026-11-16',status:'realizada'},
           {id:'w2',user_id:'u',person_id:'p',data:'2026-11-16',status:'agendada'},
           {id:'w3',user_id:'u',person_id:'p',data:'2026-11-16',status:'cancelada'}],
};
const source=JSON.stringify(data);const result=long(data,at);ok(result.state==='ready','snapshot disponível só com pessoa e data');
ok(JSON.stringify(data)===source,'snapshot imutável');
ok(result.periods.length===2&&result.periods[0].periodDays===7&&result.periods[1].periodDays===30,'duas janelas 7/30');
const w=result.periods[0];
ok(w.from==='2026-11-10'&&w.previousFrom==='2026-11-03'&&w.previousThrough==='2026-11-09','limites temporais exatos 7 dias');
ok(w.confirmedScheduled===2,'scheduled confirmado, inclusive dia anterior');
ok(w.confirmedSos===1&&w.confirmedExtra===1,'SOS e extra separados');
ok(w.confirmedScheduled+w.confirmedSos+w.confirmedExtra===4,'não duplica log por ID');
ok(w.explicitlyIgnored===1,'somente ignorada explícita');
ok(w.plannedExcluded===1,'planejamento excluído');
ok(w.conflictsExcluded===1,'tomada + ignorada é conflito, não consumo');
ok(w.unverifiedClockExcluded===1,'horário sem timezone excluído');
ok(w.futureClockExcluded===1,'tomada com timestamp futuro excluída');
ok(w.pendingSync===1,'apenas confirmado pendente de sync');
ok(w.confirmedDays===3,'três dias com doses confirmadas');
ok(w.documentedDays>=3&&w.documentedDays<=7,'cobertura em dias, não percentual de adesão');
ok(w.axes.find(x=>x.axis==='humor').currentSamples===3,'humor atual e pessoa correta');
ok(w.axes.find(x=>x.axis==='humor').previousSamples===2,'janela anterior não infla amostra duplicada');
ok(w.axes.find(x=>x.axis==='humor').comparison==='insufficient','mínimo amostral exigido antes de comparar');
ok(w.axes.find(x=>x.axis==='dor').currentAverage===null,'sem dor registrada não inventa valor');
ok(w.axes.find(x=>x.axis==='energia').currentSamples===0,'NaN excluído das médias');
ok(w.appointmentsRecorded===1,'consulta escopada por owner/person');
ok(w.withdrawalsCompleted===1&&w.withdrawalsOpen===1,'retirada realizada distinta de agendada/cancelada');
ok(w.daily.length===7&&w.daily.every(x=>x.day.length===10),'linha temporal sete dias');
ok(result.periods[1].from==='2026-10-18','30 dias calendário inclusivos');
ok(long({...data,personId:'q',medicamentos:[med('foreign','q')]},at).periods[0].confirmedScheduled===1,'outra pessoa vê apenas sua própria dose');
ok(long({...data,userId:'foreign'},at).periods[0].confirmedScheduled===0,'troca de conta não vaza doses');
ok(long({...data,personId:''},at).state==='unavailable','sem pessoa bloqueio fechado');
ok(long({...data,hoje:'2026-02-30'},at).state==='unavailable','data civil inválida bloqueada');
ok(long(data,'timestamp inválido').state==='unavailable','instante inválido bloqueado');
// Janela anterior tem exatamente amostras suficientes num segundo caso.
const r2=long({...data,registrosSaude:[...data.registrosSaude,record('h7','2026-11-06','humor',5)]},at);
ok(r2.periods[0].axes.find(x=>x.axis==='humor').comparison==='documented','comparação só com amostras válidas em ambos períodos');
ok(r2.periods[0].axes.find(x=>x.axis==='humor').delta===2,'delta do valor declarado, sem julgamento clínico');
// Exercita o core real do ledger com import TypeScript, sem mock de política.
const core=compile('lib/health-intelligence/active-probing/core.ts');
const quiet=compile('lib/health-intelligence/active-probing/quiet-p6.ts');
const governance=compile(files[1],{'./core':core,'./quiet-p6':quiet}).buildProbeGovernanceCI360;
const prefs={enabled:true,manufacturer:false,confirmedSos:true,temporaryCourse:false,fourAxes:true,consentVersion:1};
const makeProbe=(id,kind,status,when='2026-11-15T12:00:00Z',extra={})=>({
 id,idempotency_key:'key:'+id,user_id:'u',person_id:'p',trigger_type:kind,status,
 created_at:when,updated_at:when,due_at:'2026-11-15T12:00:00Z',expires_at:'2026-11-23T12:00:00Z',
 sync_state:'synced',...extra});
const ledger=[makeProbe('a','confirmed_sos_use','shown'),makeProbe('b','axis_shift_eligible','answered','2026-11-14T12:00:00Z'),
 makeProbe('ignored','manufacturer_lot_started','eligible','2026-10-01T12:00:00Z'),makeProbe('other','confirmed_sos_use','shown','2026-11-15T12:00:00Z',{person_id:'q'}),
 makeProbe('dupe','confirmed_sos_use','shown','2026-11-15T12:00:00Z',{idempotency_key:'key:a'})];
const g=governance('u','p',prefs,ledger,at);
ok(g.state==='ready'&&g.total===2,'pessoa/conta/categoria/dedupe no ledger');
ok(g.sevenDayCreated===2&&g.weeklyAllowance===0,'quota real de duas novas em sete dias');
const oldCategory=makeProbe('legacyManufacturer','manufacturer_lot_started','answered');
const mixed=governance('u','p',prefs,[...ledger,oldCategory],at);
ok(mixed.sevenDayCreated===3&&mixed.weeklyAllowance===0,'troca de categoria nao reinicia a quota global do ledger');
ok(g.shown===1&&g.answered===1,'status de perguntas preservado');
ok(Boolean(g.nextWeeklySlotISO)&&g.nextWeeklySlotISO.startsWith('2026-11-21'),'próxima janela apenas descritiva');
ok(g.pendingSync===0,'não inventa sync pendente');
ok(governance('u','p',{...prefs,enabled:false},ledger,at).state==='consent_required','opt-in desligado não exibe ledger');
ok(governance('u','q',prefs,ledger,at).total===1,'escopo pessoa separada');
ok(governance('','p',prefs,ledger,at).state==='unavailable','sem conta bloqueio fechado');
ok(governance('u','p',prefs,ledger,'invalid').state==='unavailable','timestamp inválido bloqueio fechado');
const localNight=new Date(at);localNight.setHours(23,0,0,0);
ok(governance('u','p',prefs,ledger,localNight.toISOString()).quietHours===true,'silêncio noturno explicitado');
ok(core.withinFrequencyLimit(ledger.filter(x=>x.person_id==='p'&&x.trigger_type!=='manufacturer_lot_started'),'u','p',at,2)===false,'mesma política histórica de frequência');
const card=fs.readFileSync(files[4],'utf8'),page=fs.readFileSync(files[5],'utf8');
const longitudinalUI=fs.readFileSync(files[2],'utf8');
ok(longitudinalUI.includes('context && context.userId===user?.id && context.personId===activePersonId'),'UI limpa dados da pessoa antiga antes da renderização');
ok(longitudinalUI.includes('aria-pressed={days===value}')&&longitudinalUI.includes('Últimos {value} dias'),'seletor 7/30 acessível e controlado');
ok(page.includes('import { BrainLongitudinalCI360 }')&&page.includes('<BrainLongitudinalCI360 context={health.context}'),'Brain usa contexto único sem duplicar motor');
ok(page.includes('<BrainEvidenceWindowCI360')&&page.includes('<BrainSafetyEvidenceCI360')&&page.includes('<BrainActiveProbeCard'),'P1, P2 e perguntas canônicas preservadas');
ok(card.includes('ProbeGovernanceCI360')&&card.includes('activeProbesRepository.reconcileClock(userId,personId)'),'governança é adicional, não substitui ledger');
ok(card.includes('reconcileSos(')&&card.includes('reconcileEndedCourses(')&&card.includes('reconcileAxis('),'três origens de perguntas canônicas preservadas');
ok(card.includes('loadActiveProbePreferences')&&card.includes('saveActiveProbePreferences'),'consentimento explícito intacto');
ok(card.includes('activeProbesRepository.answer(')&&card.includes('activeProbesRepository.syncPending('),'resposta/sync mantêm autoridade anterior');
ok(fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8').split('"scripts/test-vault-ci360-p3-longitudinal.cjs"').length===2,'contrato P3 registrado uma vez no gate');
console.log(`CI360 P3 — ${n} contratos estruturais e comportamentais aprovados`);
