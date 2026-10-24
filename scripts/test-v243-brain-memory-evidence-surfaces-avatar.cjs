#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const next=load('lib/health-intelligence/brain-next.ts'),v5=load('lib/health-intelligence/brain-v5.ts');
const base={id:'insight-a',kind:'medication',categoria:'medicamentos',titulo:'Revisar tratamento',mensagem:'Há uma ação organizada.',urgencia:'atencao',confianca:'alta',amostra:3,evidencias:[' Dose confirmada ','dose confirmada','','Outra evidência'],fontesInternas:[' Medicamentos ','medicamentos','']};
assert.deepEqual(next.brainMeaningfulEvidence(base),{evidence:['Dose confirmada','Outra evidência'],sources:['Medicamentos']});
assert.equal(next.brainEvidenceQuality(base),'strong');
const [active]=v5.reconcileBrainV5('person',[base],[],new Date('2026-10-23T10:00:00Z'));
assert.deepEqual(active.snapshot.evidencias,['Dose confirmada','Outra evidência']);
const deferred={...active,key:'deferred',insight_id:'deferred',state:'monitoring',feedback:'review_later',priority_factors:{...active.priority_factors,total:999}};
assert.equal(v5.rankBrainV5([deferred,active])[0].key,active.key,'memória humana prevalece dentro da mesma faixa de decisão');
assert.match(v5.brainV5PriorityReason(deferred),/adiado por você/);
const central=read('app/inteligencia/alertas/page.tsx'),home=read('app/page.tsx'),detail=read('components/vault-intelligence/BrainV5DetailSheet.tsx');
for(const source of [central,home,detail])assert(source.includes('brainV5PriorityReason'),'razão de prioridade visível');
assert(central.includes('text-emerald-300'),'acompanhamento usa semântica verde');
const medication=read('app/saude/medicamentos/detalhes/page.tsx');
assert(medication.includes('medicationCarePresentation(careDecision, alertaInteligente.urgencia)'));
assert(medication.includes('${carePresentation.actionClass}'));
const avatar=read('components/saude/HealthAvatar3D.tsx');
assert(avatar.includes('eyeHighlight: new THREE.MeshBasicMaterial'));
assert(avatar.includes('oval(materials.eyeHighlight'));
assert(!avatar.includes('oval(materials.eyeWhite,sign*.079,2.824,.232'));
console.log('V243 BRAIN MEMORY + EVIDENCE + CARE SURFACES + AVATAR: OK');
