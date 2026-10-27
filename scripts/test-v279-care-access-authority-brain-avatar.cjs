#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function resolve(file){for(const candidate of [file,file+'.ts',file+'/index.ts'])if(fs.existsSync(candidate))return candidate;return file;}
function load(rel){const file=resolve(path.isAbsolute(rel)?rel:path.join(root,rel));if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const ok=(value,label)=>{assert.ok(value,label);console.log('OK:',label)};
const {buildCareDocumentReadiness}=load('lib/health-intelligence/care-document-readiness');
const {buildCareForecast}=load('lib/health-intelligence/care-forecast');
const {buildBrainCarePlan}=load('lib/health-intelligence/care-plan');
const med=(id,name)=>({id,user_id:'u',person_id:'p',nome:name,dosagem:'10mg',medico:'',data_receita:'',proxima_renovacao:'',status:'ativo',tipo_receita:'azul',tipo_uso:'continuo'});
const base={userId:'u',personId:'p',hoje:'2026-10-27',medicamentos:[med('public','Público'),med('private','Comprado')],doseLogs:[],renovacoes:[{id:'buy',user_id:'u',person_id:'p',medicamento_id:'private',data:'2026-10-20',data_aquisicao:'2026-10-20',tipo_aquisicao:'comprado'}],tratamentos:[],registrosSaude:[],consultas:[],exames:[],cirurgias:[],cids:[],documentos:[],retiradas:[],fornecimento:{processos:[{id:'process',user_id:'u',person_id:'p',titulo:'SUS',origem:'municipal',status:'ativo'}],ciclos:[{id:'cycle',user_id:'u',person_id:'p',processo_id:'process',status:'preparando',created_at:'2026-10-20'}],itens:[{id:'item',user_id:'u',person_id:'p',processo_id:'process',ciclo_id:'cycle',medicamento_id:'public'}],documentos:[]}};
const portfolio=buildCareDocumentReadiness(base);
const publicItem=portfolio.items.find(item=>item.medicationId==='public'),privateItem=portfolio.items.find(item=>item.medicationId==='private');
assert.equal(publicItem.requirements.find(item=>item.lane==='sus_process').status,'missing');
assert.equal(privateItem.requirements.find(item=>item.lane==='sus_process').status,'not_required');
assert.equal(privateItem.requirements.find(item=>item.lane==='purchase_receipt').status,'not_informed');
assert.equal(portfolio.laneCounts.sus_process.missing,1);assert.equal(portfolio.attentionItems,1);
ok(publicItem.href.includes('/saude/fornecimento?id=process'),'falta SUS navega para o processo correto');
ok(true,'SUS, receita e compra permanecem autoridades separadas');
const emptyForecast={generatedFor:'2026-10-27',windows:[{days:30,stockRisk:0,unknownStock:0,plannedAcquisitions:0,plannedKnownCost:0,expectedRefillCost:0,expectedRefillCostCoverage:100}],withdrawals:[],actions:[]};
const emptyReadiness={items:[],counts:{ready:0,prepare:0,overdue:0,unknown:0},generatedFor:'2026-10-27'};
const plan=buildBrainCarePlan(base,emptyForecast,emptyReadiness,portfolio);
assert.ok(plan.items.some(item=>item.title.includes('preparar documento SUS')&&item.href.includes('process')));
ok(true,'Brain transforma somente falta explícita do processo em etapa');
const withdrawalContext={...base,fornecimento:{processos:[],ciclos:[],itens:[],documentos:[]},retiradas:[{id:'w',user_id:'u',person_id:'p',medicamento_id:'public',data:'2026-10-30',tipo:'sus',status:'agendada',exige_nova_receita:true}]};
const forecast=buildCareForecast(withdrawalContext);
assert.ok(forecast.actions.some(item=>item.title.includes('preparar receita regulatória')&&item.reason.includes('Documento SUS')&&item.reason.includes('comprovante de compra')));
ok(true,'retirada com receita explícita produz ação regulatória específica');
const ui=fs.readFileSync(path.join(root,'components/saude/CareAccessBrief.tsx'),'utf8'),avatar=fs.readFileSync(path.join(root,'components/saude/AvatarCareWorkspace.tsx'),'utf8'),central=fs.readFileSync(path.join(root,'app/inteligencia/page.tsx'),'utf8');
ok(ui.includes('comprovante opcional')&&ui.includes('falta explícita'),'resumo não transforma comprovante opcional em pendência');
ok(avatar.includes('<CareAccessBrief')&&central.includes('<CareAccessBrief'),'Central e Avatar compartilham prontidão documental');
console.log('\nVAULT V279 — ACESSO AO CUIDADO + BRAIN + AVATAR: OK');
