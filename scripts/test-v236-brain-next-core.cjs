#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const next=load('lib/health-intelligence/brain-next.ts');
const brain=load('lib/health-intelligence/brain-v5.ts');
const policy=load('lib/health-intelligence/notification-policy.ts');
const insight=(id,rest={})=>({id,kind:'alert',categoria:'tratamento',titulo:'Texto pode mudar',mensagem:'Sem palavras mágicas',urgencia:'alta',confianca:'alta',amostra:8,gravidadeSeguranca:'importante',evidencias:['registro confirmado'],fontesInternas:['DoseLogs'],acaoSegura:'Abra o contexto.',link:'/saude',...rest});
const now=insight('now');
const weak=insight('weak',{confianca:'baixa',evidencias:[],fontesInternas:[],coberturaDias:{observados:1,total:14}});
const nextDays=insight('next',{urgencia:'media',gravidadeSeguranca:'atencao'});
const follow=insight('follow',{kind:'pattern',urgencia:'baixa',gravidadeSeguranca:'informativa'});
assert.equal(next.brainDecisionLane(now),'now');
assert.equal(next.brainDecisionLane(weak),'review_data');
assert.equal(next.brainDecisionLane(nextDays),'next');
assert.equal(next.brainDecisionLane(follow),'follow_up');
assert.equal(next.brainDomain(insight('med',{categoria:'estoque'})),'medication');
assert.equal(policy.rankHealthInsightNotificationCandidates([weak,now]).map(x=>x.id).join(','),'now');
const records=brain.reconcileBrainV5('person',[weak,follow,nextDays,now],[],new Date('2026-10-23T12:00:00Z').toISOString());
assert(records.every(x=>x.schema_version===1&&x.lane&&x.domain&&x.priority_factors));
assert.deepEqual(brain.rankBrainV5(records).map(x=>x.insight_id),['now','next','follow','weak']);
const legacy={...records[0]};delete legacy.lane;delete legacy.schema_version;assert.equal(brain.brainV5Lane(legacy),'review_data');
const ui=fs.readFileSync(path.join(root,'app/inteligencia/alertas/page.tsx'),'utf8');
for(const token of ['Próximos dias','Acompanhar','Revisar dados','brainV5Lane'])assert(ui.includes(token),token);
const detail=fs.readFileSync(path.join(root,'components/vault-intelligence/BrainV5DetailSheet.tsx'),'utf8');
for(const token of ['Como o Brain priorizou','Evidência','Utilidade'])assert(detail.includes(token),token);
console.log('V236 BRAIN NEXT CORE: taxonomia, faixas decisórias, ranking explicável, compatibilidade e notificações OK');
