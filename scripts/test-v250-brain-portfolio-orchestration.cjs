#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const portfolio=load('lib/health-intelligence/brain-portfolio.ts');
const brain=load('lib/health-intelligence/brain-v5.ts');
const snapshot=(title,entity)=>({kind:'observation',categoria:'rotina',titulo:title,mensagem:'Contexto registrado',urgencia:'media',confianca:'alta',amostra:8,evidencias:['8 registros'],fontes_internas:['Histórico'],fontes_externas:[],gravidade_seguranca:'atencao',entidade_tipo:'medicamento',entidade_id:entity});
const alert=(key,domain,lane,extra={})=>({key,person_id:'p',insight_id:key,family:'medication',state:'active',first_detected_at:'2026-10-20T10:00:00.000Z',last_detected_at:'2026-10-24T10:00:00.000Z',occurrences:1,episode:1,severity_rank:400,material_fingerprint:key,schema_version:1,domain,lane,actionability:'direct',evidence_quality:'strong',priority_factors:{severity:180,urgency:110,evidence:100,actionability:80,dataQualityPenalty:0,total:470},snapshot:snapshot(key,key),...extra});
const rows=[alert('med-1','medication','now'),alert('med-2','medication','next',{severity_rank:390}),alert('care-1','care','next',{episode:2,last_seen_at:'2026-10-23T10:00:00.000Z'}),alert('data-1','data','review_data',{evidence_quality:'limited',priority_factors:{severity:60,urgency:0,evidence:20,actionability:45,dataQualityPenalty:170,total:-45}}),alert('sleep-1','wellbeing','follow_up',{snoozed_until:'2099-01-01T00:00:00.000Z'})];
const result=portfolio.buildBrainPortfolio(rows,3);
assert.equal(result.visibleJourneys,4);assert.equal(result.scheduled,1);assert.equal(result.focus.length,3);
assert.deepEqual(result.focus.map(x=>x.journey.primary.domain),['medication','care','data']);
assert.equal(result.recurring,1);assert.equal(result.newCount,3);assert.equal(result.evidence.strong,3);assert.equal(result.evidence.limited,1);assert.equal(result.confidenceScore,81);
assert.equal(portfolio.brainV5Momentum(rows[2]),'recurrent');
const tied=brain.brainV5Journeys([alert('b','medication','next'),alert('a','medication','next')]);
assert.deepEqual(tied.map(x=>x.key),['medicamento:a','medicamento:b']);
const central=read('app/inteligencia/alertas/page.tsx');
assert(central.includes('Plano de foco'));assert(central.includes('brain.portfolio.focus.map'));assert(central.includes('Evidência {brain.portfolio.confidenceScore}/100'));
const detail=read('components/vault-intelligence/BrainV5DetailSheet.tsx'),notifications=read('components/InsightNotificationReconciler.tsx');
assert(detail.includes('Como a prioridade foi calculada'));assert(detail.includes('Penalidade por dados limitados'));
assert(notifications.includes('journeyPrimaryIds'));assert(notifications.includes('brainV5Journeys(ledger)'));
console.log('VAULT V250 — BRAIN PORTFOLIO + ORQUESTRAÇÃO: OK');
