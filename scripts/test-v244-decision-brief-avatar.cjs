#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const v5=load('lib/health-intelligence/brain-v5.ts');
const insight=(id,urgencia='media')=>({id,kind:'alert',categoria:'agenda',titulo:id,mensagem:'ação',urgencia,confianca:'alta',amostra:2,evidencias:['registro'],fontesInternas:['agenda'],link:'/hoje',acaoSegura:'Revisar'});
const rows=v5.reconcileBrainV5('p',[insight('a'),insight('b')],[],'2026-10-23T10:00:00.000Z');
rows[1]={...rows[1],state:'monitoring',feedback:'review_later'};
const brief=v5.brainV5DecisionBrief(rows);
assert.equal(brief.total,2);assert.equal(brief.deferred,1);assert.match(brief.headline,/próxima/);assert.match(brief.summary,/adiado/);
assert(read('hooks/useBrainV5Alerts.ts').includes('brief, counters'));
assert(/Briefing do cuidado|Plano de foco/.test(read('app/inteligencia/alertas/page.tsx')));
assert(read('app/page.tsx').includes('brainV5Pulse.brief.headline'));
const avatar=read('components/saude/HealthAvatar3D.tsx');assert(avatar.includes('expressionHighlights'));assert(avatar.includes('value==="reflective"?.82:1'));
console.log('V244 DECISION BRIEF + REACTIVE AVATAR: OK');
