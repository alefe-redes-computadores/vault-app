#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);m.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):id.startsWith('./')?load(path.join(path.dirname(rel),id)+(path.extname(id)?'':'.ts')):require(id);m._compile(ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {buildMedicationPortfolio}=load('lib/health-intelligence/medication-portfolio.ts');
const note='Tratamento temporário · 2026-10-29 · 3 dia(s)';
const context={personId:'p',userId:'u',hoje:'2026-10-29',medicamentos:[
  {id:'c',person_id:'p',user_id:'u',nome:'Contínuo',tipo_uso:'continuo',status:'ativo'},
  {id:'t',person_id:'p',user_id:'u',nome:'Temporário',tipo_uso:'temporario',status:'ativo'},
  {id:'s',person_id:'p',user_id:'u',nome:'SOS',tipo_uso:'sos',status:'ativo'},
  {id:'x',person_id:'other',user_id:'u',nome:'Outra pessoa',tipo_uso:'continuo',status:'ativo'}],
  doseLogs:[{id:'d',person_id:'p',user_id:'u',medicamento_id:'t',data:'2026-10-30',horario:'08:00',dose_kind:'planned',motivo:note}],
};
const plan={items:[{medicationId:'c',lane:'now'},{medicationId:'c',lane:'prepare'},{medicationId:'t',lane:'discuss'}]};
const readiness={items:[{route:{mode:'public'}},{route:{mode:'private'}},{route:{mode:'hybrid'}},{route:{mode:'none'}}]};
const result=buildMedicationPortfolio(context,plan,readiness);
assert.equal(result.active,3);assert.equal(result.continuous,1);assert.equal(result.temporary,1);assert.equal(result.asNeeded,1);
assert.equal(result.needsAction,1);assert.equal(result.planned,1);assert.equal(result.temporaryCoursesOpen,1);assert.equal(result.temporaryDosesOpen,1);
assert.deepEqual(result.routes,{public:1,private:1,hybrid:1,unknown:1});assert.equal(result.nextTemporaryCourse.medicationId,'t');
const command=read('lib/health-intelligence/care-command.ts'),list=read('app/saude/medicamentos/page.tsx'),avatar=read('components/saude/MedicationContinuityAvatarSummary.tsx'),workspace=read('components/saude/AvatarCareWorkspace.tsx'),supply=read('app/saude/fornecimento/page.tsx'),authority=read('components/saude/MedicationAuthorityMap.tsx');
assert(command.includes('buildMedicationPortfolio(context, plan, readiness)'));
assert(list.includes('<MedicationPortfolioOverview')&&list.includes('["temporarios", "Por período"]'));
assert(avatar.includes('command?.medications')&&avatar.includes('nextTemporaryCourse'));
assert(!workspace.includes('<TemporaryCourseAvatarSummary'));
assert(supply.includes('<MedicationAuthorityMap')&&supply.includes('careCommand?.medications'));
assert(authority.includes('Receita não é aquisição')&&authority.includes('Planejado não entra no estoque')&&authority.includes('Realização exige confirmação'));
console.log('V324: portfólio único de medicamentos, hierarquia compacta, tipos, rotas, Brain e Avatar integrados OK');
