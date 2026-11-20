#!/usr/bin/env node
'use strict';
/* VAULT R5 — semantic and cross-module contract checks. No clinical writes. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let count=0;
const check=(ok,name)=>{assert.ok(ok,'R5: '+name);count++};
const names=[
 'lib/m3/brain-facts-p2.ts',
 'app/saude/careflow/linha-do-tempo/page.tsx',
 'app/saude/careflow/exames/page.tsx',
 'app/saude/exames/page.tsx',
 'app/saude/careflow/sintomas/page.tsx',
 'app/saude/careflow/pressao/page.tsx',
 'app/saude/registros/page.tsx',
 'app/saude/careflow/page.tsx'
];
for(const f of names){
 const parsed=ts.createSourceFile(f,read(f),ts.ScriptTarget.ESNext,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(parsed.parseDiagnostics.length===0,f+': sintaxe TS/TSX '+parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(';'));
}
const brain=read(names[0]),timeline=read(names[1]),orders=read(names[2]),exams=read(names[3]),symptoms=read(names[4]),pressure=read(names[5]),records=read(names[6]),hub=read(names[7]);
check(brain.includes('medicationVisual')&&brain.includes('med.formato')&&brain.includes('med.cores')&&brain.includes('owner(m)'), 'Brain somente aproveita identidade declarada do medicamento da pessoa ativa');
check(timeline.includes("@/components/saude/MedicationFormatIcon")&&timeline.includes('<MedicationFormatIcon size={26}')&&timeline.includes('item.medicationVisual'), 'ícone de forma/cor real reutilizado no Brain');
check(timeline.includes('factIcon=')&&timeline.includes('Footprints')&&timeline.includes('Wind')&&timeline.includes('Moon')&&timeline.includes('HeartPulse'),'ícones semânticos conservados para demais fatos');
check(timeline.includes('withReturnTarget(item.href,origin)')&&timeline.includes('recordKeyFromHashR3')&&timeline.includes('revealCountR3'),'retorno ao fato antigo preservado');
const trans=ts.transpileModule(brain,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};vm.runInNewContext(trans,{module:mod,exports:mod.exports,Date,Set,Map,Math,String,Number,Boolean,Array,Object,console,Intl},{timeout:3000});
const owner={user_id:'u',person_id:'p'},other={user_id:'x',person_id:'p'};
const basis={userId:'u',personId:'p',consultas:[],cirurgias:[],exames:[],
 doses:[{...owner,id:'dose1',data:'2026-11-19',horario:'22:00',medicamento_id:'m1',tomado_em:'2026-11-20T01:00:00Z'},{...owner,id:'dose2',data:'2026-11-19',medicamento_id:'m2'},{...owner,id:'dose3',data:'2026-11-19',medicamento_id:'xmed'}],
 medicamentos:[{...owner,id:'m1',nome:'Fenergan',formato:'comprimido',cores:['#ffffff']},{...owner,id:'m2',nome:'Sem forma definida'},{...other,id:'xmed',nome:'SIGILO',formato:'capsula',cores:['#ff0000']}],registros:[],careflow:[]};
const facts=mod.exports.buildBrainFactsP2(basis,50);
check(facts.length===3,'quantidade factual mantida');
const d1=facts.find(f=>f.sourceId==='dose1'),d2=facts.find(f=>f.sourceId==='dose2'),d3=facts.find(f=>f.sourceId==='dose3');
check(d1?.medicationVisual?.formato==='comprimido'&&d1.medicationVisual.cores[0]==='#ffffff','medicamento conhecido tem apresentação declarada');
check(d2&&!d2.medicationVisual,'medicamento sem desenho não recebe formato inventado');
check(d3&&!d3.medicationVisual&&d3.title.includes('Medicamento não identificado')&&!JSON.stringify(facts).includes('SIGILO'),'outra pessoa não vaza nome nem imagem');
check(orders.includes('Ações dos pedidos')&&!orders.includes('role="tablist"')&&orders.includes('Voltar aos pedidos'),'pedidos são lista com CTA contextual, sem duas abas');
check(orders.includes("tab==='orders'")&&orders.includes("tab==='new'")&&orders.includes("setTab('orders');setItems([])"),'novo pedido mantém fluxo de retorno à lista');
check(orders.includes('runOCR()')&&orders.includes('origin===\'ocr\'')&&orders.includes('Revisei este item na solicitação original'),'revisão manual/OCR preservada');
check(orders.includes('itemStates[item.id]||state')&&orders.includes('draft(item.id).resultValue'),'estado e resultado independentes por item');
check(orders.includes("get('novo')==='1'")&&orders.includes('careflow-pedido-'),'atalho contextual e deep link por ID preservados');
check(exams.includes('Pedidos de exames (')&&exams.includes('unifiedRows.map(')&&exams.includes("preserveReturn('/saude/careflow/exames?novo=1')"),'Exames e Laudos integra pedidos e exames em uma lista, preservando novo pedido');
check(!exams.includes('Pedido com vários exames · CareFlow 360')&&exams.includes('examesComStatus'),'CTA redundante removido sem apagar exames canônicos');
check(symptoms.includes('composeOpen')&&symptoms.includes('Registrar sintoma')&&symptoms.includes('useRegistrosSaude')&&symptoms.includes("createRegistro({categoria:'sintoma'"),'sintoma usa escrita canônica e formulário sob demanda');
check(symptoms.includes('historyLimit')&&symptoms.includes('revealCountR3')&&symptoms.includes('careflow-sintoma-'),'histórico além de 100 e retorno por ID preservados');
check(pressure.includes('showPlanForm')&&pressure.includes('showReadingForm')&&pressure.includes('Salvar medição real')&&pressure.includes('saveHealthMeasurement(scope.pid'),'plano e medição sob demanda, escrita canônica de pressão preservada');
check(pressure.includes('pendingContext')&&pressure.includes('repairContext')&&pressure.includes('pressure_context_explicit'),'reparo de vínculo por ID sem segunda medição');
check(records.includes('Acompanhamentos desta Linha de cuidado')&&records.includes('/saude/careflow/sintomas')&&records.includes('/saude/careflow/pressao'),'Linha de cuidado conecta sintomas, medições e planos sem segundo repositório');
check(hub.includes('Pedidos de exames')&&hub.includes('Mesmos relatos da Linha de cuidado')&&hub.includes("href:'/saude/careflow/pressao'")&&hub.includes("href:'/saude/careflow/exames'"),'hub contextual mantém as rotas históricas');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.split('"scripts/test-vault-r5-integracao-clinica.cjs"').length===2,'novo contrato V63 exato uma vez');
for(const p of ['scripts/test-vault-careflow-p0p1-r1.cjs','scripts/test-vault-careflow-r2-contexto.cjs','scripts/test-vault-careflow-r3-rotas.cjs','scripts/test-vault-r4-respiro-global.cjs'])check(gate.includes(`"${p}"`),'contrato anterior preservado: '+p);
console.log(`R5_INTEGRACAO_CLINICA_OK | verificacoes=${count} | sem gravacoes clinicas | Android pendente`);
