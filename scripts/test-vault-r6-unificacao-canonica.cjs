'use strict';
/** R6: synthetic only, no medical records or network. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
const ok=(value,name)=>{assert.ok(value,'R6 '+name);checks++};
const file='lib/clinical-unified-r6.ts';
for(const path of [file,'app/saude/exames/page.tsx','app/saude/registros/page.tsx','app/saude/careflow/exames/page.tsx','app/saude/careflow/sintomas/page.tsx','app/saude/careflow/pressao/page.tsx']){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(source.parseDiagnostics.length===0,path+' sintaxe '+source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('|'));
}
const compiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};vm.runInNewContext(compiled,{module:mod,exports:mod.exports,Date,Array,Set,String,Number,Object,Map,console},{timeout:4000});
const {buildUnifiedExamWorkspaceR6,filterClinicalEventsR6}=mod.exports;
ok(typeof buildUnifiedExamWorkspaceR6==='function','read model real');
const exams=[{id:'exam-2',nome:'Hemograma',data:'2026-11-19'},{id:'exam-1',nome:'Raio X',data:'2026-11-18'}];
const orders=[{order:{id:'order-2',payload:{title:'Pedido recente',date:'2026-11-20'}},items:[{item:{id:'item-2',payload:{name:'Hemograma'}},state:'pending'}]},{order:{id:'order-1',payload:{title:'Outro pedido',date:'2026-11-17'}},items:[{item:{id:'item-1',payload:{name:'Glicose'}},state:'pending'}]}];
let rows=buildUnifiedExamWorkspaceR6(exams,orders,'',true);
ok(rows.length===4,'dois exames + dois pedidos distintos');
ok(rows[0].kind==='order'&&rows[0].order.id==='order-2'&&rows[1].kind==='exam'&&rows[1].exame.id==='exam-2','ordem por data civil, identidade preservada');
ok(rows.filter(x=>x.kind==='exam').length===2&&rows.filter(x=>x.kind==='order').length===2,'mesmo nome não cria duplicação nem fusão');
ok(new Set(rows.map(x=>x.key)).size===4,'identificadores distintos por origem');
ok(buildUnifiedExamWorkspaceR6(exams,orders,'glicose',true).some(x=>x.kind==='order'&&x.order.id==='order-1'),'pesquisa encontra item do pedido');
ok(buildUnifiedExamWorkspaceR6(exams,orders,'recente',true).some(x=>x.kind==='order'&&x.order.id==='order-2'),'pesquisa encontra título de pedido');
ok(buildUnifiedExamWorkspaceR6(exams,orders,'',false).every(x=>x.kind==='exam'),'filtro de validades não reinterpreta status de pedidos');
ok(buildUnifiedExamWorkspaceR6([],orders,'',true).length===2,'pedidos visíveis mesmo sem exame convencional');
ok(buildUnifiedExamWorkspaceR6(exams,[], '',true).length===2,'exames existentes independem de pedidos');
ok(buildUnifiedExamWorkspaceR6(exams,orders,'Hemograma',true).filter(x=>x.kind==='order').length===1,'busca por nome não une pedido e exame');
const fifteen=Array.from({length:15},(_,i)=>({item:{id:`item-${i+1}`,payload:{name:`Exame solicitado ${i+1}`}},state:i<3?'result_received':i<5?'collected':'pending'}));
const fifteenOrders=[{order:{id:'pedido-15',payload:{title:'Solicitação com 15 exames',date:'2026-11-20'}},items:fifteen}];
const grouped15=buildUnifiedExamWorkspaceR6([],fifteenOrders,'',true);
ok(grouped15.length===1&&grouped15[0].kind==='order'&&grouped15[0].items.length===15,'pedido com quinze exames vira UM registro de lista');
ok(grouped15[0].items.filter(x=>x.state==='result_received').length===3,'estados individuais preservados dentro do único grupo');
ok(buildUnifiedExamWorkspaceR6([],fifteenOrders,'Exame solicitado 14',true).length===1,'pesquisa por item encontra pedido inteiro, sem criar card extra');
const records=[{category:'sintoma',record:{tipo:'dor'}},{category:'medicao',record:{tipo:'pressao_arterial'}},{category:'medicao',record:{tipo:'frequencia_cardiaca'}},{category:'dose'}];
ok(filterClinicalEventsR6(records,'sintomas').length===1,'foco sintoma');
ok(filterClinicalEventsR6(records,'pressao').length===1,'foco pressão não inclui frequência cardíaca');
ok(filterClinicalEventsR6(records,'todos').length===4,'lista integral preservada');
ok(JSON.stringify(records)===JSON.stringify([{category:'sintoma',record:{tipo:'dor'}},{category:'medicao',record:{tipo:'pressao_arterial'}},{category:'medicao',record:{tipo:'frequencia_cardiaca'}},{category:'dose'}]),'filtros são puros');
const main=read('app/saude/exames/page.tsx');
ok(main.includes('unifiedRows.map(')&&main.includes('entry.kind === \'order\'')&&main.includes('const exame=entry.exame'),'pedidos e exames na mesma lista renderizada');
ok(!main.includes('careflowOrders.slice(0,5)'),'sem mini-histórico separado ou corte silencioso de cinco pedidos');
ok(main.includes('<details key={entry.key}')&&main.includes('<summary className=')&&main.includes('items.map(({item,state})=><li key={item.id}>'),
  'cada pedido é um card premium expansível; itens aparecem somente como linhas internas');
ok(main.includes('const received=items.filter')&&main.includes('const pending=items.filter')&&main.includes('statusLabel[state]'),
  'resumo do pedido mostra progresso factual sem converter pedido em laudo');
ok(!main.includes('items.map(({item,state})=><ListCard'),
  'um pedido com 15 itens jamais renderiza 15 cards na tela de exames');
ok(main.includes('unifiedRows.length')&&main.includes('Novo pedido')&&main.includes('preserveReturn(\'/saude/careflow/exames?novo=1\')'),'criação e estado vazio coerentes com dados combinados');
const recordsPage=read('app/saude/registros/page.tsx');
ok(recordsPage.includes('filterClinicalEventsR6(')&&recordsPage.includes("focus==='pressao'")&&recordsPage.includes('pressurePlans.map('),'mesma Linha de cuidado para aferições e planos');
ok(recordsPage.includes('setFocus("sintomas")')&&recordsPage.includes('setFocus("pressao")'),'sintomas e pressão abrem filtros na tela principal');
ok(recordsPage.includes('sintoma"?"/saude/careflow/sintomas?novo=1"'),'atalho de sintoma reutiliza formulário avançado');
for(const [path,query,canonical] of [
 ['app/saude/careflow/exames/page.tsx','novo','/saude/exames'],
 ['app/saude/careflow/sintomas/page.tsx','novo','/saude/registros?foco=sintomas'],
 ['app/saude/careflow/pressao/page.tsx','plano','/saude/registros?foco=pressao']]){
 const source=read(path);
 ok(source.includes('router.replace(preserveReturnTarget(\''+canonical+'\',params))')&&source.includes('params.has(\''+query+'\')'),'rota histórica preserva return_to, lista canônica e editor '+path);
}
const dossier=read('lib/m3/medical-dossier-p3.ts');
ok(dossier.includes('const exactHrefR6=')&&dossier.includes('href:exactHrefR6')&&dossier.includes('careflow-exame-${encodeURIComponent(examItem.id)}'),'Modo Médico abre pedido/exame pelo ID real');
ok(dossier.includes('monitor_reading')&&dossier.includes("selected('measurements')")&&dossier.includes("r.tipo==='pressao_arterial'"),'relatório não repete aferição canônica ligada ao plano');
ok(dossier.includes('href:e.id?`/saude/exames/detalhes?id=${encodeURIComponent(e.id)}`:null'),'exames convencionais têm detalhe por ID ou destino indisponível');
const episode=read('lib/m3/clinical-episode-p4.ts');
ok(episode.includes('careflow-pedido-${encodeURIComponent(e.id)}')&&episode.includes('careflow-exame-${encodeURIComponent(e.id)}'),'episódio clínico preserva rotas exatas');
const nav=read('components/BottomNav.tsx');
ok(nav.includes('isFocusedClinicalEditor')&&nav.includes('searchParams.has("novo")')&&nav.includes('searchParams.has("plano")'),'editor focado libera teclado Android sem BottomNav');
const oldR5=read('scripts/test-vault-r5-integracao-clinica.cjs');
ok(!oldR5.includes("careflowOrders.slice(0,5)"),'R5 gate atualizado sem exigir interface antiga');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-r6-unificacao-canonica.cjs"').length===2,'R6 incluída só uma vez no V63');
ok(gate.includes('"scripts/test-vault-r5-integracao-clinica.cjs"')&&gate.includes('"scripts/test-vault-r4-respiro-global.cjs"'),'R4 e R5 permanecem no V63');
console.log(`R6_UNIFICACAO_CANONICA_OK | ${checks} verificacoes | zero escrita clinica`);
