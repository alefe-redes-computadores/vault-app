#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const read=f=>fs.readFileSync(f,'utf8');
let tested=0;
const ok=(v,msg)=>{assert.ok(v,`M143 P3: ${msg}`);tested++;console.log(`✓ P3 ${tested}: ${msg}`)};
const files=[
 'lib/health-supply/medication-eligibility.ts',
 'app/saude/medicamentos/editar/page.tsx',
 'app/saude/medicamentos/page.tsx',
 'lib/health-intelligence/medication-list-attention-m143.ts',
 'components/saude/MedicationStockOverview.tsx',
 'components/home/HomeBrainEvidenceGroup.tsx',
 'app/saude/fornecimento/page.tsx',
];
for(const file of files){
 const source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,
   file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const diagnostics=ast.parseDiagnostics.map(d=>`${ast.getLineAndCharacterOfPosition(d.start||0).line+1}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
 assert.equal(diagnostics.length,0,`${file}: ${diagnostics.join('; ')}`);
 ok(true,'TSX/TS integro '+file);
}
function load(file,mocks={}) {
 const filename=path.resolve(file),mod=new Module(filename,module);
 mod.filename=filename;
 mod.paths=Module._nodeModulePaths(path.dirname(filename));
 const source=ts.transpileModule(read(file),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
 }).outputText;
 mod.require=(key)=>{if(Object.hasOwn(mocks,key))return mocks[key];
   if(key.startsWith('node:'))return require(key);
   throw Error('Unexpected runtime import '+key+' in '+file);
 };
 mod._compile(source,filename);
 return mod.exports;
}
const med=(overrides={})=>({id:'m',user_id:'u',person_id:'p',status:'descontinuado',tipo_uso:'esporadico',...overrides});
const eligibility=load('lib/health-supply/medication-eligibility.ts');
ok(eligibility.isSupplyMedicationEligible(med()),'esporadico historico segue elegivel sem reativacao');
ok(eligibility.isSupplyMedicationEligible(med({tipo_uso:'sos'})),'sos legado preservado');
ok(!eligibility.isSupplyMedicationEligible(med({tipo_uso:'continuo'})),'rotina suspensa nao vira ativa');
ok(eligibility.isSupplyMedicationEligible(med({status:'ativo',tipo_uso:'continuo'})),'continuo ativo preservado');
ok(eligibility.canTrackSupplyMedication(med(),[],'p','u'),'fornecimento pode revisar SOS historico da pessoa');
ok(!eligibility.canTrackSupplyMedication(med(),[],'other','u'),'separacao de pessoas mantida');
ok(!eligibility.canTrackSupplyMedication(med(),[],'p','other'),'separacao de contas mantida');
ok(eligibility.canTrackSupplyMedication(med({tipo_uso:'continuo'}),[{medicamento_id:'m',person_id:'p',user_id:'u',status:'agendada'}],'p','u'),'retirada existente preservada sem reativar rotina');
const edit=read('app/saude/medicamentos/editar/page.tsx');
ok(edit.includes('Cadastro: {statusAtivo ? "Em uso" : "Suspenso"}'),'edicao mostra status separado');
ok(edit.includes('Alterar o tipo de uso não retoma um medicamento suspenso'),'edicao explica o efeito de SOS');
ok(edit.includes('Abrir Status Atual para retomar'),'retomada tem acesso explicito');
ok(edit.includes('setEditIntent("suspensao")'),'atalho aponta para a secao original de status');
ok(edit.includes('setStatusAtivo('),'status continua sob decisao humana');
const attention=load('lib/health-intelligence/medication-list-attention-m143.ts',{
 '@/lib/health-intelligence/medication-care-decision':{medicationCareStageNeedsAttention:stage=>['withdrawal_overdue','prescription_needed','acquisition_needed','stock_review'].includes(stage)}
});
const doseMed={id:'m',tipo_uso:'continuo',estoque_horarios:['10:00','23:00']};
const taken=[{medicamento_id:'m',horario:'10:00',tomado_em:'2026-11-13T10:05'}];
ok(attention.medicationNextPendingClockM143(doseMed,taken,'15:00')==='23:00','dose das 10h tomada e proxima as 23h');
ok(attention.medicationNextPendingClockM143(doseMed,taken,'23:30')===null,'dose vencida nao e mostrada como futura');
ok(attention.medicationNextPendingClockM143({...doseMed,tipo_uso:'esporadico'},taken,'15:00')===null,'SOS nao gera proxima dose fixa');
ok(attention.medicationNextPendingClockM143(doseMed,[...taken,{medicamento_id:'m',horario:'23:00',ignorado_em:'2026-11-13T12:00'}],'15:00')===null,'dose ignorada nao vira proxima nao confirmada');
ok(attention.medicationNextPendingClockM143(doseMed,taken,'invalid')===null,'horario invalido nao inventa previsao');
const item={med:doseMed,isSuspenso:false,isSOS:false,dosesPendentesHoje:1,dosesIgnoradasHoje:0};
ok(attention.medicationListAttentionReasonsM143(item,'stable','prepare',taken,'15:00').length===0,'proxima futura nao vira atencao executiva');
ok(attention.medicationListAttentionReasonsM143(item,'withdrawal_overdue',undefined,taken,'15:00').includes('Retirada atrasada'),'retirada atrasada continua prioritaria');
const list=read('app/saude/medicamentos/page.tsx');
ok(list.includes('medicationNextPendingClockM143(med, doseLogs || [], attentionClockM143)'),'lista usa os registros reais do dia');
ok(list.includes('const todayStatus = futureScheduleOnlyM143') && list.includes('today={todayStatus}'),'cartao comunica proximo horario e preserva contrato M71');
ok(list.includes('Horário futuro · não está atrasado'),'projecao futura rotulada corretamente');
ok(list.includes('Suspenso · SOS'),'medicamento historico com SOS nao parece rotina ativa');
ok(list.includes('brainLane === "now" || brainLane === "prepare"'),'contrato V271 preservado');
ok(list.includes('medicationCareStageNeedsAttention(careDecisionsByMedication'),'contrato V266 preservado');
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}}),Fragment:'fragment'};
const Icon=()=>null;
const stock=load('components/saude/MedicationStockOverview.tsx',{
 'react/jsx-runtime':jsx,'react':{},'lucide-react':new Proxy({},{get:()=>Icon}),
 '@/hooks/useDismissibleDetails':{useDismissibleDetails:()=>({current:null})}
});
ok(stock.medicationStockUnitLabelM143(1,'comprimido(s)')==='comprimido','estoque 1 comprimido');
ok(stock.medicationStockUnitLabelM143(35,'comprimido(s)')==='comprimidos','estoque 35 comprimidos');
ok(stock.medicationStockUnitLabelM143(1,'cápsulas')==='cápsula','estoque uma capsula');
ok(stock.medicationStockUnitLabelM143(2,'gotas')==='gotas','estoque duas gotas');
ok(stock.medicationStockUnitLabelM143(10,'ml')==='ml','ml nao recebe plural inventado');
ok(stock.medicationStockUnitLabelM143(10,'embalagem personalizada')==='embalagem personalizada','unidade desconhecida preservada');
const supply=read('app/saude/fornecimento/page.tsx');
ok(supply.includes('color=/^#[0-9a-f]{6}$/i.test(t.cor||"")?t.cor!:getClinicalTheme(t.nome).hex'),'fornecimento herda tema canonico quando cor nao informada');
const brain=read('components/home/HomeBrainEvidenceGroup.tsx');
ok(brain.includes('expandedM143')&&brain.includes('aria-expanded={expandedM143}'),'Brain recolhe evidencias longas sem perder acesso');
ok(brain.includes('insights.map((insight, index)'),'Brain preserva todos os sinais originais');
ok(brain.includes('onOpen(insight)'),'cada evidencia abre detalhe original');
ok(brain.includes('Ver mais ${insights.length-2} evidências'),'Brain evita 17 itens repetitivos na primeira dobra');
console.log(`M143 P3 FECHAMENTO: ${tested} CONTRATOS APROVADOS.`);
