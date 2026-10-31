#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = process.cwd();
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const cache = new Map();
function load(rel) {
  const filename=path.resolve(root,rel);
  if(cache.has(filename))return cache.get(filename).exports;
  const moduleInstance=new Module(filename,module);
  moduleInstance.paths=Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename,moduleInstance);
  moduleInstance.require = id => id.startsWith('@/')
    ? load(id.slice(2)+(path.extname(id)?'':'.ts'))
    : id.startsWith('.')
    ? load(path.join(path.dirname(rel),id)+(path.extname(id)?'':'.ts'))
    : require(id);
  moduleInstance._compile(ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
  return moduleInstance.exports;
}
const sources=[
 'lib/medication-access-action.ts',
 'lib/health-intelligence/medication-care-opportunities.ts',
 'app/saude/medicamentos/detalhes/page.tsx',
 'lib/health-intelligence/medication-care-decision.ts',
 'components/saude/MedicationJourneySummary.tsx',
 'components/saude/MedicationCareOpportunityQueue.tsx',
 'components/saude/MedicationAuthorityMap.tsx',
 'components/saude/HealthAvatar3D.tsx'
];
for(const file of sources){
 const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,file+' syntax errors: '+parsed.parseDiagnostics.map(e=>e.messageText).join(';'));
}
const access=load('lib/medication-access-action.ts');
const medication=(person, user='u')=>({id:'same-med',nome:'Teste',status:'ativo',tipo_uso:'continuo',user_id:user,person_id:person});
const row=(id,person,date,user='u')=>({id,medicamento_id:'same-med',user_id:user,person_id:person,status:'agendada',data:date,horario:'10:00'});
const events=[row('foreign-earlier','other','2026-10-18'),row('owned-later','p','2026-11-03'),row('owned-overdue','p','2026-10-29'),row('wrong-account','p','2026-10-01','other'),{...row('done','p','2026-10-02'),status:'realizada'}, {...row('invalid','p','not-a-day')}, {...row('missing','p','2026-10-09'),person_id:undefined}];
assert.equal(access.indexScheduledWithdrawals(events).get('same-med').id,'wrong-account','unscoped historical helper retained');
const index=access.indexScheduledWithdrawalsByOwner(events);
assert.equal(index.get(access.medicationWithdrawalKey(medication('p'))).id,'owned-overdue','same owner earliest wins');
assert.equal(index.get(access.medicationWithdrawalKey(medication('other'))).id,'foreign-earlier','foreign remains isolated');
assert.equal(access.scheduledWithdrawalForOwnedMedication(events,medication('p')).id,'owned-overdue');
assert.equal(access.scheduledWithdrawalForOwnedMedication(events,medication('missing')),null,'unknown profile never inherits withdrawal');
assert.equal(access.scheduledWithdrawalForOwnedMedication([row('x','p','2026-10-10','other')],medication('p')),null,'account scope');
assert.equal(access.scheduledWithdrawalForOwnedMedication([row('x','p','2026-10-10')],{...medication('p'),person_id:undefined}),null,'missing owner requires review');
const care=load('lib/health-intelligence/medication-care-decision.ts');
const decision=(withdrawal)=>care.decideMedicationCarePath({medication:medication('p'),renewals:[],withdrawal,today:'2026-10-31',needsPrescription:true,needsStock:false});
assert.equal(decision(row('other','other','2026-10-20')).stage,'prescription_needed','foreign withdrawal cannot suppress prescription');
assert.equal(decision(row('ours','p','2026-10-30')).stage,'withdrawal_overdue','overdue scheduled withdrawal remains reviewable');
assert.match(decision(row('ours','p','2026-10-30')).actionHref,/\/saude\/retiradas\/detalhes\?id=ours/);
assert.equal(decision(row('future','p','2026-11-03')).stage,'withdrawal_planned','future withdrawal never treated as received');
assert.equal(decision({...row('done','p','2026-10-22'),status:'realizada'}).stage,'prescription_needed','completed withdrawal not pending');
const opportunities=read('lib/health-intelligence/medication-care-opportunities.ts');
const detail=read('app/saude/medicamentos/detalhes/page.tsx');
assert(opportunities.includes('indexScheduledWithdrawalsByOwner(retiradas)')&&opportunities.includes('medicationWithdrawalKey(medicamento)'),'Brain queue resolves withdrawals with person/account/medication composite');
assert.equal((detail.match(/scheduledWithdrawalForOwnedMedication\(retiradas, med\)/g)||[]).length,2,'details access CTA and care decision share owned withdrawal');
const journey=read('components/saude/MedicationJourneySummary.tsx');
assert(journey.includes('journeyHeadline(snapshot)')&&journey.includes('snapshot.overdueWithdrawals')&&journey.includes('snapshot.plannedAcquisitions'),'real timeline before unverified events');
assert(journey.includes('Receita, aquisição e retirada são eventos independentes') && journey.includes('divide-y')&&journey.includes('ChevronRight'),'V255/V274 journey contracts');
const queue=read('components/saude/MedicationCareOpportunityQueue.tsx');
assert(queue.includes('Por que esta ação aparece?')&&queue.includes('item.evidence.map')&&queue.includes('slice(0, 3)'),'Brain evidence is traceable, bounded and lazy');
const map=read('components/saude/MedicationAuthorityMap.tsx');
assert(map.includes('/hoje?focus=doses')&&map.includes('Receita não é aquisição')&&map.includes('Planejado não entra no estoque')&&map.includes('Realização exige confirmação'),'independent clinical routes');
const avatar=read('components/saude/HealthAvatar3D.tsx');
assert(avatar.includes('P10: pelos e lábios')&&avatar.includes('P11: acabamento fosco')&&avatar.includes('P8: pele e olhos menos plastificados'),'existing avatar layers preserved');
assert(avatar.includes('opacity: .42')&&avatar.includes('opacity:.075')&&avatar.includes('avatarAdaptiveRatio(')&&avatar.includes('renderer.forceContextLoss()')&&!avatar.includes('requestAnimationFrame(function'),'V273/P8 GPU and optics');
console.log('VAULT P11: scoped withdrawals, clinical steps, Brain evidence, navigation, status and Avatar OK');
