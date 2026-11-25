'use strict';
/** A10: hermetic invariants, no DB, network, clinical writes or user data. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=process.cwd();let count=0;
const ok=(value,msg)=>{assert.ok(value,`A10_INTEGRAL: ${msg}`);count++;};
const eq=(a,b,msg)=>{assert.deepEqual(a,b,`A10_INTEGRAL: ${msg}`);count++;};
const src=p=>fs.readFileSync(path.join(root,p),'utf8');
const loaded=new Map();
function pure(rel){
 if(loaded.has(rel))return loaded.get(rel).exports;
 const file=path.join(root,'lib/a10',rel+'.ts'),code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const mod={exports:{}};loaded.set(rel,mod);
 new Function('require','module','exports',code)((name)=>{
  if(name.startsWith('./'))return pure(path.posix.normalize(path.posix.join(path.posix.dirname(rel),name.slice(2))));
  throw new Error(`Import runtime unexpectedly required: ${name}`);
 },mod,mod.exports);return mod.exports;
}
const m=pure('longitudinal'),auth=pure('authority-ledger'),rel=pure('relations'),brain=pure('brain-evidence'),reg=pure('regulatory-p4e'),par=pure('consumer-parity');
const UID='10000000-0000-4000-8000-000000000001',OTHER='10000000-0000-4000-8000-000000000002';
const PID='20000000-0000-4000-8000-000000000001',SIBLING='20000000-0000-4000-8000-000000000002';
const r=(id,ext={})=>({id,user_id:UID,person_id:PID,deleted_at:null,created_at:'2026-11-21T16:00:00Z',...ext});
const base={
 medicamentos:[r('med-1',{nome:'Remédio genérico',dosagem:'25 mg'}),r('med-2',{nome:'Outra apresentação',dosagem:'5 mL'})],
 doseLogs:[r('d-1',{medicamento_id:'med-1',data:'2026-11-20',tomado_em:'2026-11-20T15:00:00Z'}),r('d-2',{medicamento_id:'med-2',data:'2026-11-21',ignorado_em:'2026-11-21T11:00:00Z'})],
 consultas:[r('c-1',{especialidade:'Clínica geral',status:'agendada',data:'2026-11-25',motivo:'Retorno'})],
 cirurgias:[r('s-1',{procedimento:'Cirurgia declarada',status:'agendada',data:'2026-12-02'})],
 surgical_intents_a7m5:[r('i-1',{title:'Encaminhamento',status:'requested',linked_surgery_id:'s-1'})],
 hospitalizations_a5:[r('h-1',{reason:'Acompanhamento',status:'planned',planned_admission_on:'2026-11-28'})],
 rehab_programs_m5:[r('p-1',{title:'Programa de reabilitação'})],
 rehab_sessions_m5:[r('rs-1',{program_id:'p-1',status:'performed',scheduled_at:'2026-11-21T01:30:00Z',timezone:'America/Sao_Paulo',notes:'Presença relatada'})],
 rehab_milestones_m5:[r('rm-1',{program_id:'p-1',session_id:'rs-1',recorded_at:'2026-11-21T14:00:00Z',kind:'reassessment',notes:'Registro informado'})],
 vaccination_courses_a8:[r('course-1',{vaccine_name:'Vacina declarada'})],
 vaccination_events_a8:[r('v-1',{course_id:'course-1',kind:'plan',effective_kind:'plan',planned_on:'2026-12-11'})],
 procedure_events_a9:[r('pr-1',{title:'Curativo',effective_status:'planned',planned_on:'2026-11-26'})],
 sensitivity_events_a9:[r('se-1',{agent_label:'Substância não identificada',sensitivity_type:'reaction',reported_on:'2026-11-18',related_type:'medication',related_id:'med-1'})],
 exam_orders:[r('ex-1',{title:'Pedido de laboratório',requested_on:'2026-11-18',order_kind:'medical_request'})],
 exam_order_items:[r('ei-1',{order_id:'ex-1',name:'Exame de sangue',status:'result_received',result_received_at:'2026-11-21'})],
 registros_saude:[r('hr-1',{nome:'Dor de cabeça',data:'2026-11-20',source:'health_connect'})],
 careflow_events_m2:[r('cf-1',{kind:'monitor_plan',parent_id:null,payload:{title:'Plano registrado',start:'2026-11-22'}})],
 hospitalization_relations_a5:[r('hl-1',{hospitalization_id:'h-1',entity_type:'cirurgia',entity_id:'s-1'})],
 rehab_origin_links_m5:[r('ro-1',{program_id:'p-1',origin_type:'cirurgia',origin_id:'s-1'})],
 surgery_evidence_links_a7m5:[r('link-1',{surgery_id:'s-1',target_type:'exam_order',target_id:'ex-1',action:'link',corrects_link_id:null})],
 clinical_asset_links:[r('asset-link-1',{asset_id:'asset-1',entity_type:'exam_order',entity_id:'ex-1'})],
 clinical_assets:[r('asset-1',{filename:'private.pdf',storage_path:'clinical-private/secret'})]
};
const p=m.projectLongitudinalA10(base,UID,PID);ok(p.facts.length>=15,'real domains projected');
const find=(a,id)=>p.facts.find(f=>f.authority===a&&f.id===id);
ok(find('doseLogs','d-1').title.includes('Remédio genérico'),'dose has actual medication name');
ok(find('doseLogs','d-1').title.includes('25 mg'),'dose has actual medication strength');
ok(!find('doseLogs','d-1').title.includes('Dose marcada como tomada'),'no anonymous dose title');
eq(find('doseLogs','d-1').status,'Tomada registrada','taken only from explicit log');
ok(find('doseLogs','d-2').status.includes('Ignorada'),'ignored distinct');
eq(find('consultas','c-1').dateKind,'planned','consultation remains planned');
eq(find('cirurgias','s-1').dateKind,'planned','surgery remains planned');
eq(find('hospitalizations_a5','h-1').dateKind,'planned','hospital not automatically admitted');
eq(find('vaccination_events_a8','v-1').dateKind,'planned','vaccine not automatically applied');
eq(find('procedure_events_a9','pr-1').dateKind,'planned','procedure not automatically performed');
const session=find('rehab_sessions_m5','rs-1');eq(session.displayedDate,'20/11/2026','timezone preserves scheduled civil day');
ok(session.origin.includes('data de agenda'),'status performed never changes scheduled date to actual date');
eq(find('sensitivity_events_a9','se-1').dateKind,'reported','sensitivity only reported');
eq(find('registros_saude','hr-1').source,'Health Connect / dispositivo conectado','source humanized');
ok(find('exam_order_items','ei-1').status.includes('Resultado recebido'),'item status from canonical item');
ok(find('surgical_intents_a7m5','i-1').status.includes('Encaminhamento'),'intent not surgery');
for(const fact of p.facts){ok(!/\/saude\/linha-clinica\/detalhe\?origem=$/.test(fact.href),'exact route contains original entity');ok(fact.href.includes('id='+encodeURIComponent(fact.id)),'all facts have exact links');ok(fact.userId===UID&&fact.personId===PID,'scope on each fact');ok(!fact.title.includes('DoseLog'),'no internal DoseLog on titles');}
eq(m.projectLongitudinalA10(base,UID,SIBLING).facts.length,0,'other profile has no facts');
eq(m.projectLongitudinalA10(base,OTHER,PID).facts.length,0,'other account has no facts');
eq(m.projectLongitudinalA10(base,'',PID).facts.length,0,'empty auth denied');
for(let i=0;i<64;i++){const uid=i%2?UID:OTHER,pid=i%4===0?SIBLING:PID;const facts=m.projectLongitudinalA10(base,uid,pid).facts;ok(facts.every(f=>f.userId===uid&&f.personId===pid),'2x2 mixed session '+i);}
const query=m.filterLongitudinalA10(p.facts,{query:'clinica geral'});ok(query.some(f=>f.id==='c-1'),'accent-insensitive search');
ok(m.filterLongitudinalA10(p.facts,{domain:'vaccination'}).every(f=>f.domain==='vaccination'),'domain filter');
ok(m.filterLongitudinalA10(p.facts,{from:'2026-11-25'}).every(f=>f.sortKey>='2026-11-25'),'civil range filter');
ok(m.filterLongitudinalA10(p.facts,{to:'2026-11-20'}).every(f=>f.sortKey<='2026-11-20'),'end-day filter');
eq(m.civilDayA10('2026-02-30'),null,'invalid civil leap day rejected');
eq(m.civilDayA10('2024-02-29'),'2024-02-29','leap day allowed');
eq(m.localScheduledDayA10('2026-11-21T01:30:00Z','America/Sao_Paulo'),'2026-11-20','local time-zone conversion');
eq(m.localScheduledDayA10('2026-11-21T01:30:00Z','Unknown/Zone'),null,'unknown TZ withheld');
const amended={...base,vaccination_events_a8:[...base.vaccination_events_a8,r('v-2',{kind:'amendment',effective_kind:'dose',administered_on:'2026-11-21',course_id:'course-1',corrects_event_id:'v-1'})]};
const revised=m.projectLongitudinalA10(amended,UID,PID);ok(!revised.facts.some(f=>f.id==='v-1'),'superseded vaccine excluded');
ok(revised.facts.some(f=>f.id==='v-2'),'amendment latest presented');
const history=m.projectLongitudinalA10(amended,UID,PID,true);ok(history.facts.find(f=>f.id==='v-1').revision==='historical','history preserves superseded fact');
const voided=m.projectLongitudinalA10({...base,procedure_events_a9:[r('pr-2',{title:'Cancelado',kind:'void',effective_status:'void',corrects_event_id:'pr-1'})]},UID,PID);ok(!voided.facts.some(f=>f.id==='pr-2'),'void not clinical occurrence');
const withOther={...base,consultas:[...base.consultas,r('evil',{user_id:OTHER,person_id:PID,data:'2026-11-25',motivo:'proibido'}),r('evil2',{person_id:SIBLING,data:'2026-11-25',motivo:'proibido'})]};
const filtered=m.projectLongitudinalA10(withOther,UID,PID);ok(!filtered.facts.some(f=>f.title.includes('proibido')),'foreign consultations do not appear');
ok(filtered.excludedUnscoped>=2,'foreign exclusions count and audit');
const g=rel.graphFromExistingA10(p.facts,base,UID,PID);
ok(g.edges.some(e=>e.from==='hospitalizations_a5:h-1'&&e.to==='cirurgias:s-1'),'A5 relation explicit');
ok(g.edges.some(e=>e.from==='rehab_sessions_m5:rs-1'&&e.to==='cirurgias:s-1'),'M5 origin explicit');
ok(g.edges.some(e=>e.from==='cirurgias:s-1'&&e.to==='exam_orders:ex-1'),'A7 evidence relation explicit');
eq(g.privateEvidenceCounts['exam_orders:ex-1'],1,'private asset link only count');
const orphanAssets={...base,clinical_assets:[]};
eq(rel.graphFromExistingA10(p.facts,orphanAssets,UID,PID).privateEvidenceCounts['exam_orders:ex-1']||0,0,'orphan private asset not counted');
const foreignAssets={...base,clinical_assets:[r('asset-1',{user_id:OTHER,filename:'private.pdf'})]};
eq(rel.graphFromExistingA10(p.facts,foreignAssets,UID,PID).privateEvidenceCounts['exam_orders:ex-1']||0,0,'foreign private asset not counted');
ok(!JSON.stringify(g).includes('secret'),'storage path never leaks in graph');
const afterUnlink={...base,surgery_evidence_links_a7m5:[...base.surgery_evidence_links_a7m5,r('link-2',{surgery_id:'s-1',target_type:'exam_order',target_id:'ex-1',action:'unlink',corrects_link_id:'link-1'})]};
const g2=rel.graphFromExistingA10(p.facts,afterUnlink,UID,PID);ok(!g2.edges.some(x=>x.sourceAuthority==='surgery_evidence_links_a7m5'),'unlink cancels earlier link');
const fakeRelations={...base,hospitalization_relations_a5:[r('forged',{user_id:OTHER,hospitalization_id:'h-1',entity_type:'cirurgia',entity_id:'s-1'})]};
const g3=rel.graphFromExistingA10(p.facts,fakeRelations,UID,PID);ok(g3.excludedWrongScope>=1,'foreign A5 link rejected');
const proof=rel.relatedFactsA10(find('hospitalizations_a5','h-1'),p.facts,g);ok(proof.some(x=>x.to==='cirurgias:s-1'),'A5 graph displayed by ID');
eq(rel.relationSummaryA10([],g).facts,0,'no fake evidence counts');
const testAlert={key:'k',person_id:PID,snapshot:{entidade_tipo:'medicamento',entidade_id:'med-1',entidade_ids:[]}};
eq(brain.explainBrainA10(testAlert,p.facts,UID,PID).state,'linked','Brain can link a medication to a documented dose by explicit ID');
eq(brain.explainBrainA10(testAlert,p.facts,UID,SIBLING).state,'wrong_scope','Brain person guard');
const noId={...testAlert,snapshot:{entidade_tipo:'registro',entidade_id:'unknown',entidade_ids:[]}};
eq(brain.explainBrainA10(noId,p.facts,UID,PID).state,'not_documented','no invented Brain provenance');
const version={id:'v1',source_key:'anvisa',source_name:'Autoridade pública',source_url:'https://gov.br/referencia',version:'2026-11',published_at:null,imported_at:'2026-11-20T00:00:00Z',source_updated_at:null,content_hash:'hash-demo',superseded_at:null,active:true};
const candidate={id:'cand',user_id:UID,person_id:PID,medication_id:'med-1',official_source_version_id:'v1',status:'pending',source_kind:'ocr',normalized_payload:{},event_date:'2026-11-20'};
const metadata=reg.auditRegulatoryP4E({userId:UID,personId:PID,medicationId:'med-1',versions:[version],candidates:[candidate],today:'2026-11-21'});
eq(metadata.state,'versioned_reference','catalog versioned, not product authorized');
eq(metadata.approvedCandidates,0,'OCR does not approve automatically');
ok(metadata.caveats.some(x=>/OCR/.test(x)),'mandatory human review disclaimer');
eq(reg.auditRegulatoryP4E({userId:UID,personId:SIBLING,medicationId:'med-1',versions:[version],candidates:[candidate],today:'2026-11-21'}).candidateCount,0,'regulatory owner scope');
eq(reg.auditRegulatoryP4E({userId:UID,personId:PID,medicationId:'med-1',versions:[version],candidates:[candidate],today:'2026-02-30'}).state,'scope_denied','invalid civil day guard');
eq(reg.localPharmaProvenanceA10(null).state,'declared_only','no invented official status');
const audited=auth.auditAuthorityCoverageA10(base);ok(audited.expected>=25,'≥25 authority inventory');ok(audited.missing.includes('tratamentos'),'missing sources explicit not inferred');
ok(!auth.isCanonicalAuthorityA10('invented_parallel_clinical_table'),'no second authority');
eq(par.safeA10ReportScope(UID,PID,{uid:OTHER,pid:PID},p.facts).length,0,'report scope guard');
eq(par.safeA10ReportScope(UID,PID,{uid:UID,pid:PID},p.facts).length,p.facts.length,'report complete scope');
const rows=[{authority:'consultas',id:'c-1',userId:UID,personId:PID,status:find('consultas','c-1').status}];
eq(par.compareConsumerA10(p.facts,rows,'home',UID,PID).length,0,'summary may legitimately display fewer facts');
ok(par.compareConsumerA10(p.facts,rows,'medical_preview',UID,PID,['consultas:c-1','cirurgias:s-1']).some(e=>e.type==='missing'&&e.key==='cirurgias:s-1'),'detailed report explicit coverage');
ok(par.compareConsumerA10(p.facts,[{...rows[0],userId:OTHER}],'pdf',UID,PID).some(e=>e.type==='unscoped'),'foreign report record detected');
ok(par.compareConsumerA10(p.facts,[{...rows[0],status:'invented'}],'careflow',UID,PID).some(e=>e.type==='different_state'),'contradicting state detected');
// Static engine and UI contracts: native writers or private binary paths are forbidden.
const newFiles=['lib/a10/longitudinal.ts','lib/a10/authority-ledger.ts','lib/a10/relations.ts','lib/a10/brain-evidence.ts','lib/a10/regulatory-p4e.ts','lib/a10/consumer-parity.ts','lib/a10/client-data.ts','components/saude/A10ContextLink.tsx','components/saude/PharmaLensProvenanceA10.tsx','app/saude/linha-clinica/page.tsx','app/saude/linha-clinica/detalhe/page.tsx'];
for(const file of newFiles){const content=src(file),syntax=ts.createSourceFile(file,content,99,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);eq(syntax.parseDiagnostics.length,0,'TS parser '+file);ok(!/\b(?:service_role|supabase\s*\.\s*from\s*\(|db\.version\s*\(|INSERT\s+INTO|DROP\s+TABLE)\b/i.test(content),'no new writer or DDL '+file);}
const page=src('app/saude/linha-clinica/page.tsx');const detail=src('app/saude/linha-clinica/detalhe/page.tsx');
ok(page.indexOf('Interpretações do Brain')>page.indexOf('filtered.slice(0,limit)'), 'Brain separated below factual timeline');
ok(!page.slice(page.indexOf('<header'),page.indexOf('Interpretações do Brain')).includes('violet-'),'factual surface has no violet');
ok(page.includes('filtered.slice(0,limit)')&&page.includes('filtered.length>limit'),'progressive page no silent cutoff');
ok(page.includes('previous.uid!==uid||previous.pid!==pid')&&page.includes('clearClinicalA10Filter')&&page.includes("setQuery('')")&&page.includes('setReadyScope(scope)'),'person change resets search/history filters without erasing return state');
ok(page.includes("const sourceBack=useMemo(")&&page.includes('encodeURIComponent(sourceBack)'),'fact link restores filters');
ok(detail.includes("safeReturnTarget(params.get('return_to')"),'exact detail respects sanitized back target');
ok(page.includes('snapshot?.scope===scope'),'snapshot scope gate');
ok(detail.includes('snapshot.scope!==scope')&&detail.includes('person_id')===false,'detail denies stale scope without displaying identifier');
ok(detail.includes('graphFromExistingA10')&&detail.includes('Identificador de origem'),'source IDs and links');
ok(src('components/saude/A10ContextLink.tsx').includes('<Activity size={18}')&&!src('components/saude/A10ContextLink.tsx').includes('className="hidden'),'Lucide visible even compact');
ok(src('components/saude/PharmaLensProvenanceA10.tsx').includes('não aprova OCR'),'no OCR promotion');
ok(!newFiles.some(p=>p.includes('HealthAvatar3D')),'no GPU renderer changed');
if(fs.existsSync(path.join(root,'app/page.tsx'))){
 const home=src('app/page.tsx'),today=src('app/hoje/page.tsx'),careflow=src('app/saude/careflow/page.tsx'),medical=src('app/saude/careflow/modo-medico/page.tsx'),pdf=src('lib/m3/medical-pdf-p3.ts'),dossier=src('lib/m3/medical-dossier-p3.ts');
 ok(home.includes('<A10ContextLink context="home"'),'Home reader integrated');
 ok(today.includes('<A10ContextLink context="today"'),'Hoje reader integrated');
 ok(careflow.includes("href:'/saude/linha-clinica'"),'CareFlow reader integrated');
 ok(medical.includes('longitudinalA10:a10Facts'),'Modo Médico reads A10');
 ok(medical.includes('a10?.scope===scopeKey&&a10.verified'),'Modo Médico scope guard');
 ok(dossier.includes("hospitalizations',label:'Internações'"),'A5 is selectable in Modo Médico');
 ok(dossier.includes('input.longitudinalA10'),'M3 dossier same underlying object');
 ok(pdf.includes("hospitalizations:'Internações'"),'existing PDF renderer handles A5');
 ok(src('components/saude/PharmaLensWorkspaceV7.tsx').includes('<PharmaLensProvenanceA10'),'PharmaLens provenance visible');
 ok(src('app/saude/minha-saude/page.tsx').includes('<A10ContextLink context="health"'),'Fênix entry without GPU');
 ok(src('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-a10-integral-360.cjs'),'V63 new suite present');
}
console.log(`VAULT_A10_INTEGRAL_360_TEST_OK | ${count} verificações herméticas | 2 contas × 2 pessoas | links, M3/PDF, Brain, P4-E e UX | sem rede ou dados reais`);
