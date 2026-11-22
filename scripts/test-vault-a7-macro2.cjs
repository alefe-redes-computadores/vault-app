#!/usr/bin/env node
'use strict';
/** A7/M6 surgical journey extended: real TS engine, A5/M3 adversarial clinical evidence. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let checks=0;
const check=(expr,why)=>{assert.ok(expr,`A7 M6 extended: ${why}`);checks++};
const engine='lib/surgery-a7/projection.ts';
const src=read(engine),out=ts.transpileModule(src,{fileName:engine,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const mod={exports:{}};const types=require('./a7-test-types-helper.cjs').loadTypes();
vm.runInNewContext(out.outputText,{module:mod,exports:mod.exports,Date,Set,Map,Array,Object,String,Boolean,Number,Math,Error,Intl,RegExp,require:id=>{if(id==='./types')return types;throw Error('A7 unexpected import '+id);}}, {filename:engine,timeout:6000});
const project=mod.exports.projectSurgeryJourneyA7;
check(typeof project==='function','canonical surgery engine callable');
const own={user_id:'u1',person_id:'p1'},foreign={user_id:'u2',person_id:'p2'},sameAccountDifferentPerson={user_id:'u1',person_id:'p2'};
const r=(id,attrs={})=>({...own,id,...attrs});
const base={userId:'u1',personId:'p1',surgeryId:'s1',surgeries:[r('s1',{procedimento:'Cirurgia confirmada como registro',data:'2026-11-20',status:'agendada'})],
 consultations:[],links:[],treatments:[],documents:[],orders:[],orderLinks:[],rehabPrograms:[],rehabOrigins:[],rehabSessions:[],doctors:[],hospitals:[]};
const hospital=r('h1',{reason:'Motivo declarado',status:'planned',admission_kind:'elective',planned_admission_on:'2026-11-21',admitted_on:null,discharged_on:null,facility_name_snapshot:'Hospital declarado'});
const hospital2=r('h2',{reason:'Internação efetiva',status:'discharged',admission_kind:'urgent',admitted_on:'2026-11-18',discharged_on:'2026-11-21'});
const hlink=r('hr1',{hospitalization_id:'h1',entity_type:'cirurgia',entity_id:'s1',relation_role:'origin',source:'self_report',note:'Vínculo intencional'});
const hlink2=r('hr2',{hospitalization_id:'h2',entity_type:'cirurgia',entity_id:'s1',relation_role:'during',source:'professional_document'});
const evidence={
 hospitalizations:[hospital,hospital2,r('h3',{reason:'Data coincidente',status:'admitted',admitted_on:'2026-11-20'}),{...foreign,id:'h-secret',reason:'SEGREDO',status:'admitted'}],
 hospitalizationRelations:[hlink,hlink2,r('hr3',{hospitalization_id:'h3',entity_type:'consulta',entity_id:'s1',relation_role:'during'}),
  {...foreign,id:'hr-secret',hospitalization_id:'h-secret',entity_type:'cirurgia',entity_id:'s1',relation_role:'during'}],
 hospitalizationEvents:[r('ev1',{hospitalization_id:'h1',kind:'preparation',summary:'Evento informado',occurred_on:'2026-11-20'}),
  {...foreign,id:'ev-secret',hospitalization_id:'h1',kind:'secret',summary:'SEGREDO',occurred_on:'2026-11-20'},
  r('ev-unlinked',{hospitalization_id:'h3',kind:'coincidence',summary:'Não relacionada',occurred_on:'2026-11-20'})],
 hospitalizationDischarges:[r('dis1',{hospitalization_id:'h2',disposition:'home',summary:'Alta registrada',reviewed_on:'2026-11-21',source:'professional_document'}),
  r('dis-unlinked',{hospitalization_id:'h3',disposition:'home',summary:'Não vinculada',reviewed_on:'2026-11-21',source:'self_report'})],
 hospitalizationTeam:[r('team1',{hospitalization_id:'h2',professional_id:'med1',role:'nursing',started_on:'2026-11-19'}),
  {...sameAccountDifferentPerson,id:'team-other',hospitalization_id:'h2',professional_id:'med-secret',role:'secret'}],
 hospitalizationStays:[r('stay1',{hospitalization_id:'h2',entered_on:'2026-11-19',ward_label:'Enfermaria registrada',unit_type:'inpatient'}),
  {...foreign,id:'stay-secret',hospitalization_id:'h2',ward_label:'SEGREDO'}],
 clinicalAssets:[r('asset1',{filename:'Laudo privado',upload_status:'synced'}),r('asset2',{filename:'Outro documento',upload_status:'pending'}),
  {...foreign,id:'asset-secret',filename:'SEGREDO',upload_status:'synced'}],
 clinicalAssetLinks:[r('al1',{asset_id:'asset1',entity_type:'hospitalization',entity_id:'h1',role:'report'}),
  r('al2',{asset_id:'asset2',entity_type:'hospitalization_event',entity_id:'ev1',role:'document'}),
  r('al3',{asset_id:'asset2',entity_type:'hospitalization_event',entity_id:'ev1',role:'document'}),
  {...foreign,id:'al-secret',asset_id:'asset-secret',entity_type:'hospitalization_event',entity_id:'ev1',role:'document'}],
 doctors:[{id:'med1',user_id:'u1',nome:'Profissional do episódio'}, {id:'med-secret',user_id:'u2',nome:'SEGREDO'}]
};
const build=(extra={})=>project({...base,...evidence,...extra});
const all=result=>Object.values(result.stages).flat();
const derived=build();
check(derived!==null,'surgeon canonical entity remains available');
check(derived.counts.hospitalizations===2,'A5 has two *explicit* links, not matching dates');
check(derived.counts.privateAssets===2,'M3 only two explicitly linked private assets');
check(derived.counts.documents===0,'document counter distinct from private clinical assets');
check(derived.stages.hospitalization.filter(x=>x.kind==='hospitalization').length===2,'two source hospitalization records');
check(derived.stages.hospitalization.find(x=>x.sourceId==='h1').title==='Internação planejada','planned never means admitted');
check(derived.stages.hospitalization.find(x=>x.sourceId==='h1').date==='2026-11-21','civil planned admission day preserved');
check(derived.stages.hospitalization.find(x=>x.sourceId==='h2').title==='Alta hospitalar registrada','actual discharge label only from A5');
check(derived.stages.hospitalization.find(x=>x.sourceId==='h2').date==='2026-11-21','actual A5 discharge day displayed');
check(derived.stages.hospitalization.find(x=>x.sourceId==='ev1')?.kind==='hospital_event','hospital event only by linked episode');
check(derived.stages.hospitalization.find(x=>x.sourceId==='dis1')?.kind==='hospital_discharge','discharge evidence shown with independent source');
check(derived.stages.hospitalization.find(x=>x.sourceId==='team1')?.kind==='hospital_team','hospital team shown as hospital team only');
check(derived.stages.hospitalization.find(x=>x.sourceId==='team1')?.detail.includes('Profissional do episódio'),'professional name from authorized account only');
check(derived.stages.hospitalization.find(x=>x.sourceId==='stay1')?.kind==='hospital_stay','ward/stay shown only from explicit A5 episode');
check(!all(derived).some(x=>JSON.stringify(x).includes('SEGREDO')),'cross-account team/event/asset not leaked');
check(!all(derived).some(x=>x.sourceId==='ev-unlinked'||x.sourceId==='dis-unlinked'), 'events of unrelated hospitalization excluded');
check(!all(derived).some(x=>x.sourceId==='h3'), 'coincident-date hospitalization excluded');
check(derived.stages.related.filter(x=>x.kind==='asset').length===2,'asset links dedupe by asset id');
check(derived.stages.related.find(x=>x.sourceId==='asset1')?.href==='/saude/internacoes/detalhes?id=h1','private file navigates to canonical A5 owner for secured viewer');
check(derived.stages.related.find(x=>x.sourceId==='asset1')?.detail.includes('sincronizado'),'asset upload status sourced, not assumed');
check(derived.stages.related.find(x=>x.sourceId==='asset2')?.detail.includes('não confirmada'),'pending upload not called synced');
check(derived.stages.related.every(x=>!x.href.includes('http')),'no public URL emitted');
check(derived.caveats.some(x=>x.includes('não equivale a admissão')),'planned and actual factual statuses separated');
check(derived.caveats.some(x=>x.includes('não equivale a recuperação')),'discharge not treated as surgical recovery');
check(derived.stages.procedure[0].status==='agendada','surgery status unchanged by A5 discharge');
for(const field of ['hospitalizations','hospitalizationRelations']){
 const absent=build({[field]:[]});
 check(absent.counts.hospitalizations===0,'A5 missing '+field+' cannot infer association');
}
for(const field of ['hospitalizationEvents','hospitalizationDischarges','hospitalizationTeam','hospitalizationStays']){
 const absent=build({[field]:[]});
 check(absent.counts.hospitalizations===2,'A5 optional '+field+' never erases canonical episode links');
}
const noA5=build({hospitalizations:undefined,hospitalizationRelations:undefined,hospitalizationEvents:undefined,hospitalizationTeam:undefined,hospitalizationDischarges:undefined,hospitalizationStays:undefined});
check(noA5.stages.hospitalization.length===0,'A5 unavailable: safe empty stage, no invented hospitalization');
check(noA5.stages.procedure.length===1,'A5 unavailable: surgery still works');
check(noA5.counts.privateAssets===0,'M3 assets require linked owner, never assume surgery from matching date');
const tombstone=build({hospitalizationRelations:evidence.hospitalizationRelations.map(x=>({...x,deleted_at:'2026-11-21'})),
 clinicalAssetLinks:evidence.clinicalAssetLinks.map(x=>({...x,deleted_at:'2026-11-21'}))});
check(tombstone.counts.hospitalizations===0,'tombstoned A5 relations do not resurrect');
check(tombstone.counts.privateAssets===0,'tombstoned private asset links do not resurrect');
const deletedEpisode=build({hospitalizations:evidence.hospitalizations.map(x=>({...x,deleted_at:'2026-11-21'}))});
check(deletedEpisode.stages.hospitalization.length===0,'deleted A5 parent cannot expose child facts');
const wrongPerson=build({hospitalizations:evidence.hospitalizations.map(x=>({...x,person_id:'p2'}))});
check(wrongPerson.stages.hospitalization.length===0,'same account, other person cannot leak A5');
const wrongA5Parent=build({hospitalizationRelations:evidence.hospitalizationRelations.map(x=>({...x,entity_id:'s2'}))});
check(wrongA5Parent.counts.hospitalizations===0,'wrong surgery ID links do not project');
const wrongA5Type=build({hospitalizationRelations:evidence.hospitalizationRelations.map(x=>({...x,entity_type:'tratamento'}))});
check(wrongA5Type.counts.hospitalizations===0,'A5 relation type must exactly be cirurgia');
const wrongAsset=build({clinicalAssetLinks:evidence.clinicalAssetLinks.map(x=>({...x,entity_id:'s2'}))});
check(wrongAsset.counts.privateAssets===0,'M3 asset link must target an authorized parent record');
const wrongAccount=project({...base,...evidence,userId:'u2'});
check(wrongAccount===null,'other account cannot access owner surgery');
const wrongPatient=project({...base,...evidence,personId:'p2'});
check(wrongPatient===null,'other person cannot access owner surgery');
const plannedDischarge=build({hospitalizations:[{...hospital,status:'planned',discharged_on:'2026-11-23'}],hospitalizationRelations:[hlink]});
check(plannedDischarge.stages.hospitalization.find(x=>x.kind==='hospitalization'&&x.sourceId==='h1')?.title==='Internação planejada','bad inconsistent A5 status never reclassified into actual discharge');
const malformedDate=build({hospitalizations:[{...hospital,planned_admission_on:'2026-02-30'}],hospitalizationRelations:[hlink]});
check(malformedDate.stages.hospitalization.find(x=>x.kind==='hospitalization'&&x.sourceId==='h1')?.date==='','invalid civil date never displayed as verified fact');
const duplicateEvidence=build({hospitalizationEvents:[...evidence.hospitalizationEvents,evidence.hospitalizationEvents[0]],
 clinicalAssetLinks:[...evidence.clinicalAssetLinks,evidence.clinicalAssetLinks[0]],hospitalizationRelations:[...evidence.hospitalizationRelations,evidence.hospitalizationRelations[0]]});
check(duplicateEvidence.stages.hospitalization.length===derived.stages.hospitalization.length,'A5 repeated link and event do not duplicate stage');
check(duplicateEvidence.counts.privateAssets===2,'M3 duplicate links do not duplicate count');
const clinicalSource=ts.createSourceFile(engine,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const dangerous=[];
function visit(node){if(ts.isCallExpression(node)){const expr=node.expression.getText(clinicalSource);
 if(/^(?:db|supabase)\./.test(expr)||/^(?:fetch|setTimeout|setInterval)$/.test(expr))dangerous.push(expr);}ts.forEachChild(node,visit);}visit(clinicalSource);
check(dangerous.length===0,'pure surgical projector cannot write/read DB or schedule notifications');
for(const p of ['lib/surgery-a7/projection.ts','components/saude/SurgeryJourneyA7.tsx','app/saude/cirurgias/jornada/page.tsx']){
 const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(parsed.parseDiagnostics.length===0,'TypeScript parser '+p);
}
const ui=read('components/saude/SurgeryJourneyA7.tsx');
for(const source of ['hospitalizations_a5','hospitalization_relations_a5','clinical_assets','clinical_asset_links','hospitalization_events_a5',
'hospitalization_discharge_a5','hospitalization_team_a5','hospitalization_stays_a5'])
 check(ui.includes(source),'canonical A5/M3 source: '+source);
check(ui.includes("hospitalizations_a5"),'A5 schema authority is explicitly referenced');
check(ui.includes('data.a5Ready?'),'A5 link shown only with available module');
check(ui.includes('SurgeryConsultationLinksM4P2'),'single consultation/surgery linking authority preserved');
check(!ui.includes('type="date"')&&!ui.includes('type="time"')&&!ui.includes('<select'),'no native date/time/select added');
const gate=read('scripts/test-v63-release-gate.mjs');
check((gate.match(/"scripts\/test-vault-a7-macro2\.cjs"/g)||[]).length===1,'extended A7 gate registered exactly once');
check((gate.match(/"scripts\/test-vault-a7-macro1\.cjs"/g)||[]).length===1,'A7 legacy gate preserved exactly once');
check(gate.includes('test-vault-m5-reab-macro2.cjs')&&gate.includes('test-vault-a4-macro2.cjs'),'M5 and A4 pre-existing gates preserved');
console.log(`A7_M6_MACRO2_EVIDENCE_CONTRACTS_OK | checks=${checks} | negative tests protected | A5/M3 factual IDs only`);
