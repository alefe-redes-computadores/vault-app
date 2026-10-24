#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function resolve(file){for(const candidate of [file,file+'.ts',file+'/index.ts'])if(fs.existsSync(candidate))return candidate;return file;}
function load(rel){const file=resolve(path.isAbsolute(rel)?rel:path.join(root,rel));if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {buildCareForecast,daysSinceLastCompletedConsultation}=load('lib/health-intelligence/care-forecast');
const base={userId:'u',personId:'p',hoje:'2026-10-24',medicamentos:[
 {id:'m1',user_id:'u',person_id:'p',nome:'Contínuo',status:'ativo',tipo_uso:'continuo',estoque_quantidade:5,estoque_tipo:'comprimido',dose_quantidade:1,frequencia_tipo:'diario',estoque_horarios:['08:00']},
 {id:'m2',user_id:'u',person_id:'p',nome:'Sem estoque',status:'ativo',tipo_uso:'continuo'},
 {id:'sos',user_id:'u',person_id:'p',nome:'SOS',status:'ativo',tipo_uso:'sos',estoque_quantidade:0}
],renovacoes:[
 {id:'paid',user_id:'u',person_id:'p',medicamento_id:'m1',data:'2026-09-01',data_aquisicao:'2026-09-01',tipo_aquisicao:'compra',preco:40},
 {id:'future',user_id:'u',person_id:'p',medicamento_id:'m2',data:'2026-11-01',data_aquisicao:'2026-11-01',tipo_aquisicao:'compra',preco:25},
 {id:'rx',user_id:'u',person_id:'p',medicamento_id:'m1',data:'2026-10-20',document_id:'doc'}
],retiradas:[
 {id:'w1',user_id:'u',person_id:'p',medicamento_id:'m1',renovacao_origem_id:'rx',data:'2026-10-23',tipo:'sus',status:'agendada',exige_nova_receita:true},
 {id:'w2',user_id:'u',person_id:'p',medicamento_id:'m2',data:'2026-11-02',tipo:'sus',status:'agendada',exige_nova_receita:true}
],consultas:[{id:'c',user_id:'u',person_id:'p',data:'2026-10-20',status:'realizada'}]};
const result=buildCareForecast(base,'2026-10-24');
assert.deepEqual(result.windows.map(x=>x.days),[30,60,90]);
assert.equal(result.windows[0].unknownStock,1);assert.equal(result.windows[0].plannedAcquisitions,1);assert.equal(result.windows[0].plannedKnownCost,25);
assert.equal(result.withdrawals[0].overdue,true);assert.equal(result.withdrawals[0].prescriptionLinked,true);assert.equal(result.withdrawals[1].missing.includes('Receita ou documento vinculado'),true);
assert.equal(daysSinceLastCompletedConsultation(base,'2026-10-24'),5);
const page=read('app/saude/registros/relatorio/page.tsx'),avatar=read('components/saude/AvatarHealthContext.tsx'),map=read('lib/health-profile/avatar-attention-map.ts');
assert(page.includes('Desde consulta'));assert(page.includes('Projeção de reposição e custo'));assert(page.includes('Prontidão para retiradas'));assert(page.includes('Ausência de registro não é interpretada como zero'));
assert(avatar.includes('Contexto por região'));assert(map.includes('no clinical inference')||map.includes('no clinical'));
console.log('VAULT V251 — RELATÓRIO + PREVISÃO + AVATAR CONTEXTUAL: OK');
