#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const details=read('app/saude/medicamentos/detalhes/page.tsx');
const disclosure=read('components/saude/ClinicalDisclosure.tsx');
const doc=read('lib/health-intelligence/care-document-readiness.ts');
const plan=read('lib/health-intelligence/care-plan.ts');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const [name,code,tsx] of [
 ['details',details,true],['disclosure',disclosure,true],['documents',doc,false],['plan',plan,false]]){
 const parsed=ts.createSourceFile(name+(tsx?'.tsx':'.ts'),code,ts.ScriptTarget.Latest,true,tsx?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,`${name} parses correctly`);
}
assert(details.indexOf('const journeySnapshot = useMemo(')<details.indexOf('  if (\n    med ===\n    undefined'),'V299 React hook-order fix preserved');
const main=details.indexOf('<ClinicalSectionNav label="Áreas do medicamento"');
const identity=details.indexOf('<section className="relative overflow-hidden rounded-[20px] border border-surface-border/70 bg-surface shadow-lg">',main);
const action=details.indexOf('{(careDecision.stage !== "stable" || brainCareAction) && (',main);
const journal=details.indexOf('<ClinicalDisclosure id="medicamento-jornada"',main);
const supply=details.indexOf('<ClinicalDisclosure id="medicamento-fornecimento"',main);
assert(main>=0 && identity>main && action>identity && journal>action && supply>journal,
  'Medication identity and next action precede progressive history and supply');
assert.equal(details.split('<MedicationJourneySummary snapshot={journeySnapshot}').length-1,1,'no duplicate journey');
assert.equal(details.split('<HealthSupplyEntry medicamentoId={med.id!}/>').length-1,1,'canonical supply surface preserved');
assert(details.includes('id="medicamento-lembretes"'),'notifications are an accessible on-demand section');
assert(disclosure.includes('window.addEventListener("hashchange", revealHash)') && disclosure.includes('if (hash === id) setOpen(true)'), 'deep-links open deferred section');
assert(disclosure.includes('{open && ('),'heavy content mounts only when opened');
assert(disclosure.includes('aria-expanded={open}') && disclosure.includes('aria-controls='),'disclosure has accessible controls');
assert(gate.includes('scripts/test-v299-medication-details-list.cjs')&&gate.includes('scripts/test-v300-medication-hierarchy-owner.cjs'),'release gate includes V299+V300');
assert(doc.includes('publicProcessIds.has(row.processo_id)'),'SUS readiness only considers active owned process');
assert(doc.includes('row.user_id === med.user_id'),'process and links owner isolated');
assert(plan.includes('conferir vínculo do processo SUS'),'mixed history is not mistaken for public obligation');

// Semantic regression: execute the REAL TypeScript module with import graph.
const root=process.cwd(), cache=new Map();
function load(rel){
 let file=path.isAbsolute(rel)?rel:path.join(root,rel);
 if(!fs.existsSync(file)&&fs.existsSync(file+'.ts'))file+='.ts';
 if(!fs.existsSync(file)&&fs.existsSync(path.join(file,'index.ts')))file=path.join(file,'index.ts');
 if(cache.has(file))return cache.get(file).exports;
 const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);
 mod.require=id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
 return mod.exports;
}
const {buildCareDocumentReadiness}=load('lib/health-intelligence/care-document-readiness');
const {buildBrainCarePlan}=load('lib/health-intelligence/care-plan');
const person='p',user='u';
const med=(id)=>({id,user_id:user,person_id:person,nome:id,status:'ativo',tipo_uso:'continuo',tipo_receita:'comum'});
const row=(id,extra={})=>({id,user_id:user,person_id:person,created_at:'2026-10-20',updated_at:'2026-10-20',...extra});
const context={userId:user,personId:person,hoje:'2026-10-28',medicamentos:[med('public'),med('mixed'),med('archived'),med('foreign')],
 doseLogs:[],renovacoes:[row('privatebuy',{medicamento_id:'mixed',tipo_aquisicao:'comprado',data:'2026-10-15'})],
 tratamentos:[],registrosSaude:[],consultas:[],exames:[],cirurgias:[],cids:[],documentos:[row('foreignDoc',{user_id:'other',person_id:'other',type:'lme'})],retiradas:[],
 fornecimento:{processos:[
 row('pub',{origem:'municipal',status:'ativo'}),row('hybrid',{origem:'municipal',status:'ativo'}),row('past',{origem:'municipal',status:'encerrado'}),row('other',{user_id:'other',person_id:'other',origem:'municipal',status:'ativo'})],
 ciclos:[row('pubcycle',{processo_id:'pub',status:'preparando'}),row('hybcycle',{processo_id:'hybrid',status:'preparando'})],
 itens:[row('a',{processo_id:'pub',ciclo_id:'pubcycle',medicamento_id:'public'}),row('b',{processo_id:'hybrid',ciclo_id:'hybcycle',medicamento_id:'mixed'}),row('c',{processo_id:'past',ciclo_id:'pastcycle',medicamento_id:'archived'}),row('d',{user_id:'other',person_id:'other',processo_id:'other',ciclo_id:'othercycle',medicamento_id:'foreign'})],
 documentos:[row('foreign-link',{user_id:'other',person_id:'other',processo_id:'pub',ciclo_id:'pubcycle',document_id:'foreignDoc',tipo:'lme'})]}};
const readiness=buildCareDocumentReadiness(context);
const get=(id,lane='sus_process')=>readiness.items.find(x=>x.medicationId===id).requirements.find(x=>x.lane===lane).status;
assert.equal(get('public'),'missing','owned active SUS process missing doc');
assert.equal(get('mixed'),'missing','mixed purchase does not erase active public process');
assert.equal(get('archived'),'not_required','closed SUS process does not create current obligation');
assert.equal(get('foreign'),'not_required','cross-owner process cannot create current obligation');
assert.equal(readiness.attentionItems,2,'accurate scoped attention count');
const stubForecast={generatedFor:'2026-10-28',windows:[{days:30,plannedKnownCost:0,expectedRefillCost:0,expectedRefillCostCoverage:100}],withdrawals:[],actions:[]};
const stubReadiness={items:[],counts:{ready:0,prepare:0,overdue:0,unknown:0},generatedFor:'2026-10-28'};
const brain=buildBrainCarePlan(context,stubForecast,stubReadiness,readiness);
assert(brain.items.some(x=>x.medicationId==='public'&&x.title.includes('preparar documento SUS')),'public-only process retains real missing-document warning');
assert(brain.items.some(x=>x.medicationId==='mixed'&&x.title.includes('conferir vínculo do processo SUS')),'mixed history asks for verification not a categorical obligation');
assert(!brain.items.some(x=>['archived','foreign'].includes(x.medicationId||'')&&x.id.startsWith('documents:')),'inactive or foreign processes stay out of Brain warnings');
console.log('V300 OK: React hook-order, progressive clinical details, owner isolation and real mixed/public SUS decision.');
