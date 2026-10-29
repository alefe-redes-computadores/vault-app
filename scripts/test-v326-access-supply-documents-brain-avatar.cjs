#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);m.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):require(id);m._compile(ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {buildAccessPortfolio}=load('lib/health-intelligence/access-portfolio.ts');
const owner={user_id:'u',person_id:'p'},stamp={created_at:'2026-10-01',updated_at:'2026-10-01'};
const context={userId:'u',personId:'p',hoje:'2026-10-29',fornecimento:{processos:[{id:'public',...owner,...stamp,status:'ativo'},{id:'old',...owner,...stamp,status:'encerrado'},{id:'foreign',user_id:'x',person_id:'p',...stamp,status:'ativo'}],ciclos:[{id:'c1',processo_id:'public',...owner,...stamp,status:'preparando'},{id:'c2',processo_id:'old',...owner,...stamp,status:'encerrado'}],itens:[],documentos:[]},renovacoes:[{id:'rx',user_id:'u',medicamento_id:'m',data:'2026-10-01'},{id:'buy',...owner,medicamento_id:'m',data:'2026-10-02',tipo_aquisicao:'comprado',quantidade:1},{id:'plan',...owner,medicamento_id:'m',data:'2026-11-02',data_aquisicao:'2026-11-02',tipo_aquisicao:'comprado',quantidade:1},{id:'other',user_id:'x',person_id:'p',medicamento_id:'m',data:'2026-10-03',tipo_aquisicao:'comprado',quantidade:1}],retiradas:[{id:'late',...owner,medicamento_id:'m',data:'2026-10-20',status:'agendada'},{id:'future',...owner,medicamento_id:'m',data:'2026-11-02',status:'agendada'},{id:'done',...owner,medicamento_id:'m',data:'2026-10-10',status:'realizada'},{id:'missed',...owner,medicamento_id:'m',data:'2026-10-11',status:'nao_realizada'}]};
const result=buildAccessPortfolio(context,{counts:{available:2,missing:1,not_required:1,not_informed:3}});
assert.deepEqual(result.processes,{active:1,archived:1});assert.equal(result.cycles.preparing,1);assert.equal(result.cycles.closed,1);assert.equal(result.prescriptions,1);assert.deepEqual(result.acquisitions,{realized:1,planned:1});assert.deepEqual(result.withdrawals,{scheduled:2,overdue:1,realized:1,unresolved:1});assert.equal(result.documents.explicitMissing,1);
const command=read('lib/health-intelligence/care-command.ts'),page=read('app/saude/fornecimento/page.tsx'),map=read('components/saude/MedicationAuthorityMap.tsx'),avatar=read('components/saude/AvatarCareReadiness.tsx'),overview=read('components/saude/AccessCommandOverview.tsx');
assert(command.includes('buildAccessPortfolio(context, documents)')&&command.includes('access: AccessPortfolio'));
assert(page.includes('<AccessCommandOverview')&&page.indexOf('<AccessCommandOverview')<page.indexOf('<ClinicalSectionNav'));
assert(map.includes('access.acquisitions.realized')&&map.includes('access.withdrawals.scheduled'));
assert(overview.includes('Somente exigência explícita')&&overview.includes('Brain · próxima decisão'));
assert(avatar.includes('accessSignal?.withdrawals.overdue')&&avatar.includes('accessSignal?.documents.explicitMissing'));
console.log('V326: acesso 360, autoridades reais, fornecimento, documentos, Brain e Avatar OK');
