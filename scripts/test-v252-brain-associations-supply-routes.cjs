#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function resolve(file){for(const candidate of [file,file+'.ts',file+'/index.ts'])if(fs.existsSync(candidate))return candidate;return file;}
function load(rel){const file=resolve(path.isAbsolute(rel)?rel:path.join(root,rel));if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const {buildCautiousAssociations}=load('lib/health-intelligence/cautious-associations');
const {buildPlannedRealizedSummary}=load('lib/health-intelligence/planned-realized');
const {medicationSupplyRoute}=load('lib/health-supply/route-authority');
const records=[];for(let day=1;day<=7;day++){const data=`2026-10-${String(17+day).padStart(2,'0')}`;records.push({id:`s${day}`,user_id:'u',person_id:'p',categoria:'medicao',tipo:'sono',nome:'Sono',duracao_minutos:300+day*20,data,horario:'08:00'},{id:`h${day}`,user_id:'u',person_id:'p',categoria:'humor',tipo:'humor',nome:'Humor',intensidade:3+day,data,horario:'09:00'});}
const associations=buildCautiousAssociations({records,userId:'u',personId:'p',today:'2026-10-24',days:30});assert(associations.some(x=>x.id==='sono:humor'&&x.pairedDays===7));
assert.equal(buildCautiousAssociations({records:records.slice(0,8),userId:'u',personId:'p',today:'2026-10-24',days:30}).length,0,'menos de cinco dias não sustenta associação');
const doseLogs=[{id:'a',user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-10-20',horario:'08:00',dose_kind:'scheduled',tomado_em:'2026-10-20T08:01:00-03:00'},{id:'b',user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-10-21',horario:'08:00',dose_kind:'scheduled',ignorado_em:'2026-10-21T08:01:00-03:00'},{id:'c',user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-10-22',horario:'08:00',dose_kind:'planned'}];
const plan=buildPlannedRealizedSummary({userId:'u',personId:'p',hoje:'2026-10-24',doseLogs},30);assert.deepEqual([plan.planned,plan.taken,plan.ignored,plan.unresolvedPast,plan.documentedOutcomeRate],[3,1,1,1,50]);
// Guardian A10: preserve the original positive assertions and reject ambiguous realization evidence.
const summarize=logs=>buildPlannedRealizedSummary({userId:'u',personId:'p',hoje:'2026-10-24',doseLogs:logs},30);
const ambiguous=doseLogs.map(row=>({...row,...(row.tomado_em?{tomado_em:row.tomado_em.slice(0,-6)}:{}),...(row.ignorado_em?{ignorado_em:row.ignorado_em.slice(0,-6)}:{})}));
const original=JSON.stringify(ambiguous),unconfirmed=summarize(ambiguous);
assert.deepEqual([unconfirmed.planned,unconfirmed.taken,unconfirmed.ignored,unconfirmed.unresolvedPast,unconfirmed.conflicts,unconfirmed.documentedOutcomeRate],[3,0,0,1,2,null],'timestamp sem fuso não comprova realização nem entra na taxa');
assert.equal(JSON.stringify(ambiguous),original,'projeção não altera fatos originais');
for(const origin of ['scheduled','planned']){
 const [taken,ignored,pending]=doseLogs.map(row=>({...row,dose_kind:origin}));
 const valid=summarize([taken,ignored,pending]);
 assert.deepEqual([valid.planned,valid.taken,valid.ignored,valid.unresolvedPast,valid.conflicts,valid.documentedOutcomeRate],[3,1,1,1,0,50],origin+' independe do estado de realização');
 const mixed=summarize([{...taken,ignorado_em:taken.tomado_em},{...ignored,ignorado_em:'2026-02-30T08:01:00Z'},pending]);
 assert.deepEqual([mixed.planned,mixed.taken,mixed.ignored,mixed.unresolvedPast,mixed.conflicts,mixed.documentedOutcomeRate],[3,0,0,1,2,null],origin+' dupla marcação e data impossível não comprovam realização');
}
console.log('MACRO02_V252_EXPLICIT_TIME_GATE_OK');
const data={processos:[{id:'sus',user_id:'u',person_id:'p',status:'ativo',origem:'municipal'}],itens:[{id:'i',user_id:'u',person_id:'p',processo_id:'sus',ciclo_id:'c',medicamento_id:'m'}],ciclos:[],documentos:[]};
const route=medicationSupplyRoute('m',data,[{id:'buy',user_id:'u',person_id:'p',medicamento_id:'m',tipo_aquisicao:'comprado'}],'p','u');assert.equal(route.mode,'hybrid');assert.deepEqual(route.labels,['SUS municipal','Comprado']);
const supply=read('app/saude/fornecimento/page.tsx'),prep=read('components/saude/SupplyPreparation.tsx'),insights=read('lib/health-intelligence/supply-insights.ts'),report=read('app/saude/registros/relatorio/page.tsx');
assert(supply.includes("SUS municipal + comprado")||supply.includes('processRouteLabel'));assert(supply.includes("process.origem==='comprado'?'Aquisições':'Retiradas'"));assert(prep.includes('Ele não exige retirada SUS'));assert(insights.includes('if (p.origem === "comprado") continue'));
assert(report.includes('Planejado × realizado'));assert(report.includes('Associações temporais cautelosas'));assert(report.includes('ReportShareComposer'));
console.log('VAULT V252 — BRAIN CAUTELOSO + ROTAS DE FORNECIMENTO: OK');
