#!/usr/bin/env node
'use strict';
/** A7 read-model contracts: tests real engine, negative cases, UI wiring, no cloud or writes. */
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const assert=require('node:assert/strict');const ts=require('typescript');
let checks=0;const ok=(cond,msg)=>{assert.ok(cond,'A7: '+msg);checks++};
const read=p=>fs.readFileSync(p,'utf8');
const engine='lib/surgery-a7/projection.ts';
const compiled=ts.transpileModule(read(engine),{fileName:engine,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
ok((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length===0,'transpile da projeção');
const mod={exports:{}};
const types=require('./a7-test-types-helper.cjs').loadTypes();
vm.runInNewContext(compiled.outputText,{module:mod,exports:mod.exports,Date,Set,Map,Array,Object,String,Number,Boolean,Math,Error,RegExp,Intl,require:id=>{if(id==='./types')return types;throw Error('A7 projection imported unexpected '+id);}}, {filename:engine,timeout:4000});
const project=mod.exports.projectSurgeryJourneyA7;ok(typeof project==='function','projeção factual exportada');
const own={user_id:'u1',person_id:'p1'},foreign={user_id:'u2',person_id:'p2'};
const surgery={...own,id:'s1',procedimento:'Cirurgia documentada',data:'2026-11-18',horario:'14:30',status:'realizada',
 medico_id:'d1',hospital_id:'h1',tratamento_ids:['t1','t1'],document_id:'doc1',observacoes:'Relato sem desfecho inferido'};
const cs=(id,props={})=>({...own,id,especialidade:'Consulta '+id,medico:'Profissional',data:'2026-11-17',status:'realizada',...props});
const base={userId:'u1',personId:'p1',surgeryId:'s1',surgeries:[surgery],consultations:[
 cs('c-pre'),cs('c-post',{data:'2026-11-21'}),cs('c-ret',{data:'2026-11-26'}),cs('c-same',{data:'2026-11-18'}),{...foreign,id:'c-secret',especialidade:'SEGREDO',medico:'Outro',data:'2026-11-18',status:'realizada'}],
 links:[{...own,id:'l1',cirurgia_id:'s1',consulta_id:'c-pre',role:'preoperative',note:'Identificado pelo usuário'},
  {...own,id:'l2',cirurgia_id:'s1',consulta_id:'c-post',role:'postoperative',note:null},
  {...own,id:'l3',cirurgia_id:'s1',consulta_id:'c-ret',role:'return_visit',note:null},
  {...own,id:'l4',cirurgia_id:'s1',consulta_id:'c-same',role:'supporting',note:null},
  {...own,id:'l5',cirurgia_id:'other',consulta_id:'c-secret',role:'preoperative'},
  {...foreign,id:'l6',cirurgia_id:'s1',consulta_id:'c-secret',role:'postoperative'}],
 treatments:[{...own,id:'t1',nome:'Tratamento vinculado',status:'ativo'},
  {...foreign,id:'t2',nome:'SEGREDO',status:'ativo'}],
 documents:[{...own,id:'doc1',title:'Documento explícito'},
  {...own,id:'doc2',title:'Documento por entidade',entidade_tipo:'cirurgia',entidade_id:'s1'},
  {...own,id:'doc3',title:'Documento só da data',entidade_tipo:'consulta',entidade_id:'s1'},
  {...foreign,id:'doc4',title:'SEGREDO',entidade_tipo:'cirurgia',entidade_id:'s1'}],
 orders:[{...own,id:'exam1',title:'Pedido pré-operatório',requested_on:'2026-11-13'},
  {...own,id:'exam2',title:'Pedido coincidente',requested_on:'2026-11-18'},
  {...foreign,id:'exam-secret',title:'SEGREDO',requested_on:'2026-11-18'}],
 orderLinks:[{...own,id:'ol1',consultation_id:'c-pre',order_id:'exam1',role:'requested'},
  {...own,id:'ol2',consultation_id:'c-same',order_id:'exam2',role:'requested'},
  {...foreign,id:'ol3',consultation_id:'c-pre',order_id:'exam-secret',role:'requested'}],
 rehabPrograms:[{...own,id:'r1',title:'Reabilitação informada',status:'active',start_date:'2026-11-21'},
  {...own,id:'r2',title:'Sem vínculo',status:'active',start_date:'2026-11-18'},
  {...foreign,id:'r-secret',title:'SEGREDO',status:'active',start_date:'2026-11-18'}],
 rehabOrigins:[{...own,id:'ro1',program_id:'r1',origin_type:'cirurgia',origin_id:'s1'},
  {...own,id:'ro2',program_id:'r2',origin_type:'consulta',origin_id:'s1'},
  {...foreign,id:'ro3',program_id:'r-secret',origin_type:'cirurgia',origin_id:'s1'}],
 rehabSessions:[{...own,id:'rs1',program_id:'r1',scheduled_at:'2026-11-22T10:00:00-03:00',status:'performed'},
  {...own,id:'rs2',program_id:'r1',scheduled_at:'2026-11-25T10:00:00-03:00',status:'scheduled'},
  {...foreign,id:'rs3',program_id:'r1',scheduled_at:'2026-11-22T10:00:00-03:00',status:'performed'}],
 doctors:[{user_id:'u1',id:'d1',nome:'Profissional vinculado'},{user_id:'u2',id:'d2',nome:'SEGREDO'}],
 hospitals:[{user_id:'u1',id:'h1',nome:'Hospital vinculado'},{user_id:'u2',id:'h2',nome:'SEGREDO'}]};
const rows=r=>Object.values(r.stages).flat();
let r=project(base);
ok(Boolean(r),'cirurgia da pessoa ativa disponível');
ok(r.id==='s1'&&r.procedure==='Cirurgia documentada','identidade canônica da cirurgia');
ok(r.date==='2026-11-18'&&r.time==='14:30','data civil e hora reais preservadas');
ok(r.observations==='Relato sem desfecho inferido','observações declaradas preservadas');
ok(r.doctor?.name==='Profissional vinculado'&&r.hospital?.name==='Hospital vinculado','global por conta com vínculo explícito');
ok(r.stages.procedure.length===1&&r.stages.procedure[0].kind==='surgery','procedimento não duplica');
ok(r.stages.pre.some(x=>x.sourceId==='c-pre')&&r.stages.pre.some(x=>x.sourceId==='exam1'),'preparação por IDs explícitos');
ok(r.stages.post.some(x=>x.sourceId==='c-post'),'pós-operatório por papel explícito');
ok(r.stages.return.some(x=>x.sourceId==='c-ret'),'retorno por papel explícito');
ok(r.stages.related.some(x=>x.sourceId==='t1')&&r.counts.treatments===1,'tratamento direto deduplicado');
ok(r.counts.documents===2,'documento por chave direta ou entidade vinculada');
ok(r.stages.rehabilitation.length===1&&r.stages.rehabilitation[0].sourceId==='r1','reabilitação de origem explícita');
ok(r.stages.rehabilitation[0].detail.includes('1 sessão registrada'),'sessões realizadas contadas sem agendamento');
ok(r.counts.consultations===4&&r.counts.exams===2,'contagem de vínculos e pedidos próprios');
ok(r.caveats.some(x=>x.includes('não comprova alta')),'não inferir alta a partir de cirurgia realizada');
ok(!rows(r).some(x=>/SEGREDO/.test(JSON.stringify(x))),'nenhuma informação de outra conta exposta');
ok(!rows(r).some(x=>x.sourceId==='doc3'),'documento apenas coincidente fora da cirurgia');
ok(!r.stages.rehabilitation.some(x=>x.sourceId==='r2'),'reabilitação não vinculada excluída');
for(const mode of [{userId:'u2'},{personId:'p2'},{surgeryId:'s-other'}, {surgeries:[]}]){
 ok(project({...base,...mode})===null,'isolamento ou ausência: '+Object.keys(mode).join(','));}
let without=project({...base,links:[]});
ok(without.stages.pre.length===0&&without.stages.post.length===0&&without.stages.return.length===0,'sem vínculos M4 não inventar consulta');
ok(without.stages.related.length===3&&without.stages.procedure.length===1,'tratamento/documento e cirurgia continuam próprios');
ok(without.caveats.some(x=>x.includes('Nenhuma consulta')),'ausência de vínculos explicada');
let dateTrap=project({...base,links:[],consultations:[cs('c-same',{data:'2026-11-18'})]});
ok(rows(dateTrap).every(x=>x.kind!=='consultation'&&x.kind!=='exam'),'datas coincidentes não vinculam cirurgia/consulta/exame');
let wrongLink=project({...base,links:[{...own,id:'foreign-role',cirurgia_id:'s1',consulta_id:'c-secret',role:'preoperative'}]});
ok(wrongLink.stages.pre.length===0,'link para consulta estrangeira excluído');
let cancelled=project({...base,surgeries:[{...surgery,status:'cancelada'}]});
ok(cancelled.stages.procedure[0].detail.includes('Cancelamento informado'),'cancelamento não vira realização');
ok(!cancelled.stages.procedure[0].detail.includes('alta'),'cancelamento não produz alta');
let deleted=project({...base,links:base.links.map(x=>({...x,deleted_at:'2026-11-22T10:00:00Z'})),
 rehabOrigins:base.rehabOrigins.map(x=>({...x,deleted_at:'2026-11-22T10:00:00Z'}))});
ok(deleted.counts.consultations===0&&deleted.counts.rehabilitation===0,'tombstones não reativam relações');
let deletedConsult=project({...base,consultations:base.consultations.map(x=>({...x,deleted_at:'2026-11-22T10:00:00Z'}))});
ok(deletedConsult.counts.consultations===0&&deletedConsult.counts.exams===0,'consultas removidas não projetadas');
let deletedDocs=project({...base,documents:base.documents.map(x=>({...x,deleted_at:'2026-11-22T10:00:00Z'}))});
ok(deletedDocs.counts.documents===0,'documentos removidos não reaparecem');
let relMissing=project({...base,rehabPrograms:base.rehabPrograms.filter(x=>x.id!=='r1')});
ok(relMissing.counts.rehabilitation===0,'origem sem programa não reaparece');
let invalidDates=project({...base,surgeries:[{...surgery,data:'2026-02-30',horario:'25:99'}]});
ok(invalidDates.date===''&&invalidDates.time==='','data/hora inválidas não exibidas como reais');
let duplicates=project({...base,links:[...base.links,base.links[0]],documents:[...base.documents,base.documents[0]],rehabOrigins:[...base.rehabOrigins,base.rehabOrigins[0]]});
ok(duplicates.counts.consultations===4&&duplicates.counts.documents===2&&duplicates.counts.rehabilitation===1,'importações duplicadas deduplicadas');
let doubleOrder=project({...base,links:[...base.links,{...own,id:'l-extra',cirurgia_id:'s1',consulta_id:'c-same',role:'preoperative'}],
 orderLinks:[...base.orderLinks,{...own,id:'ol4',consultation_id:'c-pre',order_id:'exam2',role:'requested'}]});
ok(doubleOrder.counts.exams===2,'pedido aparece em duas etapas mas contador é por pedido único');
let missingMedical=project({...base,doctors:[{user_id:'u2',id:'d1',nome:'SEGREDO'}],hospitals:[{user_id:'u2',id:'h1',nome:'SEGREDO'}]});
ok(missingMedical.doctor===null&&missingMedical.hospital===null,'conta alheia não vaza médico ou hospital');
let escaped=project({...base,surgeries:[{...surgery,procedimento:' X\nTESTE\u0000 '}],links:[]});
ok(escaped.procedure==='X TESTE','sanitização de texto sem alterar dado de origem');
// UI/route tests deliberately check syntax and broad contract instead of brittle, superficial substring names.
for(const file of ['components/saude/SurgeryJourneyA7.tsx','app/saude/cirurgias/jornada/page.tsx',
 'app/saude/jornada/page.tsx','lib/surgery-a7/projection.ts']){
 const kind=file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const node=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,kind);
 ok(node.parseDiagnostics.length===0,'sintaxe TypeScript: '+file);
}
for(const s of ['db.persons.get(pid)','db.cirurgias.where','db.consultas.where','db.surgery_consultation_links_m4.where',
'db.rehab_origin_links_m5.where','db.rehab_sessions_m5.where','useLiveQuery','activePersonId','user?.id',
'HealthRelationPicker','SurgeryConsultationLinksM4P2'])
 ok(read('components/saude/SurgeryJourneyA7.tsx').includes(s),'UI usa fonte/autorização: '+s);
const route=read('app/saude/jornada/page.tsx');
ok(route.includes('ClinicalJourneyM4')&&route.includes('/saude/cirurgias/jornada?id='),'M4 preservada e A7 acessível por CTA');
ok(route.includes("params.get('cirurgia')"),'link já existente do detalhe cirúrgico reconhecido');
ok(read('app/saude/cirurgias/jornada/page.tsx').includes('SurgeryJourneyA7'),'rota própria A7 disponível');
const source=read(engine);
const ast=ts.createSourceFile(engine,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
let dangerous=[];
function visit(node){if(ts.isCallExpression(node)){
 const s=node.expression.getText(ast);
 if(/^(?:db\.|supabase\.)/.test(s)||/^(?:fetch|setTimeout|setInterval)$/.test(s))dangerous.push(s);
 }ts.forEachChild(node,visit);}visit(ast);
ok(dangerous.length===0,'projeção sem acesso a banco, rede ou operações persistentes');
const gate=read('scripts/test-v63-release-gate.mjs');
ok((gate.match(/"scripts\/test-vault-a7-macro1\.cjs"/g)||[]).length===1,'gate V63 registra A7 uma vez');
ok(gate.includes('test-vault-a4-macro2.cjs')&&gate.includes('test-vault-m5-reab-macro2.cjs'),'gate V63 preserva A4 e M5');
console.log(`A7_M6_MACRO1_CONTRACTS_OK | checks=${checks} | fonte única Cirurgias/M4/M5 | sem dados reais ou rede`);
