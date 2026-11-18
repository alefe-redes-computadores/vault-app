/* VAULT CI360 P6 P3-D3 — contratos D3 reais, leitura sem alterações clínicas. */
'use strict';
const fs=require('node:fs');const assert=require('node:assert/strict');const vm=require('node:vm');const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
function transpile(path,tsx=false){
 const res=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,...(tsx?{jsx:ts.JsxEmit.ReactJSX}:{}),esModuleInterop:true}});
 assert.equal(res.diagnostics?.length||0,0,'Falha de sintaxe TS/TSX em '+path);
 return res.outputText;
}
const vmModule={exports:{}};
vm.runInNewContext(transpile('lib/m3/brain-return-d3.ts'),{exports:vmModule.exports,module:vmModule,require:id=>{throw Error('Dependência de runtime inesperada: '+id);}, Date,Math,Number,String,Boolean,Object,Array,Map,Set,JSON,Error,RegExp,console},{timeout:5000});
const {buildReturnBriefD3,prioritizeEpisodePromptD3,contextualEpisodeHrefD3,formatReturnBriefD3}=vmModule.exports;
const consultation={id:'consult-a',user_id:'owner',person_id:'pessoa-a',data:'2026-11-17',status:'realizada',proximos_passos:'Conferir retornos relatados'};
const rows=[
 {key:'s1',section:'symptoms',source:'health_record',sourceId:'s1',date:'2026-11-18',time:'08:00',title:'Ouvido quente (percepção)',detail:'Sem temperatura medida; intensidade 6/10',href:'/saude/careflow/sintomas#careflow-sintoma-s1'},
 {key:'s2',section:'symptoms',source:'health_record',sourceId:'s2',date:'2026-11-17',time:'16:00',title:'Ouvido quente (percepção)',detail:'Primeiro relato; intensidade 3/10',href:'/saude/careflow/sintomas'},
 {key:'order',section:'careflow',source:'careflow_exam_order',sourceId:'o1',date:'2026-11-17',time:null,title:'Pedido documentado',detail:'Pedido de exames ligado por ID',href:'/saude/careflow/exames'},
 {key:'med',section:'medications',source:'medication_current_snapshot',sourceId:'med1',date:'2026-11-18',time:null,title:'Medicamento atual',detail:'Não é prova de dose',href:'/saude/medicamentos/detalhes?id=med1'}
];
const action={id:'symptom:consult-a:s1',label:'Como evoluiu?',explanation:'Relato real',sourceId:'s1',href:'/saude/careflow/sintomas'};
const episode=()=>({consultation:{...consultation},rows:rows.map(x=>({...x})),stats:{symptoms:2,examOrders:1,examItems:1,results:0,linkedMedications:1},nextAction:{...action},gaps:['Registros não confirmados'],report:{start:'2026-11-17',end:'2026-11-18',mode:'summary',availableCount:4}});
const initial=episode(); const frozen=JSON.stringify(initial);
const brief=buildReturnBriefD3(initial,'2026-11-18');
assert.equal(JSON.stringify(initial),frozen,'O Brain D3 não pode mutar a autoridade clínica.');
assert.equal(brief.consultationId,'consult-a');assert.equal(brief.facts.length,3);
assert(brief.facts.some(f=>f.title.includes('Ouvido quente')));
assert(brief.checks.some(c=>c.title.includes('exames')&&c.explanation.includes('não prova')));
assert(brief.questions.some(q=>q.includes('sintomas')));
assert.equal(brief.action,null,'Já houve sintoma registrado no dia; Brain não repete convite.');
assert.equal(prioritizeEpisodePromptD3(action,'2026-11-18','2026-11-17')?.id,action.id,'Relato antigo pode gerar convite opcional.');
assert.equal(prioritizeEpisodePromptD3(action,'2026-11-18','2026-11-18'),null,'Relato atual suprime convite duplicado.');
assert.equal(prioritizeEpisodePromptD3(action,'2026-02-31','2026-11-17'),null,'Data inválida não dispara ação.');
assert.equal(contextualEpisodeHrefD3('/saude/careflow/exames','consult-a'),'/saude/careflow/exames?consulta=consult-a');
assert.equal(contextualEpisodeHrefD3('/saude/medicamentos/novo','consult-a'),'/saude/medicamentos/novo?consulta=consult-a');
assert.equal(contextualEpisodeHrefD3('https://evil.example','consult-a'),'/saude/careflow/episodios');
assert.equal(contextualEpisodeHrefD3('//evil.example','consult-a'),'/saude/careflow/episodios');
const copy=formatReturnBriefD3(brief);
assert(copy.includes('Cartão de Retorno')&&copy.includes('PARA CONFERIR')&&copy.includes('PERGUNTAS'));
assert(!copy.includes('med1')&&!copy.includes('consult-a'),'Cópia não divulga IDs técnicos em texto.');
assert.throws(()=>buildReturnBriefD3({...initial,report:{...initial.report,start:'2026-11-16'}},'2026-11-18'),/incompatível/);
assert.throws(()=>buildReturnBriefD3(initial,'2026-11-16'),/incompatível/);
const noRows=episode();noRows.rows=[];noRows.stats={symptoms:0,examOrders:0,examItems:0,results:0,linkedMedications:0};noRows.nextAction=null;
noRows.consultation.proximos_passos='';
const empty=buildReturnBriefD3(noRows,'2026-11-18');assert.equal(empty.facts.length,0);assert.equal(empty.action,null);
assert(empty.checks[0].explanation.includes('Sem pendência comprovada'));
const inactive=episode();inactive.consultation.status='agendada';assert.equal(buildReturnBriefD3(inactive,'2026-11-18').action,null);
const component='components/saude/BrainReturnCardD3.tsx'; transpile(component,true);
const jsx=read(component),page=read('app/saude/careflow/episodios/page.tsx'),home=read('components/home/ClinicalEpisodePulseP4.tsx'),gate=read('scripts/test-v63-release-gate.mjs');
assert(page.includes('buildReturnBriefD3')&&page.includes('<BrainReturnCardD3')&&page.includes('makeMedicalPdfP3'));
assert(!page.includes('ep.nextAction&&<section aria-label="Próxima ação opcional fundamentada"'),'Não deve existir segundo Brain no episódio');
assert(home.includes('prioritizeEpisodePromptD3')&&home.includes('selectEpisodeActionP4')&&home.includes('hidden===scope')&&home.includes('Por quê?'));
assert(jsx.includes('Copiar cartão manualmente')&&jsx.includes('navigator.clipboard.writeText')&&jsx.includes('não envia nada automaticamente'));
assert(!jsx.includes('localStorage')&&!jsx.includes('supabase.from('));
assert(gate.split('"scripts/test-vault-ci360-p6-p3-d3.cjs"').length===2,'D3 exatamente uma vez no V63');
assert(gate.includes('"scripts/test-vault-ci360-p6-p4a-episode.cjs"'),'P4A preservada');
console.log('CI360 P6 P3-D3: Brain sem repetição, cartão com fontes, privacidade e P4-A preservados OK');
