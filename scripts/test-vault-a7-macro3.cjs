#!/usr/bin/env node
'use strict';
/** A7/M6: contract + real TS repository execution in-memory, adverse ownership, sync/CAS, UI/SQL guardrails. */
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
let checks=0;const ok=(x,label)=>{assert.ok(x,`A7_MACRO3: ${label}`);checks++;};
const read=p=>fs.readFileSync(p,'utf8');
const types=require('./a7-test-types-helper.cjs').loadTypes();
function load(path,mocks={}){
 const src=read(path),parsed=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,`Sintaxe ${path}`);
 const out=ts.transpileModule(src,{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
 ok((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length===0,`Transpilação ${path}`);
 const mod={exports:{}};let n=0;
 vm.runInNewContext(out.outputText,{module:mod,exports:mod.exports,require:id=>{if(id==='./types')return types;if(id in mocks)return mocks[id];throw Error(`Unexpected A7 runtime dependency ${id} from ${path}`);},
  Date,String,Number,Boolean,Object,Array,Math,Set,Map,RegExp,Error,Intl,Promise,JSON,console,crypto:{randomUUID:()=>ids(++n)}},{filename:path,timeout:3000});
 return mod.exports;
}
const ids=i=>String(i).padStart(8,'0')+'-0000-4000-a000-000000000001';
const U=ids(10),P=ids(11),Q=ids(12),S=ids(13),D=ids(14),ALT=ids(15),TARGET=ids(16);
ok(types.validUuidA7(U),'ID válido');ok(!types.validUuidA7('bad-id'),'ID inválido');
ok(types.validDayA7('2026-11-21'),'data civil válida');ok(!types.validDayA7('2026-02-30'),'impossível data');
ok(types.displayDayA7('2026-11-21')==='21/11/2026','data brasileira');
const people=new Map([[P,{id:P,user_id:U}],[Q,{id:Q,user_id:ALT}]]);
const surgeries=new Map([[S,{id:S,user_id:U,person_id:P}]]);
const professionals=new Map([[D,{id:D,user_id:U}]]);
const events=new Map(),team=new Map(),queue=[];
const table=map=>({get:async id=>map.get(id),add:async row=>{if(map.has(row.id))throw Error('duplicate');map.set(row.id,row);},put:async row=>map.set(row.id,row),where:()=>({equals:()=>({toArray:async()=>[...map.values()]})})});
const db={persons:table(people),cirurgias:table(surgeries),medicos:table(professionals),surgery_journey_events_a7:table(events),surgery_team_a7:table(team),syncQueue:table(new Map()),transaction:async(_mode,_tables,fn)=>fn()};
const repository=load('lib/surgery-a7/repository.ts',{
 '@/lib/db':{db},'@/lib/supabase/local-auth':{getLocalFirstAuthUser:async()=>({data:{user:{id:U}},error:null})},
 '@/lib/sync/enfileirarOperacao':{enfileirarOperacao:async(table,action,row,options)=>{queue.push({table,action,row,options});},solicitarProcessamentoSync:()=>{}},
});
const result=async(p)=>{try{await p;return null;}catch(e){return String(e?.message||e);}};
(async()=>{
 ok((await result(repository.addSurgeryJourneyEventA7({personId:Q,surgeryId:S,kind:'preparation_note',source:'self_report',title:'Pré',description:'Registro'})))?.includes('conta'),'outra pessoa bloqueada');
 ok((await result(repository.addSurgeryJourneyEventA7({personId:P,surgeryId:ALT,kind:'preparation_note',source:'self_report',title:'Pré',description:'Registro'})))?.includes('Cirurgia'),'cirurgia fora do escopo bloqueada');
 ok((await result(repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'preparation_note',source:'self_report',title:'Pré',description:'Registro',occurredOn:'2026-02-30'})))?.includes('Data'),'data inválida bloqueada');
 ok((await result(repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'procedure_note',source:'self_report',title:'',description:'Registro'})))?.includes('título'),'título vazio bloqueado');
 ok((await result(repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'correction',source:'self_report',title:'Retificação',description:'Registro sem origem'})))?.includes('referência'),'retificação sem referência bloqueada');
 ok((await result(repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'preparation_note',source:'verified_import',title:'Fonte inválida',description:'Não houve importação'})))?.includes('origem'),'não permitir declarar importação verificada pelo formulário manual');
 ok((await result(repository.linkSurgeryTeamA7({personId:P,surgeryId:S,professionalId:D,role:'Cirurgião',source:'verified_import'})))?.includes('Origem'),'equipe manual não finge importação verificada');
 const id=await repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'preparation_note',source:'self_report',title:'Jejum informado',description:'Paciente relata preparo, sem liberação inferida',occurredOn:'2026-11-21'});
 ok(events.has(id)&&events.get(id).stage==='pre','evento canônico append-only');
 ok(queue.some(q=>q.table==='surgery_journey_events_a7'&&q.action==='add'&&q.options?.dispatchSync===false),'fila canônica sem disparo transacional prematuro');
 const correction=await repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'correction',source:'professional_document',title:'Retificação declarada',description:'Documento corrigiu relato',correctsEventId:id});
 ok(events.get(correction)?.corrects_event_id===id&&events.get(correction)?.stage==='pre','retificação aponta evento anterior mantendo a etapa');
 ok(events.get(id).description==='Paciente relata preparo, sem liberação inferida','fato original nunca sobrescrito');
 ok((await result(repository.addSurgeryJourneyEventA7({personId:P,surgeryId:S,kind:'correction',source:'self_report',title:'Retificação',description:'Sem original',correctsEventId:ALT})))?.includes('fora desta cirurgia'),'retificação estrangeira bloqueada');
 ok((await result(repository.linkSurgeryTeamA7({personId:P,surgeryId:S,professionalId:ALT,role:'Cirurgião',source:'self_report'})))?.includes('Profissional'),'profissional de outra conta bloqueado');
 const teamId=await repository.linkSurgeryTeamA7({personId:P,surgeryId:S,professionalId:D,role:'Cirurgião',source:'professional_document',note:'Atuação informada no laudo'});
 ok(team.has(teamId)&&team.get(teamId).role==='Cirurgião','equipe específica A7 criada');
 const same=await repository.linkSurgeryTeamA7({personId:P,surgeryId:S,professionalId:D,role:'cirurgião',source:'professional_document'});
 ok(same===teamId&&team.size===1,'duplicação de mesma função bloqueada');
 await repository.unlinkSurgeryTeamA7({personId:P,teamId});
 ok(typeof team.get(teamId).deleted_at==='string'&&!queue.some(q=>q.action==='delete'),'equipe preserva tombstone, sem delete físico');
 await repository.unlinkSurgeryTeamA7({personId:P,teamId});ok(team.size===1,'desvincular idempotente');
 const before=queue.length;
 ok(!queue.some(q=>['doseLogs','medicamentos','hospitalizations_a5','cirurgias'].includes(q.table)),'escrita A7 não altera outros módulos');
 const def=load('lib/surgery-a7/sync.ts',{'@/lib/supabase/client':{supabase:{from:()=>({})}}});
 const payload={id,person_id:P,cirurgia_id:S,user_id:U,created_at:events.get(id).created_at,updated_at:events.get(id).updated_at,deleted_at:null,
  stage:'pre',kind:'preparation_note',source:'self_report',occurred_on:'2026-11-21',title:'Jejum informado',description:'Paciente relata preparo, sem liberação inferida',source_professional_id:null,corrects_event_id:null};
 const pending=await def.pendingSurgeryA7Dependency({table:'surgery_journey_events_a7',payload,operation:'add'},async(table,v)=>table==='cirurgias'&&v===S);
 ok(pending===`cirurgias:${S}`,'evento aguarda cirurgia original pendente');
 const next=await def.pendingSurgeryA7Dependency({table:'surgery_journey_events_a7',payload,operation:'add'},async()=>false);ok(next===null,'não inventa dependência inexistente');
 ok((await result(def.syncSurgeryA7({table:'surgery_journey_events_a7',payload:{...payload,user_id:ALT},operation:'add'},U)))?.includes('não autorizados'),'push rejeita outra conta');
 ok((await result(def.syncSurgeryA7({table:'surgery_journey_events_a7',payload,operation:'delete'},U)))?.includes('inválida'),'push rejeita DELETE físico');
 const pure=load('lib/surgery-a7/projection.ts');
 const owner={user_id:U,person_id:P},other={user_id:ALT,person_id:Q};
 const args={userId:U,personId:P,surgeryId:S,surgeries:[{...owner,id:S,procedimento:'Cirurgia',data:'2026-11-21',status:'agendada'}],consultations:[],links:[],
  treatments:[],documents:[],orders:[],orderLinks:[],rehabPrograms:[],rehabOrigins:[],rehabSessions:[],doctors:[{id:D,user_id:U,nome:'Profissional A7'}],hospitals:[],
  surgeryEvents:[...events.values(),{...events.get(id),id:ids(22),...other,title:'Segredo de outra conta'}],
  surgeryTeam:[{...team.get(teamId),deleted_at:null},{...team.get(teamId),id:ids(23),...other,role:'SEGREDO'}]};
 const projected=pure.projectSurgeryJourneyA7(args);
 ok(projected.counts.surgicalEvents===2,'duas ocorrências independentes sem segredo');
 ok(projected.stages.pre.filter(r=>r.kind==='surgical_event').length===2,'retificação mantém eixo pré-operatório');
 ok(projected.counts.surgicalTeam===1,'equipe cirúrgica explicitamente associada');
 ok(!JSON.stringify(projected).includes('SEGREDO')&&!JSON.stringify(projected).includes('Segredo'),'nenhuma leitura da outra conta');
 ok(projected.status==='agendada','fatos de procedimento não transformam cirurgia agendada em realizada');
 const unrelated=pure.projectSurgeryJourneyA7({...args,surgeryEvents:args.surgeryEvents.map(e=>({...e,cirurgia_id:ALT}))});
 ok(unrelated.counts.surgicalEvents===0,'eventos exigem cirurgia ID igual');
 const sql=read('supabase/migrations/20261121180631_vault_a7_jornada_cirurgica_360.sql');
 for(const needle of ['enable row level security','auth.uid()','a7_event_surgery','a7_event_correction_scope','a7_team_professional',
  'vault_a7_events_immutable','vault_a7_team_tombstone_only','on delete restrict','grant select, insert','grant select, insert, update'])ok(sql.includes(needle),'SQL guard '+needle);
 for(const filename of ['lib/surgery-a7/types.ts','lib/surgery-a7/repository.ts','lib/surgery-a7/sync.ts','components/saude/SurgeryA7RecordsPanel.tsx','components/saude/SurgeryA7FactualDigest.tsx','components/saude/SurgeryJourneyA7.tsx']){
  const sf=ts.createSourceFile(filename,read(filename),ts.ScriptTarget.Latest,true,filename.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(sf.parseDiagnostics.length===0,'TS/TSX '+filename);
 }
 const ui=read('components/saude/SurgeryJourneyA7.tsx');
 const jsx=ts.createSourceFile('components/saude/SurgeryJourneyA7.tsx',ui,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let nested=false;function walk(node,withinLink=false){
  if(ts.isJsxElement(node)){const name=node.openingElement.tagName.getText(jsx);
    if(name==='details'&&withinLink)nested=true;
    withinLink=withinLink||name==='Link';
  }
  ts.forEachChild(node,child=>walk(child,withinLink));
 }walk(jsx);ok(!nested,'não aninhar expansão dentro de link (AST JSX real)');
 const marker=read('scripts/test-v63-release-gate.mjs');ok(marker.includes('test-vault-a7-macro3.cjs'),'contrato A7 macro3 no V63');
 console.log(`A7_M6_MACRO3_BEHAVIOR_OK | checks=${checks} | queue=${before} | sem banco real`);
})().catch(e=>{console.error(e);process.exitCode=1});
