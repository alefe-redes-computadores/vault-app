const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file){const filename=path.resolve(file);if(filename.endsWith('.json.ts'))return {default:JSON.parse(fs.readFileSync(filename.slice(0,-3),'utf8')),__esModule:true};const mod=new Module(filename,module);mod.paths=Module._nodeModulePaths(path.dirname(filename));mod.require=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return mod.exports;}
const {treatmentSupplyMedicationIds:ids,cycleDocumentContext:context}=load('lib/health-supply/cycle-context.ts');
const t={id:'t',person_id:'p',user_id:'u',medicamento_ids:['m'],status:'ativo'};
const medications=[{id:'m',person_id:'p',user_id:'u',status:'ativo'},{id:'n',person_id:'p',user_id:'u',status:'ativo',tratamento_ids:['t']},{id:'other',person_id:'q',user_id:'u',tratamento_ids:['t']},{id:'foreign',person_id:'p',user_id:'x',tratamento_ids:['t']}];
assert.deepEqual(ids(t,medications,'p','u'),['m','n']);assert.deepEqual(ids({...t,user_id:'x'},medications,'p','u'),[]);
const process={id:'process',person_id:'p',user_id:'u',antecedencia_dias:30};const cycle={id:'c',processo_id:'process',person_id:'p',user_id:'u',status:'preparando',inicio:null,fim:null};const doc={id:'doc',person_id:'p',user_id:'u',category_id:'saude'};const link={id:'link',processo_id:'process',ciclo_id:'c',person_id:'p',user_id:'u',document_id:'doc',tipo:'lme',estado:'entregue'};
const data={documentos:[link]};let state=context(process,cycle,data,[doc]);assert.equal(state.lmeDelivered,1);assert.equal(state.confirmed,false);assert.equal(state.prepareRenewalFrom,null);
state=context(process,{...cycle,status:'autorizado',inicio:'2026-10-01',fim:'2027-03-31'},data,[doc]);assert.equal(state.prepareRenewalFrom,'2027-03-01');assert.equal(state.confirmed,true);
assert.equal(context(process,cycle,data,[{...doc,user_id:'other'}]).lmeDelivered,0);
console.log('V140: existing treatment ownership, bidirectional medication IDs, delivered LME != authorization, confirmed renewal preparation and document isolation OK');

const {monthlySupplyReference:monthly,supplyDocumentLabel:documentLabel}=load('lib/health-supply/presentation.ts');
assert.equal(monthly(60,2),30);assert.equal(monthly(60,0),null);assert.equal(monthly(Infinity,2),null);
assert.notEqual(documentLabel({title:'Receita',type:'receita',metadata:{},attachments:[],created_at:'2026-10-01T12:00:00Z'}),documentLabel({title:'Receita',type:'receita',metadata:{},attachments:[],created_at:'2026-10-14T12:00:00Z'}));
const {supplyChecklist}=load('lib/health-supply/rules.ts');
const med={id:'m',person_id:'p',user_id:'u',dosagem:'25 mg'};
const configured={...process,origem:'municipal',receita_cada_retirada:false};const authorized={...cycle,status:'autorizado',inicio:'2026-10-01',fim:'2027-03-31'};
const sameDose={...data,itens:[{medicamento_id:'m',person_id:'p',user_id:'u',processo_id:'process',ciclo_id:'c',dosagem:'25 mg',quantidade_mensal:30}]};
assert.equal(supplyChecklist(configured,authorized,med,{id:'w',data:'2026-10-20',quantidade_prevista:60},sameDose,[doc],'2026-10-14').changed,false,'multi-month pickup cannot imply a dose change');
console.log('V140: 60 for two months stays independent from pickup schedule and false quantity mismatch is removed');

const {matchesSupplyTreatment:matches}=load('lib/health-supply/cycle-context.ts');
assert.equal(matches({...t,medicamento_ids:[]},medications,new Set(['n']),'p','u'),true);
assert.equal(matches({...t,user_id:'x'},medications,new Set(['n']),'p','u'),false);

assert.equal(context(process,{...cycle,person_id:'other',status:'autorizado',inicio:'2026-10-01',fim:'2027-03-31'},data,[doc]).confirmed,false);
