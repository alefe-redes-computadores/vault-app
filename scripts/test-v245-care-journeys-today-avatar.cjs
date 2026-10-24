#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const v5=load('lib/health-intelligence/brain-v5.ts');
const insight=(id,entity,urgencia='media')=>({id,kind:'alert',categoria:'estoque',titulo:id,mensagem:'ação comprovada',urgencia,confianca:'alta',amostra:3,gravidadeSeguranca:urgencia==='alta'?'importante':'informativa',evidencias:['estoque registrado'],fontesInternas:['medicamentos'],entidadeTipo:'medicamento',entidadeId:entity,link:'/saude/medicamentos'});
const rows=v5.reconcileBrainV5('person',[insight('estoque','med-1','alta'),insight('receita','med-1'),insight('outro','med-2')],[],'2026-10-24T10:00:00.000Z');
assert.equal(rows[0].snapshot.entidade_id,'med-1','ledger preserva entidade auditável');
const journeys=v5.brainV5Journeys(rows);
assert.equal(journeys.length,2,'sinais da mesma entidade viram uma jornada');
assert.equal(journeys.find(x=>x.key==='medicamento:med-1').total,2,'jornada preserva sinal principal e apoio');
assert.equal(journeys.find(x=>x.key==='medicamento:med-1').requires_attention,true,'atenção de qualquer sinal chega à jornada');
const brief=v5.brainV5DecisionBrief(rows);
assert.equal(brief.total,2,'brief conta decisões, não cartões duplicados');
assert.equal(brief.signals,3);assert.equal(brief.supporting,1);assert.match(brief.summary,/agrupado/);
const legacy={...rows[0],key:'legacy-a',snapshot:{...rows[0].snapshot,entidade_tipo:undefined,entidade_id:undefined,entidade_ids:undefined,relacoes_contextuais:undefined}};
assert.equal(v5.brainV5Journeys([legacy,{...legacy,key:'legacy-b'}]).length,2,'histórico legado não é unido por suposição');
const central=read('app/inteligencia/alertas/page.tsx');assert(central.includes('brainV5JourneyKey'));assert(central.includes('["Decisões",brain.brief.total]'));assert(central.includes('relacionado'));
const today=read('app/hoje/page.tsx');assert(today.includes('useBrainV5Pulse'));assert(today.includes('Briefing do cuidado'));assert(today.includes('brainPulse.brief.supporting'));
const home=read('app/page.tsx');assert(home.includes('decisões em atenção'));assert(home.includes('decisões acompanhadas'));
const avatar=read('components/saude/HealthAvatar3D.tsx');assert(avatar.includes('sign*.083-.003'));assert(avatar.includes('[.0016,.0016,.0011]'));
console.log('V245 CARE JOURNEYS + TODAY + AVATAR: OK');
