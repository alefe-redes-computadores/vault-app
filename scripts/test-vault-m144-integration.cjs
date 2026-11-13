#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=require('typescript');
const read=(path)=>fs.readFileSync(path,'utf8');
const gate=read('scripts/test-v63-release-gate.mjs');
const required=[
 'scripts/test-vault-m143-p2-consolidated.cjs',
 'scripts/test-vault-m143-p3-closure.cjs',
 'scripts/test-vault-brain-v7-universal.cjs',
 'scripts/test-vault-supply-shield-ss7.cjs',
 'scripts/test-vault-visual-studio-v8.cjs',
 'scripts/test-vault-m144-integration.cjs',
];
for(const p of required){
 assert.ok(fs.existsSync(p),'Integracao ausente: '+p);
 assert.equal(gate.split('"'+p+'"').length-1,1,'Contrato deve aparecer exatamente uma vez: '+p);
}
const elig=read('lib/health-supply/medication-eligibility.ts');
assert.match(elig,/esporadico/,'SOS da edicao reconhecido pelo fornecimento');
const Module=require('node:module');
const target=ts.transpileModule(elig,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const eligModule=new Module('medication-eligibility-m144',module);
eligModule._compile(target,eligModule.id);
const {isSupplyMedicationEligible}=eligModule.exports;
assert.equal(isSupplyMedicationEligible({status:'descontinuado',tipo_uso:'esporadico'}),true,'SOS histórico elegível para fornecimento, sem mudar cadastro');
assert.equal(isSupplyMedicationEligible({status:'descontinuado',tipo_uso:'sos'}),true,'SOS legado elegível');
assert.equal(isSupplyMedicationEligible({status:'descontinuado',tipo_uso:'continuo'}),false,'contínuo suspenso não vira tratamento ativo');
assert.equal(isSupplyMedicationEligible({status:'ativo',tipo_uso:'continuo'}),true,'tratamento ativo preservado');
const timeSource=read('lib/health-intelligence/medication-list-attention-m143.ts');
const timeModule=new Module('medication-list-attention-m144',module);
timeModule.require=(id)=>{
 if(id==='@/lib/health-intelligence/medication-care-decision') return {medicationCareStageNeedsAttention:s=>s!=='stable'};
 throw new Error('Import inesperado no resolver temporal: '+id);
};
timeModule._compile(ts.transpileModule(timeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,timeModule.id);
const {medicationListAttentionReasonsM143,medicationNextPendingClockM143}=timeModule.exports;
const sampleMed={id:'m1',tipo_uso:'continuo',estoque_horarios:['08:00','23:00']};
const sampleItem={med:sampleMed,isSuspenso:false,isSOS:false,dosesPendentesHoje:1,dosesIgnoradasHoje:0};
const logged=[{medicamento_id:'m1',horario:'08:00',tomado_em:'2026-11-13T08:01:00'}];
assert.deepEqual(medicationListAttentionReasonsM143(sampleItem,'stable',undefined,logged,'15:00'),[],'dose futura nao e atraso');
assert.equal(medicationNextPendingClockM143(sampleMed,logged,'15:00'),'23:00','proximo horario futuro preservado');
assert.ok(medicationListAttentionReasonsM143({...sampleItem,med:{...sampleMed,estoque_horarios:['09:00']}},'stable',undefined,[],'15:00').includes('Dose do horário já vencido'),'dose anterior nao registrada continua em atencao');
assert.deepEqual(medicationListAttentionReasonsM143({...sampleItem,isSOS:true},'stable',undefined,[],'15:00'),[],'SOS nao gera atraso obrigatorio');

const content=read('app/saude/medicamentos/editar/page.tsx');
assert.match(content,/M144_STUDIO_EDITOR_READONLY/,'previa integrada ao editor canônico');
assert.match(content,/<PillStudioV8 medication=/,'Studio reaproveitado, sem duplicar tecnologia');
assert.match(content,/statusAtivo \? "Em uso" : "Suspenso"/,'status separado do tipo de uso');
assert.match(read('app/saude/medicamentos/page.tsx'),/medicationListAttentionReasonsM143/,'lista mantem criterio temporal e operacional');
assert.match(read('lib/health-intelligence/medication-list-attention-m143.ts'),/medicationNextPendingClockM143/,'horario futuro nao e atraso');
assert.match(read('app/saude/fornecimento/page.tsx'),/prioritizedSupplyDocuments/,'ciclo manteve reconciliacao documental');
assert.ok(fs.existsSync('app/saude/visual-studio/page.tsx'),'V8 pagina publicada integrada');
for(const p of ['app/saude/medicamentos/editar/page.tsx','app/saude/medicamentos/page.tsx','scripts/test-v63-release-gate.mjs']){
 const code=read(p),syntax=ts.createSourceFile(p,code,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.JS);
 assert.equal(syntax.parseDiagnostics.length,0,'sintaxe preservada: '+p);
}
console.log('VAULT M144 — P1 P2 P3 + Brain V7 + SS7 + V8 + Studio no editor: OK');
