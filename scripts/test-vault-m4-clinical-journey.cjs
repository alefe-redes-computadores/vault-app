#!/usr/bin/env node
'use strict';
/** M4 targeted contracts: factual linkage, scope, integrations, and no new clinical writer. */
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
const check=(condition,label)=>{assert.ok(condition,`M4: ${label}`);n++};
const files=['lib/clinical-journey-m4/projection.ts','components/saude/ClinicalJourneyM4.tsx','app/saude/jornada/page.tsx',
 'app/saude/careflow/page.tsx','app/saude/cirurgias/detalhes/page.tsx','app/saude/consultas/detalhes/page.tsx'];
for(const p of files){const d=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS).parseDiagnostics;
 check(d.length===0,'TSX sintático '+p+' '+d.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join(' | '));}
const code=ts.transpileModule(read(files[0]),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};vm.runInNewContext(code,{exports:mod.exports,module:mod,Set,Map,Array,Date,Object,String,Number,Boolean,Math,RegExp,Error,Intl},{timeout:4000});
const build=mod.exports.projectClinicalJourneyM4;check(typeof build==='function','projeção M4 disponível');
const same={user_id:'u1',person_id:'p1'},foreign={user_id:'u2',person_id:'p2'};
const input={userId:'u1',personId:'p1',surgeryId:'s1',consultationId:'c1',
 surgeries:[{...same,id:'s1',procedimento:'Procedimento declarado',data:'2026-11-20',status:'agendada',tratamento_ids:['t1'],document_id:'d1'},
  {...foreign,id:'S-PRIVATE',procedimento:'OUTRA-PESSOA',data:'2026-11-20',status:'realizada'}],
 consultations:[{...same,id:'c1',especialidade:'Avaliação',medico:'Dra. 1',data:'2026-11-18',status:'agendada',tratamento_ids:['t1'],document_id:'d2'},
  {...same,id:'c0',especialidade:'Sem relação',medico:'Dra. 2',data:'2026-11-20',status:'realizada'},
  {...foreign,id:'c-foreign',especialidade:'PRIVADO',medico:'PRIVADO',data:'2026-11-20',status:'realizada'}],
 treatments:[{...same,id:'t1',nome:'Tratamento real',status:'ativo'},{...foreign,id:'t-secret',nome:'SEGREDO',status:'ativo'}],
 documents:[{...same,id:'d1',title:'Documento cirúrgico'},{...same,id:'d2',title:'Documento da consulta'},
  {...same,id:'d3',title:'Documento coincidente',entidade_tipo:'cirurgia',entidade_id:'outra'},
  {...foreign,id:'d4',title:'SEGREDO',entidade_tipo:'cirurgia',entidade_id:'s1'}],
 orders:[{...same,id:'o1',title:'Pedido real',requested_on:'2026-11-17',deleted_at:null},
  {...same,id:'o2',title:'Pedido sem vínculo',requested_on:'2026-11-17'},
  {...foreign,id:'o3',title:'SEGREDO',requested_on:'2026-11-17'}],
 orderItems:Array.from({length:12},(_,i)=>({...same,id:`i${i}`,order_id:'o1',name:`Exame ${i}`,status:i===0?'result_received':'pending',result_received_at:i===0?'2026-11-21T10:00:00Z':null})),
 sessions:[{...same,id:'ss1',order_id:'o1',scheduled_at:'2026-11-20T15:00:00Z',status:'scheduled',laboratory_name:'Laboratório'}],
 consultationOrderLinks:[{...same,id:'l1',consultation_id:'c1',order_id:'o1',role:'origin'},
  {...foreign,id:'l2',consultation_id:'c1',order_id:'o3',role:'origin'}],
 assets:[{...same,id:'a1',filename:'Laudo compartilhado.pdf',upload_status:'synced'},
  {...foreign,id:'a2',filename:'SEGREDO.pdf',upload_status:'synced'}],
 assetLinks:[{...same,id:'al1',asset_id:'a1',entity_type:'exam_order_item',entity_id:'i0',role:'result'},
  {...same,id:'al2',asset_id:'a1',entity_type:'exam_order_item',entity_id:'i1',role:'result'},
  {...foreign,id:'al3',asset_id:'a2',entity_type:'exam_order_item',entity_id:'i0',role:'result'}]};
const frozen=JSON.stringify(input);const snapshot=build(input);
check(JSON.stringify(input)===frozen,'projeção não muta registros');
check(snapshot.surgery.status==='agendada','cirurgia agendada não vira realizada');
check(snapshot.consultation.status==='agendada','consulta agendada não vira realizada');
check(snapshot.surgeryRelations.length===2,'cirurgia usa apenas tratamento e documento explícitos');
check(snapshot.contextCandidates.length===1&&snapshot.contextCandidates[0].label==='Avaliação','tratamento compartilhado em contexto separado');
check(snapshot.warnings.some(s=>s.includes('NÃO comprova')),'seleção de cirurgia e consulta não presume relação');
check(snapshot.consultationRelations.some(x=>x.kind==='exam'&&x.label==='Pedido real'),'pedido de exame pelo vínculo exato');
check(!snapshot.consultationRelations.some(x=>x.label==='Pedido sem vínculo'),'sem associação por datas');
check(snapshot.consultationRelations.filter(x=>x.key.startsWith('exam:item-')).length===12,'12 itens distintos não são colapsados');
check(snapshot.counts.results===1,'só resultado recebido é fato');
check(snapshot.counts.files===1,'um PDF compartilhado resulta em um asset');
check(snapshot.consultationRelations.some(x=>x.label==='Laudo compartilhado.pdf'),'laudo por alvo e titular verificados');
check(!JSON.stringify(snapshot).includes('SEGREDO')&&!JSON.stringify(snapshot).includes('PRIVADO'),'escopo por conta e pessoa sem vazamento');
check(!snapshot.consultationRelations.some(x=>x.label==='Pedido sem vínculo'),'título/data não criam relação');
const orphan=build({...input,consultationId:'c0',surgeryId:'s1'});
check(orphan.consultationRelations.length===0,'consulta sem links continua vazia, sem invenção');
const alien=build({...input,consultationId:'c-foreign',surgeryId:'S-PRIVATE'});
check(!alien.consultation&&!alien.surgery,'seletor de outra pessoa não abre entidade');
const noScope=()=>build({...input,userId:'',personId:''});
check((()=>{try{noScope();return false}catch{return true}})(),'falta de escopo bloqueia');
for(let ncase=0;ncase<120;ncase++){
 const mix={...input,consultations:[...input.consultations,{...foreign,id:`f${ncase}`,especialidade:`SECRET-${ncase}`,medico:'private',data:'2026-11-20',status:'realizada'}],
  orders:[...input.orders,{...foreign,id:`o-private-${ncase}`,title:`SECRET-${ncase}`,requested_on:'2026-11-17'}]};
 check(!JSON.stringify(build(mix)).includes(`SECRET-${ncase}`),`cenário escopo ${ncase+1}`);
}
const ui=read(files[1]),route=read(files[2]),careflow=read(files[3]),surgery=read(files[4]),consult=read(files[5]);
check(ui.includes('const owned=<T extends {user_id:string;person_id?:string|null}>(rows:T[]):T[]'), 'M4 FIX1 mantém tipos concretos em vez de wrapper estrutural de tabela');
check((ui.match(/\.toArray\(\)\.then\(owned\)/g)||[]).length===10, 'M4 FIX1 preserva os tipos das dez coleções Dexie');
check(!ui.includes('const within=async'), 'M4 FIX1 não retorna objetos genéricos sem dados de consulta/cirurgia');
check(ui.includes('HealthRelationPicker')&&ui.includes('useLiveQuery'),'seletores e leitura canônicos');
check(ui.includes('db.persons.get(pid)')&&ui.includes('person.user_id!==uid'),'pessoa titular conferida antes da leitura');
check(ui.includes("row.user_id===uid&&row.person_id===pid"),'linhas conferidas por escopo');
check(!ui.includes('enfileirarOperacao')&&!ui.includes('.put(')&&!ui.includes('.add('),'nenhuma escrita clínica na jornada');
check(!/\b<input[^>]+type=["'](?:date|time)["']/.test(ui)&&!ui.includes('<select'),'sem controles nativos visíveis');
check(ui.includes('Contextos a conferir')&&ui.includes('NÃO significa')&&ui.includes('não cria nem comprova'),'sem falsa ligação cirúrgica');
check(ui.includes('encodeURIComponent')===false,'projeção gera rotas seguras; interface não reescreve URLs');
check(route.includes('<Suspense')&&route.includes('useSearchParams'),'rota protegida por Suspense');
check(route.includes('key={`${user?.id||\'\'}:${activePersonId||\'\'}`}'),'troca de pessoa limpa seleção da UI');
check(careflow.includes("withReturnTarget('/saude/jornada'"),'CareFlow oferece navegação de retorno');
check(surgery.includes('/saude/jornada?cirurgia=')&&consult.includes('/saude/jornada?consulta='),'telas de origem oferecem jornada');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.split('"scripts/test-vault-m4-clinical-journey.cjs"').length===2,'contrato M4 registrado exatamente uma vez');
check(gate.includes('"scripts/test-vault-m3-clinical-assets.cjs"')&&gate.includes('"scripts/test-vault-m2-exams-360.cjs"'),'M1/M2/M3 não removidas do gate');
console.log(`VAULT_M4_JORNADA_CONTRATOS_OK | ${n} verificacoes | pessoas isoladas | sem inferencia | escritor original preservado`);
