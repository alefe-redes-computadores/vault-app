const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('lib/health-intelligence/medication-safety.ts','utf8');
const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleObject={exports:{}};
new Function('module','exports','require',output)(moduleObject,moduleObject.exports,(id)=> {
  if(id.includes('dose-quantity-safety')) return {assessDoseQuantitySafety:()=>({level:'normal'})};
  if(id.includes('medication-longitudinal-risk')) return {buildMedicationLongitudinalRiskInsights:()=>[]};
  // M112: this M104 harness tests quantity handling; V5.2 has an independent behavior suite.
  if(id.includes('brain-v52-context')) return {buildBrainV52ContextInsights:()=>[]};
  throw new Error('Import inesperado: '+id);
});
const {buildMedicationSafetyInsights}=moduleObject.exports;
const med={id:'m',nome:'Teste',person_id:'p',status:'ativo',tipo_uso:'continuo',estoque_unidade_medida:'comprimidos',estoque_unidade_por_dose:1};
const mk=(i,quantidade)=>({id:'d'+i,person_id:'p',medicamento_id:'m',data:'2026-11-09',tomado_em:`2026-11-09T${String(12+i).padStart(2,'0')}:00:00`,dose_kind:'extra',quantidade});
function insight(logs){return buildMedicationSafetyInsights({hoje:'2026-11-09',personId:'p',medicamentos:[med],doseLogs:logs,tratamentos:[],renovacoes:[],registrosSaude:[]}).find(x=>x.id==='seguranca-uso-extra-m');}
const unknown=insight([mk(0,2),mk(1,undefined),mk(2,2),mk(3,2)]);
assert(unknown);assert.match(unknown.mensagem,/quantidade total não informada/);assert(!unknown.evidencias.some(s=>s.includes('7 comprimidos')));
const known=insight([mk(0,2),mk(1,2),mk(2,2),mk(3,2)]);
assert(known);assert.match(known.mensagem,/8 comprimidos/);
const none=insight([mk(0,undefined),mk(1,undefined),mk(2,undefined),mk(3,undefined)]);
assert(none);assert.match(none.mensagem,/quantidade total não informada/);
console.log('M104: quantidades não informadas não são inventadas; totais conhecidos preservados.');
