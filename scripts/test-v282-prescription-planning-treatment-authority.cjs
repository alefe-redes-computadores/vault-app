#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function resolve(file){for(const candidate of [file,file+'.ts',file+'/index.ts'])if(fs.existsSync(candidate))return candidate;return file;}
function load(rel){const file=resolve(path.isAbsolute(rel)?rel:path.join(root,rel));if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const ok=(value,label)=>{assert.ok(value,label);console.log('OK:',label)};
const {buildPrescriptionPlanningPortfolio}=load('lib/health-intelligence/prescription-planning');
const medication=(id,name,date,status='ativo')=>({id,user_id:'u',person_id:'p',nome:name,status,lembrete_receita_modo:'data_personalizada',lembrete_receita_data:date});
const base={userId:'u',personId:'p',hoje:'2026-10-27',medicamentos:[medication('a','Pristiq','2026-10-30'),medication('b','Metadona','2026-10-26'),medication('c','Antigo','2026-10-28','descontinuado')],doseLogs:[],renovacoes:[],tratamentos:[],registrosSaude:[],consultas:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[]};
const portfolio=buildPrescriptionPlanningPortfolio(base);
assert.equal(portfolio.items.length,2);assert.equal(portfolio.upcoming,1);assert.equal(portfolio.due,1);assert.equal(portfolio.items[0].medicationName,'Metadona');
ok(true,'planejamento usa somente data explícita de medicamento ativo');
const {buildBrainCarePlan}=load('lib/health-intelligence/care-plan');
const forecast={generatedFor:'2026-10-27',windows:[{days:30,plannedKnownCost:0,expectedRefillCost:0,expectedRefillCostCoverage:100}],actions:[]};
const readiness={items:[],counts:{ready:0,prepare:0,overdue:0,unknown:0},generatedFor:'2026-10-27'};
const documents={items:[],counts:{available:0,missing:0,not_required:0,not_informed:0},laneCounts:{},attentionItems:0,note:''};
const plan=buildBrainCarePlan(base,forecast,readiness,documents);
assert.ok(plan.items.some(item=>item.id==='prescription-plan:b'&&item.lane==='now'&&item.evidenceKind==='projected'));
ok(true,'Brain recebe data planejada sem tratá-la como receita recebida');
const withOtherAction=buildBrainCarePlan(base,{...forecast,actions:[{id:'stock',kind:'stock_projection',lane:'next',medicationId:'a',medicationName:'Pristiq',date:'2026-10-29',title:'Revisar estoque',reason:'Projeção registrada',href:'/saude/medicamentos/detalhes?id=a',evidence:['estoque']}]},readiness,documents);
assert.ok(withOtherAction.items.find(item=>item.medicationId==='a')?.relatedCount>=2);
ok(true,'planejamento de receita permanece como evidência quando outra etapa lidera o medicamento');
const form=fs.readFileSync(path.join(root,'app/saude/renovacao/nova-receita/page.tsx'),'utf8');
ok(form.includes('role="alert"')&&form.includes('A próxima revisão da receita não pode ficar antes'),'formulário mostra validação acessível e preserva cronologia');
const treatment=fs.readFileSync(path.join(root,'components/saude/TreatmentCareLinks.tsx'),'utf8');
ok(treatment.includes('prescriptions=renewals.filter(isPrescriptionOnly)')&&treatment.includes('plannedAcquisitions=renewals.filter'),'tratamento separa receita, compra realizada e compra planejada');
const avatar=fs.readFileSync(path.join(root,'components/saude/AvatarCareWorkspace.tsx'),'utf8');
const central=fs.readFileSync(path.join(root,'app/inteligencia/page.tsx'),'utf8');
ok(avatar.includes('<PrescriptionPlanningBrief')&&central.includes('<PrescriptionPlanningBrief'),'Brain e Avatar compartilham planejamento de receita');
console.log('\nVAULT V282 — RECEITAS + TRATAMENTOS + BRAIN + AVATAR: OK');
