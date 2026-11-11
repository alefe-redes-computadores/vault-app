#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.isAbsolute(rel)?rel:path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+'.ts'):id.startsWith('.')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const portfolio=load('lib/health-intelligence/brain-portfolio.ts');
const snapshot=(title,entity,severity='atencao')=>({kind:'alert',categoria:'tratamento',titulo:title,mensagem:'Contexto',urgencia:severity==='importante'?'alta':'media',confianca:'alta',amostra:10,evidencias:['Evidência'],fontes_internas:['Histórico'],fontes_externas:[],gravidade_seguranca:severity,entidade_tipo:'medicamento',entidade_id:entity});
const alert=(key,domain,lane,severity,total)=>({key,person_id:'p',insight_id:key,family:'medication',state:'active',first_detected_at:'2026-11-01T10:00:00Z',last_detected_at:'2026-11-11T10:00:00Z',occurrences:1,episode:1,severity_rank:total,material_fingerprint:key,schema_version:1,domain,lane,actionability:'direct',evidence_quality:'strong',priority_factors:{severity:total,urgency:0,evidence:0,actionability:0,dataQualityPenalty:0,total},snapshot:snapshot(key,key,severity)});
const rows=[alert('critical-med','medication','now','importante',700),alert('important-med','medication','now','importante',650),alert('care','care','next','atencao',500),alert('data','data','review_data','atencao',450)];
const focus=portfolio.buildBrainPortfolio(rows,3).focus.map(item=>item.journey.primary.insight_id);
assert.deepEqual(focus,['critical-med','important-med','care'],'diversidade não pode expulsar sinais importantes da Home');
const risk=fs.readFileSync(path.join(root,'lib/health-intelligence/medication-longitudinal-risk.ts'),'utf8');
assert.match(risk,/motivo_descontinuacao/);assert.match(risk,/não atribui sintomas/);assert.match(risk,/Não retome, compense ou ajuste/);
const detail=fs.readFileSync(path.join(root,'components/vault-intelligence/BrainV5DetailSheet.tsx'),'utf8');
assert.match(detail,/related\.slice\(0,3\)/);assert.match(detail,/formatEvidence\(evidence\)/);assert.match(detail,/Ver mais \$\{related\.length-3\} sinais/);
console.log('VAULT M125 — CONTINUIDADE CONFIRMADA + TRIAGEM SEGURA: OK');
