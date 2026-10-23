#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {decideMedicationCarePath}=load('lib/health-intelligence/medication-care-decision.ts');
const med={id:'m1',user_id:'u1',person_id:'p1',nome:'Zolpidem',dosagem:'10mg',medico:'',data_receita:'',proxima_renovacao:'',tipo_uso:'sos',estoque_quantidade:0};
const prescription={id:'rx',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-10-20',document_id:'doc1'};
const purchase={id:'buy',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-10-25',data_aquisicao:'2026-10-25',tipo_aquisicao:'comprado',quantidade:30,preco:40};
let decision=decideMedicationCarePath({medication:med,renewals:[prescription],today:'2026-10-23',needsPrescription:true,needsStock:true});
assert.equal(decision.stage,'acquisition_needed');
assert.equal(decision.actionLabel,'Registrar aquisição');
assert.equal(decision.prescriptionOnFile,true);
decision=decideMedicationCarePath({medication:med,renewals:[prescription,purchase],today:'2026-10-23',needsPrescription:true,needsStock:true});
assert.equal(decision.stage,'acquisition_planned');
assert.match(decision.explanation,/não conta como compra, gasto ou entrada no estoque/);
decision=decideMedicationCarePath({medication:med,renewals:[],today:'2026-10-23',needsPrescription:true,needsStock:false});
assert.equal(decision.stage,'prescription_needed');
const withdrawal={id:'w1',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-10-22',tipo:'sus',status:'agendada'};
decision=decideMedicationCarePath({medication:med,renewals:[prescription],withdrawal,today:'2026-10-23',needsPrescription:true,needsStock:true});
assert.equal(decision.stage,'withdrawal_overdue');
assert.match(decision.explanation,/Reagendar preserva o histórico/);
const source=fs.readFileSync(path.join(root,'lib/health-intelligence/medication-care-opportunities.ts'),'utf8');
for(const token of ['decideMedicationCarePath','careStageLabel','careDecision.actionHref'])assert(source.includes(token),token);
const home=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');
for(const token of ['careStageLabel','Futuro · não altera estoque'])assert(home.includes(token),token);
console.log('V237 MEDICATION CARE PATH: receita, aquisição, futuro, retirada e UI explicável OK');
