#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const ok=(value,label)=>{if(!value)throw new Error(`V248: ${label}`);console.log('OK:',label)};
const financial=load('lib/vault-intelligence/financial.ts');
const base={user_id:'u',person_id:'p',medicamento_id:'m',medicamento_nome:'Medicamento',tipo_aquisicao:'comprado'};
const result=financial.buildVaultFinancialIntelligence([
 {...base,id:'past',data_aquisicao:'2026-10-10',preco:40},
 {...base,id:'future',data_aquisicao:'2026-11-05',preco:90},
 {...base,id:'sus',tipo_aquisicao:'sus',data_aquisicao:'2026-10-12',preco:999},
],'p','u',new Date('2026-10-24T12:00:00-03:00'));
assert.equal(result.paidAcquisitions,1);assert.equal(result.spend30d,40);assert.equal(result.spend90d,40);
assert.equal(result.plannedAcquisitions30d,1);assert.equal(result.plannedAmount30d,90);
ok(result.insights.some(x=>x.id==='financial-medication-planned-30d-v248'),'planejado futuro é insight separado do gasto realizado');
const reconciler=read('components/InsightNotificationReconciler.tsx');
ok(reconciler.includes('brainV5IsSnoozed')&&reconciler.includes('!snoozedIds.has(candidate.id)'),'push respeita jornada adiada');
ok(reconciler.includes('LocalNotifications.cancel')&&reconciler.includes('snoozedIds'),'push pendente do insight adiado é cancelado');
const central=read('app/inteligencia/alertas/page.tsx');
ok(central.includes('state==="snoozed"')&&central.includes('Programados'),'Central separa decisões programadas');
ok(central.includes('x.requires_attention&&!brainV5IsSnoozed(x.primary)'),'contagem de atenção exclui jornada adiada');
const page=read('app/inteligencia/page.tsx');
ok(page.includes('Custos de saúde documentados')&&page.includes('Realizado · 30d')&&page.includes('Planejado · 30d'),'painel financeiro diferencia realizado e planejado');
ok(read('app/saude/minha-saude/page.tsx').includes('brainPulse.counters.snoozed'),'Avatar preserva integração temporal V247');
console.log('\nVAULT V248 — BRAIN NOTIFICATIONS + FINANCIAL TRUTH: OK');
