#!/usr/bin/env node
'use strict';
/** CareFlow P0/P1 R1: behavior tests of pure factual read model + static contracts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
const check=(condition,name)=>{assert.ok(condition,'CareFlow R1: '+name);n++};
const paths=['app/saude/careflow/page.tsx','app/saude/careflow/modo-medico/page.tsx','app/saude/careflow/linha-do-tempo/page.tsx','app/saude/careflow/fato/page.tsx','app/saude/careflow/sintomas/page.tsx','app/saude/careflow/exames/page.tsx','app/saude/careflow/dossie/page.tsx','lib/m3/brain-facts-p2.ts','lib/m3/medical-dossier-p3.ts','lib/m3/careflow-timeline.ts'];
for(const path of paths){const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);check(source.parseDiagnostics.length===0,'TS/TSX sem erro '+path+' '+source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(' | '));}
const brainSource=read('lib/m3/brain-facts-p2.ts');
const compiled=ts.transpileModule(brainSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};vm.runInNewContext(compiled,{module:mod,exports:mod.exports,Date,Set,Map,Math,String,Number,Boolean,Array,Object,console,Intl},{timeout:3000});
const build=mod.exports.buildBrainFactsP2;check(typeof build==='function','projeção de fatos carregada');
const own={user_id:'u1',person_id:'p1'},other={user_id:'u2',person_id:'p2'};
const input={userId:'u1',personId:'p1',consultas:[],cirurgias:[],exames:[],
 doses:[{...own,id:'d-1',medicamento_id:'m-1',data:'2026-11-18',horario:'22:00',tomado_em:'2026-11-19T01:00:00.000Z'},
   {...own,id:'d-2',medicamento_id:'other',data:'2026-11-18',horario:'20:00'},
   {...other,id:'secret-dose',medicamento_id:'secret-med',data:'2026-11-18',horario:'09:00',tomado_em:'2026-11-18T09:00:00Z'}],
 medicamentos:[{...own,id:'m-1',nome:'Donaren',dosagem:'50 mg'},{...other,id:'other',nome:'PROIBIDO - OUTRA PESSOA',dosagem:'10 mg'},{...other,id:'secret-med',nome:'PROIBIDO',dosagem:'10 mg'}],
 registros:[{...own,id:'r-1',data:'2026-11-18',horario:'19:00',nome:'Batimentos',tipo:'frequencia_cardiaca',valor_numerico:142,unidade_medida:'bpm',source:'health_connect'},
 {...own,id:'r-2',data:'2026-11-18',nome:'Dor',tipo:'dor',intensidade:9},{...other,id:'r-secret',data:'2026-11-18',nome:'PROIBIDO'}],careflow:[]};
let rows=build(input,100);
check(rows.length===4,'somente quatro fatos da conta e pessoa ativas');
check(rows.some(r=>r.kind==='dose_tomada'&&r.title.includes('Donaren')&&r.title.includes('50 mg')&&r.time==='22:00'),'nome dosagem e hora da dose real');
check(rows.some(r=>r.kind==='dose_registrada'&&r.title.includes('Medicamento não identificado')),'medicamento estrangeiro não é usado na dose');
check(rows.some(r=>r.sourceId==='d-1'&&r.href.includes('tipo=dose&id=d-1')),'dose com ID exato');
check(rows.some(r=>r.sourceId==='r-1'&&r.href.includes('tipo=registro&id=r-1')&&r.detail.includes('142 bpm')),'medição e valor com link exato');
check(rows.some(r=>r.sourceId==='r-2'&&r.intensity===9),'intensidade declarada preservada');
check(!JSON.stringify(rows).includes('PROIBIDO')&&!JSON.stringify(rows).includes('health_connect'),'sem vazamento de outro dono nem termo técnico');
const copy=JSON.stringify(input);build(input,200);check(JSON.stringify(input)===copy,'projeção pura, sem mutação');
const shortened=build(input,2);check(shortened.length===2,'limite explícito funciona');
const event={...own,id:'exam-1',kind:'exam_order',created_at:'2026-11-17T11:00:00Z',payload:{title:'Pedido de exames',date:'2026-11-17'}};
const item={...own,id:'exam-item-1',kind:'exam_item',parent_id:'exam-1',created_at:'2026-11-17T11:00:00Z',payload:{name:'Hemograma'}};
rows=build({...input,careflow:[event,item]},100);
check(rows.find(x=>x.sourceId==='exam-item-1').href.includes('careflow-exame-exam-item-1'),'item abre ID exato dentro do pedido autorizado');
const foreignParent={...other,id:'foreign-parent',kind:'exam_order',created_at:'2026-11-17T11:00:00Z',payload:{title:'inexistente'}};
rows=build({...input,careflow:[foreignParent,{...item,parent_id:'foreign-parent'}]},100);
check(!rows.find(x=>x.sourceId==='exam-item-1').href.includes('careflow-pedido-foreign-parent'),'parent fora do escopo não gera link');
const hub=read(paths[0]),medical=read(paths[1]),timeline=read(paths[2]),detail=read(paths[3]),symptoms=read(paths[4]),exams=read(paths[5]),dossier=read(paths[6]),dossierModel=read('lib/m3/medical-dossier-p3.ts');
check(hub.includes('min-[360px]:grid-cols-2')&&hub.includes('metrics.filter(m=>m.count>0)'),'hub responsivo sem zeros mortos');
check(!hub.includes('withdrawalConflictsM2')&&hub.includes('Modo Médico 360'),'alerta de retiradas duplicado saiu só do hub');
check(medical.includes("period==='custom'")&&medical.includes('aria-pressed={period===days}')&&medical.includes('Personalizado'),'período 7/30/90 e personalizado visível');
check(medical.includes("mode:'detailed'")&&medical.includes('normalized')&&medical.includes('groups.map'),'busca sobre leitura detalhada e categorias agrupadas');
check(medical.includes('withReturnTarget')&&medical.includes('medicalReturn')&&medical.includes("secoes:sections.join(',')"),'retorno com escopo de filtros preservado');
check(medical.includes('A busca visual não')||medical.includes('busca visual não exclui'),'prévia/PDF explicam universo distinto');
check(timeline.includes('db.medicamentos.where')&&timeline.includes('buildBrainFactsP2')&&timeline.includes('withReturnTarget'),'evolução hidrata medicamento e preserva retorno');
check(timeline.includes('aria-pressed={days===n}')&&timeline.includes('[7,15,30,90]'),'todos os chips temporais com estado');
check(detail.includes('db.doseLogs.get(id)')&&detail.includes('db.registros_saude.get(id)')&&detail.includes('d.person_id!==pid')&&detail.includes('r.person_id!==pid'),'detalhe factual protege origem pessoa');
check(!detail.includes('createRegistro')&&!detail.includes('db.doseLogs.put')&&!detail.includes('db.registros_saude.put'),'detalhe nunca grava fatos');
check(exams.includes("tab==='orders'")&&exams.includes("tab==='new'")&&exams.includes('Meus pedidos'),'pedidos e novo pedido em abas');
check(exams.includes("setTab('orders');setItems([])")&&exams.includes('target:ring-2'),'pedido salvo retorna ao histórico e deep link destaca o item real');
check(exams.includes('itemStates[item.id]||state')&&exams.includes('itemStates[itemId]||existing.state'),'status exibido é o estado salvado por item');
check(exams.includes('draft(item.id).resultValue')&&exams.includes('draft(itemId)'),'resultados isolados por item');
check(exams.includes("origin==='ocr'?'uncertain':'checked'")&&exams.includes('Revisei este item na solicitação original')&&exams.includes("doctor:(doctorId?'':doctor.trim().slice(0,160))"),'OCR distinto de entrada manual e sem confirmação automática');
check(symptoms.includes('iconOf=(t:string)')&&symptoms.includes('intensityTone=(n:number')&&symptoms.includes('aria-pressed={type===name}'),'sete sintomas com cores e ícones');
check(symptoms.includes('dateEdited.current=false')&&symptoms.includes('timeEdited.current=false')&&symptoms.includes('setDate(getLocalTodayISO())')&&symptoms.includes('setTime(new Date().toTimeString().slice(0,5))'),'reset de dia e hora após salvamento com controle de edição');
check(dossier.includes('row.kind.startsWith')&&dossier.includes('makeCareFlowTimelinePdfM3'),'dossiê com ícones sem substituir exportação');
check(dossierModel.includes('human(safe(r.title')&&dossierModel.includes('tipo=dose&id='),'tradução somente leitura e links por ID');
const gate=read('scripts/test-v63-release-gate.mjs');check(gate.split('"scripts/test-vault-careflow-p0p1-r1.cjs"').length===2,'registro novo único no V63');
console.log(`VAULT CAREFLOW P0/P1 R1: ${n} garantias aprovadas; homologação Android ainda necessária`);
