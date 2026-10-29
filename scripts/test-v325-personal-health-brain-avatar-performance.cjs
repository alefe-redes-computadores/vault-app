#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);m.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):require(id);m._compile(ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {buildPersonalHealthPortfolio}=load('lib/health-intelligence/personal-health-portfolio.ts');
const record=(id,data,tipo,rest={})=>({id,person_id:'p',user_id:'u',data,tipo,...rest});
const context={personId:'p',userId:'u',hoje:'2026-10-29',registrosSaude:[
  record('1','2026-10-29','sono',{source:'health_connect',source_record_id:'a'}),
  record('dup','2026-10-29','sono',{source:'health_connect',source_record_id:'a'}),
  record('2','2026-10-27','peso'),record('3','2026-10-24','frequencia_cardiaca',{device_id:'watch'}),
  record('4','2026-10-20','sono'),record('5','2026-10-10','peso'),record('future','2026-10-30','peso'),
  {...record('foreign','2026-10-29','peso'),person_id:'other'}]};
const result=buildPersonalHealthPortfolio(context);
assert.equal(result.records7d,3);assert.equal(result.records30d,5);assert.equal(result.activeDays30d,5);assert.equal(result.metricsObserved,3);assert.equal(result.deviceRecords30d,2);assert.equal(result.manualRecords30d,3);assert.equal(result.latestDate,'2026-10-29');assert.equal(result.coverage,'recent');
const command=read('lib/health-intelligence/care-command.ts'),health=read('app/saude/minha-saude/page.tsx'),avatar=read('components/saude/HealthAvatar.tsx'),overview=read('components/saude/PersonalHealthOverview.tsx'),readiness=read('components/saude/AvatarCareReadiness.tsx');
assert(command.includes('buildPersonalHealthPortfolio(context)')&&command.includes('health: PersonalHealthPortfolio'));
assert(health.includes('<PersonalHealthOverview')&&health.indexOf('<PersonalHealthOverview')<health.indexOf('<ClinicalSectionNav'));
assert(avatar.includes("const shouldMount3D=expanded&&mode==='3d'&&size==='expanded'")&&avatar.includes('shouldMount3D?<Avatar3DBoundary'));
assert(avatar.includes('ampliar{mode===\'3d\'?" em 3D":""}'));
assert(overview.includes('Cobertura descreve')===false&&overview.includes('Visão longitudinal')&&overview.includes('Brain · foco atual'));
assert(readiness.includes('healthSignal?.records7d'));
console.log('V325: portfólio longitudinal, hierarquia Minha Saúde, Brain compartilhado e WebGL sob demanda no Avatar OK');
