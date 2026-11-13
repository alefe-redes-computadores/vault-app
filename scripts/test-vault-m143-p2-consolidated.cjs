#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const read=f=>fs.readFileSync(f,'utf8');
function load(file,mocks={}){
 const filename=path.resolve(file),m=new Module(filename,module);
 m.filename=filename;
 m.paths=Module._nodeModulePaths(path.dirname(filename));
 m.require=(specifier)=>{
  if(specifier in mocks)return mocks[specifier];
  if(specifier.startsWith('@/'))return load(specifier.slice(2)+'.ts',mocks);
  if(specifier.startsWith('./')||specifier.startsWith('../'))return load(path.resolve(path.dirname(filename),specifier)+'.ts',mocks);
  return require(specifier);
 };
 m._compile(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 return m.exports;
}
const presentation=load('lib/health-supply/presentation.ts');
const visual=load('lib/health-supply/process-visual-m143.ts');
const med=(id,extra={})=>({id,user_id:'u',person_id:'p',nome:id,...extra});
const doc=(id,extra={})=>({id,person_id:'p',user_id:'u',category_id:'saude',title:id,type:'receita',metadata:{},attachments:[],created_at:'2026-11-12T00:00:00Z',...extra});
const meds=[med('clonazepam',{document_id:'current'}),med('clorpromazina',{status:'descontinuado'}),med('pristiq')];
const renewals=[{id:'r1',user_id:'u',person_id:'p',document_id:'historic',medicamento_id:'clonazepam'},
 {id:'r2',user_id:'other',person_id:'p',document_id:'foreign',medicamento_id:'clonazepam'}];
const docs=[doc('current'),doc('historic'),doc('metadata',{metadata:{linked_medicamento_ids:['clonazepam']}}),
 doc('other',{entidade_tipo:'medicamento',entidade_id:'pristiq'}),doc('orphan'),doc('foreign'),
 doc('outside',{user_id:'other',metadata:{medicamento_id:'clonazepam'}})];
assert.deepEqual(new Set(presentation.prioritizedSupplyDocuments(docs,'p','u',new Set(['clonazepam']),meds,renewals).map(d=>d.id)),new Set(['current','historic','metadata']));
assert.deepEqual(presentation.prioritizedSupplyDocuments(docs,'p','u',new Set(),meds,renewals),[]);
assert.deepEqual(presentation.prioritizedSupplyDocuments(docs,'other','u',new Set(['clonazepam']),meds,renewals),[]);
assert.deepEqual(new Set(presentation.unassignedSupplyDocuments(docs,'p','u',meds,renewals).map(d=>d.id)),new Set(['orphan','foreign']));
const treatments=[{nome:'Depressão',cor:'#e45c71'},{nome:'TDAH',cor:'#3f90e8'}];
assert.equal(visual.supplyVisualTreatmentM143('TDAH · tratamento',treatments).nome,'TDAH');
assert.equal(visual.supplyVisualTreatmentM143('Depressão · SUS',treatments).nome,'Depressão');
assert.equal(visual.supplyVisualTreatmentM143('Processo misto',treatments),null);
const attn=load('lib/health-intelligence/medication-list-attention-m143.ts',{
 '@/lib/health-intelligence/medication-care-decision':{
  medicationCareStageNeedsAttention:(stage)=>['withdrawal_overdue','prescription_needed','acquisition_needed','stock_review'].includes(stage)
 }
}).medicationListAttentionReasonsM143;
const item={med:{id:'m',tipo_uso:'continuo',estoque_horarios:['10:00','23:00']},isSuspenso:false,isSOS:false,dosesPendentesHoje:1,dosesIgnoradasHoje:0};
const taken=[{medicamento_id:'m',horario:'10:00',tomado_em:'2026-11-13T10:00'}];
assert.deepEqual(attn(item,'stable','prepare',taken,'14:00'),[],'dose 10h tomada, 23h futura e Brain prepare não significam atenção imediata');
assert.deepEqual(attn(item,'withdrawal_overdue',undefined,taken,'14:00'),['Retirada atrasada']);
assert.deepEqual(attn(item,'stable',undefined,[], '14:00'),['Dose do horário já vencido']);
assert.deepEqual(attn({...item,dosesPendentesHoje:0},'stable',undefined,taken,'14:00'),[]);
assert.deepEqual(attn({...item,dosesIgnoradasHoje:1},'stable',undefined,taken,'14:00'),['Dose ignorada para revisar']);
assert.deepEqual(attn(item,'stable',undefined,taken,'09:00'),[]);
const recipe=read('app/saude/renovacao/nova-receita/page.tsx');
assert.ok(recipe.includes('medicamentosIncluindoDescontinuados: medicamentos'));
assert.ok(recipe.includes('Histórico (não reativa)'));
assert.ok(!recipe.includes('medicamento.status !==\n                "descontinuado" &&'));
const supply=read('app/saude/fornecimento/page.tsx');
assert.ok(supply.includes('renewals={renovacoes}'));
assert.ok(supply.includes('supplyVisualTreatmentM143'));
assert.ok(supply.includes('sameDateReview'));
assert.ok(supply.includes('Comprar')===false || supply.includes('Comprado'));
assert.ok(supply.includes('const routeLabel=SUPPLY_ORIGIN_LABELS[p.origem]'));
const list=read('app/saude/medicamentos/page.tsx');
assert.ok(list.includes('const attentionReasonsM143=useMemo'));
assert.ok(list.includes('medicationCareStageNeedsAttention(careDecisionsByMedication'));
assert.ok(list.includes('brainLane === "now" || brainLane === "prepare"'));
assert.ok(list.includes('reasons.some(reason=>reason!=="Prioridade atual do Brain")'));
assert.ok(list.includes('Motivo da atenção'));
assert.ok(!list.includes('item.dosesPendentesHoje >\n                0 || item.dosesIgnoradasHoje > 0'));
const gate=read('scripts/test-v63-release-gate.mjs');
assert.ok(gate.includes('scripts/test-vault-m143-p2-consolidated.cjs'));
for (const file of [
 'app/saude/fornecimento/page.tsx','app/saude/renovacao/nova-receita/page.tsx',
 'components/saude/SupplyCycleSummary.tsx','lib/health-supply/presentation.ts',
 'lib/health-supply/process-visual-m143.ts','lib/health-intelligence/medication-list-attention-m143.ts',
 'app/saude/medicamentos/page.tsx'
]){
 const code=read(file);
 const parsed=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,`${file} ${parsed.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; ')}`);
}
console.log('M143 P2 CONSOLIDADA: TESTES DOCUMENTAIS, FILTRO, ORIGENS, HISTORICOS E TSX OK');
