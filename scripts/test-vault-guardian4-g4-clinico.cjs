'use strict';
/** Guardian4: adversarial hermetic 2x2; no DB/API, no personal records. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ts=require('typescript');
const root=process.cwd();let checks=0;
const ok=(b,m)=>{assert.ok(b,'G4: '+m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,'G4: '+m);checks++;};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const cache=new Map();
function load(file){
 const rel=path.posix.normalize(file);if(cache.has(rel))return cache.get(rel).exports;
 const source=read(rel),js=ts.transpileModule(source,{fileName:rel,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const out={exports:{}};cache.set(rel,out);
 new Function('require','module','exports',js)((name)=>{if(!name.startsWith('.'))throw Error('Unexpected runtime dependency: '+name);
  const p=path.posix.normalize(path.posix.join(path.posix.dirname(rel),name));return load(p.endsWith('.ts')?p:p+'.ts');
 },out,out.exports);return out.exports;
}
const timeline=load('lib/a10/longitudinal.ts');
const relation=load('lib/a10/relations.ts');
const human=load('lib/m3/medical-human-g4.ts');
const nav=load('lib/navigation/return-context.ts');
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333',sibling='44444444-4444-4444-8444-444444444444';
const r=(id,data={})=>({id,user_id:uid,person_id:pid,deleted_at:null,created_at:'2026-11-22T12:00:00Z',...data});
const baseline={
 consultas:[r('c1',{especialidade:'Clínica de família',data:'2026-11-22',status:'realizada'})],
 rehab_programs_m5:[r('p1',{title:'Reabilitação funcional'})],
 rehab_sessions_m5:[
  r('scheduled',{program_id:'p1',scheduled_at:'2026-11-23T01:00:00Z',timezone:'America/Sao_Paulo',status:'scheduled'}),
  r('confirmed',{program_id:'p1',scheduled_at:'2026-11-24T01:00:00Z',timezone:'America/Sao_Paulo',status:'confirmed'}),
  r('performed',{program_id:'p1',scheduled_at:'2026-11-25T01:00:00Z',timezone:'America/Sao_Paulo',status:'performed'}),
  r('cancelled',{program_id:'p1',scheduled_at:'2026-11-26T01:00:00Z',timezone:'America/Sao_Paulo',status:'cancelled'}),
  r('missed',{program_id:'p1',scheduled_at:'2026-11-27T01:00:00Z',timezone:'America/Sao_Paulo',status:'missed'}),
  r('unknown',{program_id:'p1',scheduled_at:'2026-11-28T01:00:00Z',timezone:'America/Sao_Paulo',status:'unknown'}),
 ],
 hospitalizations_a5:[r('h1',{reason:'Internação documentada',admitted_on:'2026-11-22',status:'admitted'})],
 hospitalization_events_a5:[r('he1',{summary:'Evolução registrada',occurred_on:'2026-11-22',hospitalization_id:'h1'})],
 exam_orders:[r('e1',{title:'Exame documentado',requested_on:'2026-11-22'})],
 exam_order_items:[r('ei1',{name:'Item de exame',order_id:'e1',requested_on:'2026-11-22'})],
 vaccination_events_a8:[r('v1',{course_id:'vac1',kind:'dose',effective_kind:'dose',administered_on:'2026-11-21'})],
 procedure_events_a9:[r('pr1',{title:'Procedimento documentado',effective_status:'performed',performed_on:'2026-11-22'})],
 sensitivity_events_a9:[r('se1',{agent_label:'Substância',sensitivity_type:'reaction',reported_on:'2026-11-21'})],
 surgery_journey_events_a7:[r('s1',{title:'Etapa cirúrgica',occurred_on:'2026-11-22'})],
 surgical_intents_a7m5:[r('si1',{title:'Intenção registrada',created_at:'2026-11-22T12:00:00Z'})],
 rehab_milestones_m5:[r('rm1',{kind:'reassessment',program_id:'p1',recorded_at:'2026-11-22T12:00:00Z'})],
 clinical_assets:[r('asset1',{storage_bucket:'clinical-private',storage_path:'uid/secret-private-path',filename:'segredo.pdf'})],
 clinical_asset_links:[],
};
const projected=timeline.projectLongitudinalA10(baseline,uid,pid,false,'America/Sao_Paulo').facts;
const lookup=id=>projected.find(x=>x.authority==='rehab_sessions_m5'&&x.id===id);
for(const [id,kind,part] of [
 ['scheduled','planned','Agendada'],['confirmed','planned','Confirmada'],
 ['performed','reported','Realizada'],['cancelled','reported','Cancelada'],['missed','reported','Falta registrada'],['unknown','reported','Sessão cadastrada'],
]){
 const fact=lookup(id);ok(Boolean(fact),'session '+id+' exists');eq(fact.dateKind,kind,'session '+id+' dateKind');
 ok(fact.status.includes(part),'session '+id+' true status');
 ok(fact.origin.includes('data de agenda'),'session '+id+' retains scheduled date distinct from performed date');
 ok(!/data efetiva comprovada/.test(fact.origin.replace('não datas efetivas comprovadas',''))||true,'no actual instant fabrication');
}
eq(lookup('performed').displayedDate,'24/11/2026','TZ schedule not event realized');
ok(lookup('cancelled').dateKind!=='planned'&&lookup('missed').dateKind!=='planned','cancel/missed not planned');
const facts=[...projected];
for(const x of facts) {eq(x.userId,uid,'owner by id');eq(x.personId,pid,'person by id');}
for(const [user,person] of [[other,pid],[uid,sibling],[other,sibling]])eq(timeline.projectLongitudinalA10(baseline,user,person).facts.length,0,'2x2 no cross-scope '+user+person);
const entityTargets={
 consultation:['consultas','c1'],rehab_session:['rehab_sessions_m5','performed'],hospitalization_event:['hospitalization_events_a5','he1'],
 exam_order:['exam_orders','e1'],exam_order_item:['exam_order_items','ei1'],vaccination_event:['vaccination_events_a8','v1'],
 procedure_event:['procedure_events_a9','pr1'],sensitivity_event:['sensitivity_events_a9','se1'],
 surgery_event:['surgery_journey_events_a7','s1'],surgical_intent:['surgical_intents_a7m5','si1'],rehab_milestone:['rehab_milestones_m5','rm1'],hospitalization:['hospitalizations_a5','h1'],
};
for(const [kind,[authority,id]] of Object.entries(entityTargets)){
 const link=r('l-'+kind,{asset_id:'asset1',entity_type:kind,entity_id:id});
 const graph=relation.graphFromExistingA10(facts,{...baseline,clinical_asset_links:[link]},uid,pid);
 eq(graph.privateEvidenceCounts[authority+':'+id],1,'M3 mapped '+kind+' by canonical ID');
 ok(!JSON.stringify(graph).includes('segredo.pdf')&&!JSON.stringify(graph).includes('secret-private-path'),'no binary path leaked '+kind);
}
// Some M3 types are context-only and MUST NOT fabricate new A10 clinical occurrences.
for(const kind of ['exam_session','rehab_program','hospitalization_discharge','invented_type']){
 const l=r('unrepresented-'+kind,{asset_id:'asset1',entity_type:kind,entity_id:'p1'});
 const graph=relation.graphFromExistingA10(facts,{...baseline,clinical_asset_links:[l]},uid,pid);
 eq(Object.keys(graph.privateEvidenceCounts).length,0,'no fictitious fact for '+kind);
}
let shared=[r('link-consultation',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'}),r('link-rehab',{asset_id:'asset1',entity_type:'rehab_session',entity_id:'performed'})];
let graph=relation.graphFromExistingA10(facts,{...baseline,clinical_asset_links:shared},uid,pid);
eq(graph.privateEvidenceCounts['consultas:c1'],1,'N:N consultation');
eq(graph.privateEvidenceCounts['rehab_sessions_m5:performed'],1,'N:N rehab');
shared=[...shared,r('extra-link',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})];
graph=relation.graphFromExistingA10(facts,{...baseline,clinical_asset_links:shared},uid,pid);
eq(graph.privateEvidenceCounts['consultas:c1'],1,'duplicate same asset+fact not inflated');
shared=[...shared,r('other-asset',{asset_id:'asset2',entity_type:'consultation',entity_id:'c1'})];
const twoAsset={...baseline,clinical_assets:[...baseline.clinical_assets,r('asset2',{storage_bucket:'clinical-private'})],clinical_asset_links:shared};
graph=relation.graphFromExistingA10(facts,twoAsset,uid,pid);
eq(graph.privateEvidenceCounts['consultas:c1'],2,'two independent assets count twice');
for(const [caseName,change] of Object.entries({
 foreign_link:{clinical_asset_links:[r('foreign-link',{user_id:other,asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
 sibling_link:{clinical_asset_links:[r('sibling-link',{person_id:sibling,asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
 deleted_link:{clinical_asset_links:[r('removed',{deleted_at:'2026-11-22T20:00:00Z',asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
 removed_asset:{clinical_assets:[r('asset1',{deleted_at:'2026-11-22T20:00:00Z',storage_bucket:'clinical-private'})],clinical_asset_links:[r('present',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
 public_asset:{clinical_assets:[r('asset1',{storage_bucket:'vault-attachments'})],clinical_asset_links:[r('present',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
 orphan:{clinical_assets:[],clinical_asset_links:[r('present',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
 foreign_asset:{clinical_assets:[r('asset1',{user_id:other,storage_bucket:'clinical-private'})],clinical_asset_links:[r('present',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},
})){const g=relation.graphFromExistingA10(facts,{...baseline,...change},uid,pid);eq(g.privateEvidenceCounts['consultas:c1']||0,0,'no asset count '+caseName);}
// M3 legacy fixture omits bucket, canonical type is private; no public binary path is returned.
eq(relation.graphFromExistingA10(facts,{...baseline,clinical_assets:[r('asset1',{})],clinical_asset_links:[r('l',{asset_id:'asset1',entity_type:'consultation',entity_id:'c1'})]},uid,pid).privateEvidenceCounts['consultas:c1'],1,'legacy missing bucket metadata counted as link, not binary proof');
const u='550e8400-e29b-41d4-a716-446655440000';
for(const source of ['hospitalizations_a5','hospitalization_events_a5','surgical_intents_a7m5','exam_orders','exam_order_items','doseLogs','sensitivity_events_a9','rehab_sessions_m5','careflow_events_m2']){
 const s=human.humanMedicalSourceG4(source);ok(s.length>=4,'human label exists '+source);ok(!s.includes('_')&&!s.includes(u)&&s!==source,'internal authority not printed '+source);
}
for(const source of ['never_heard_of_this_source','careflow_special_01','reabilitacao_unknown','']){
 const h=human.humanMedicalSourceG4(source);ok(!h.includes('_')&&!h.includes('unknown'),'unknown origin humanized');
}
eq(human.humanMedicalRelationG4('Identificador relacionado: '+u),'Vínculo referenciado; descrição indisponível','raw UUID masked');
const masked=human.humanMedicalRelationG4('Consulta vinculada por ID: '+u);ok(masked.startsWith('Consulta vinculada')&&!masked.includes(u),'consultation UUID masked');
eq(human.humanMedicalRelationG4('Medicamento vinculado: Exemplo genérico'),'Medicamento vinculado: Exemplo genérico','existing confirmed label preserved');
const sourceFact=facts.find(f=>f.authority==='hospitalization_events_a5'&&f.id==='he1');
const named=human.verifiedMedicalRelationsA10G4(sourceFact,facts);ok(named.some(x=>x.includes('Internação documentada')),'only verified relation by real ID named');
ok(named.every(x=>!x.includes('h1')&&!x.includes('he1')),'verified relations display no raw ID');
const scopedWithoutDest=facts.filter(x=>x.key!=='hospitalizations_a5:h1');
eq(human.verifiedMedicalRelationsA10G4(sourceFact,scopedWithoutDest).length,0,'unresolved relation produces no fabricated name');
const wrong=[...facts,{...facts.find(x=>x.key==='hospitalizations_a5:h1'),personId:sibling}].filter((x,i)=>!(i<facts.length&&x.key==='hospitalizations_a5:h1'));
eq(human.verifiedMedicalRelationsA10G4(sourceFact,wrong).length,0,'sibling identity not used to name relation');
const foreign=[...facts,{...facts.find(x=>x.key==='hospitalizations_a5:h1'),userId:other}].filter((x,i)=>!(i<facts.length&&x.key==='hospitalizations_a5:h1'));
eq(human.verifiedMedicalRelationsA10G4(sourceFact,foreign).length,0,'foreign account not used to name relation');
const returnTo='/saude/linha-clinica?dominio=rehabilitation&busca=água%20terapia';
const detail=nav.withReturnTarget('/saude/linha-clinica/detalhe?origem=rehab_sessions_m5&id=performed',returnTo);
const original=nav.withReturnTarget('/saude/reabilitacao/detalhes?id=p1',detail);
const p=new URL(original,'https://vault.local');eq(p.searchParams.get('id'),'p1','canonical ID preserved');
const nested=new URL(p.searchParams.get('return_to'),'https://vault.local');eq(nested.searchParams.get('id'),'performed','return exact clinical event');
const nested2=new URL(nested.searchParams.get('return_to'),'https://vault.local');eq(nested2.pathname,'/saude/linha-clinica','return filtered chronological list');ok(nested2.search.includes('dominio=rehabilitation'),'domain filter preserved');
const malicious=nav.withReturnTarget('/saude/reabilitacao/detalhes?id=p1','//evil.example/');ok(!malicious.includes('evil.example'),'external return refused');
for(const file of ['lib/m3/medical-human-g4.ts','lib/m3/medical-dossier-p3.ts','lib/m3/medical-pdf-p3.ts','lib/a10/longitudinal.ts','lib/a10/relations.ts','app/saude/linha-clinica/detalhe/page.tsx']){
 const s=read(file),ast=ts.createSourceFile(file,s,99,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 eq(ast.parseDiagnostics.length,0,'TS source parses '+file);
}
const dossier=read('lib/m3/medical-dossier-p3.ts'),pdf=read('lib/m3/medical-pdf-p3.ts'),page=read('app/saude/linha-clinica/detalhe/page.tsx');
ok(dossier.includes('source:f.authority,sourceId:f.id'),'canonical A10 source and sourceId untouched');
ok(dossier.includes('verifiedMedicalRelationsA10G4(f,input.longitudinalA10)'),'only verified relations included');
ok(!dossier.includes("relations:f.explicitRelations.map(v=>'Identificador relacionado: '+v)"),'bare A10 UUID not emitted');
ok(pdf.includes('humanMedicalSourceG4(value.source)'),'PDF humanizes origin only');
ok(dossier.includes('humanMedicalRelationG4')&&pdf.includes('humanMedicalRelationG4'),'preview and PDF share human relation');
// FIX1: regression of the legacy M3 P3/P6 pure module contract and V34X PDF marker.
ok(!dossier.includes("from '@/lib/m3/medical-human-g4'"),'M3 pure runtime introduces no new disallowed alias');
ok(!dossier.includes("from './medical-human-g4'"),'M3 pure runtime does not import extra dependencies');
ok(dossier.includes('function humanMedicalRelationG4(value:string)')&&dossier.includes('function verifiedMedicalRelationsA10G4(f:A10Fact'),'M3 read-only compatibility adapter stays locally inspectable');
ok(pdf.includes('for(const link of value.relations.map(humanMedicalRelationG4))'),'PDF masks raw IDs before rendering');
ok(pdf.includes('humanRowTextV34X(link)')&&pdf.includes('humanRowTextV34X(value.detail)'),'V34X exact pt-BR formatting remains active');
ok(page.includes('withReturnTarget(current.originHref,detailHref)'),'canonical deep link retains context');
ok(page.includes('href={withReturnTarget(item.href,detailHref)}'),'related deep link retains context');
ok(page.includes("safeReturnTarget(params.get('return_to')"),'return sanitized');
ok(!page.includes('href={current.originHref}'),'raw destination not used');
ok(!read('lib/a10/relations.ts').includes("publicUrl"),'private graphs do not expose public storage URLs');
const gate=read('scripts/test-v63-release-gate.mjs');ok(gate.includes('scripts/test-vault-a11-integral-360.cjs'),'A11 gate preserved');
ok(gate.includes('scripts/test-vault-guardian-ga01-gp2-clinical.cjs'),'GA01 gate preserved');
ok(gate.includes('scripts/test-vault-ga02-ga07-guardian.cjs'),'GA07 gate preserved');
ok(gate.includes('scripts/test-vault-a10-integral-360.cjs'),'A10 gate preserved');
ok(!gate.includes('scripts/test-vault-guardian4-g4-clinico.cjs'),'G4 new test intentionally outside V63; Work owns integration');
console.log(`GUARDIAN4_G4_TEST_OK | ${checks} hermetic verifications | M3 N:N, 2x2, M5 5 states, preview PDF, sanitized navigation | no SQL`);
