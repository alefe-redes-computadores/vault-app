'use strict';
// Focused regression: use the actual reconciler function and the create call's
// option expression, with an isolated in-memory store (no account/network).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=process.argv[2]||process.cwd(),ts=require(require.resolve('typescript',{paths:[root,__dirname]}));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const reno='lib/repositories/renovacoes.ts',ret='lib/repositories/retiradas.ts';
const parse=(p,s)=>ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true);
function option(source){const f=parse(reno,source),calls=[];function visit(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='reconcileScheduledRetiradaFromRenovacao'&&n.arguments[0]?.getText(f)==='cleanRenovacao')calls.push(n);ts.forEachChild(n,visit);}visit(f);assert.equal(calls.length,1);const p=calls[0].arguments[2];assert(ts.isObjectLiteralExpression(p));return new Function('isPremium','premiumStock','return ('+p.getText(f)+')');}
const current=read(reno);const old=current.replace('{preserveAtomicMedication:isPremium}','{preserveAtomicMedication:premiumStock}');assert.notEqual(old,current,'missing Premium routing correction');
const select=option(current),previous=option(old);
const f=parse(ret,read(ret)),fn=f.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='reconcileScheduledRetiradaFromRenovacao');assert(fn);
const js=ts.transpileModule(fn.getText(f),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const uid='u',pid='p',date='2026-12-26',stamp='2026-11-27T13:00:00Z';
const prior={id:'prior-dose',table:'doseLogs',operation:'update',payload:{id:'dose',macro02_atomic:{operationId:'op'}}};
function fixture({target='',managed=false,existing=null}={}){const m={id:'m',user_id:uid,person_id:pid,nome:'QA',estoque_quantidade:7,estoque_ciclo_id:managed?'cycle':null,macro02_stock_managed:managed,data_retorno_sus:target||undefined,updated_at:stamp,synced:false};const r={id:'rx',user_id:uid,person_id:pid,medicamento_id:'m',tipo_aquisicao:'sus',quantidade:null,data_proxima_retirada:target||null};let med=structuredClone(m),row=existing&&structuredClone(existing);const queue=[structuredClone(prior)];let medPuts=0;const db={medicamentos:{put:async v=>{medPuts++;med=structuredClone(v)}},retiradas:{where:()=>({equals:()=>({first:async()=>row})}),put:async v=>{row=structuredClone(v)},delete:async()=>{row=null}}};const exp={};new Function('exports','db','enfileirarOperacao','now','date','loadSupplyWithdrawal','capturePlannedLocationA3','genId',js)(exp,db,async(table,operation,payload)=>queue.push({table,operation,payload:structuredClone(payload)}),()=>stamp,()=>{},async()=>({}),async()=>null,()=> 'withdrawal');return {m,r,run:opts=>exp.reconcileScheduledRetiradaFromRenovacao(r,m,opts),state:()=>({med,row,queue,medPuts})};}
(async()=>{
 let a=fixture();await a.run(previous(true,false));assert.equal(a.state().queue[1].table,'medicamentos');assert.equal(a.state().medPuts,1);console.log('REGRESSION_REPRODUCED_OLD_DUPLICATE_MEDICATION_QUEUE');
 for(const managed of [false,true]){let x=fixture({managed});await x.run(select(true,false));assert.deepEqual(x.state().queue,[prior]);assert.equal(x.state().medPuts,0);assert.deepEqual(x.state().med,x.m);assert.equal(x.state().med.estoque_quantidade,7);}
 console.log('PASS unquantified Premium preserves previous queue, stock and medication postimage');
 for(const stock of [false,true]){let x=fixture({target:date,managed:true});await x.run(select(true,stock));assert.equal(x.state().medPuts,0);assert.deepEqual(x.state().med,x.m);assert.deepEqual(x.state().queue[0],prior);assert.equal(x.state().queue.length,2);assert.equal(x.state().queue[1].table,'retiradas');assert.equal(x.state().row.data,date);assert.equal(x.state().row.renovacao_origem_id,'rx');}
 console.log('PASS Premium quantified/unquantified planned withdrawal remains queued once');
 let x=fixture();await x.run(select(false,false));assert.equal(x.state().medPuts,1);assert.equal(x.state().queue[1].table,'medicamentos');console.log('PASS legacy reconciliation behavior unchanged');
 x=fixture({target:date,managed:true});x.r.data_proxima_retirada='2026-12-27';await assert.rejects(x.run(select(true,false)),/Planejamento de retirada diverge/);assert.deepEqual(x.state().queue,[prior]);assert.equal(x.state().medPuts,0);console.log('PASS inconsistent plan still rejected');
 x=fixture({existing:{id:'other',user_id:'other',person_id:pid,status:'agendada'}});await assert.rejects(x.run(select(true,false)),/não pertence/);assert.deepEqual(x.state().queue,[prior]);console.log('PASS cross-account withdrawal still rejected');
 x=fixture({existing:{id:'old-plan',user_id:uid,person_id:pid,status:'agendada'}});await x.run(select(true,false));assert.equal(x.state().row,null);assert.equal(x.state().queue[1].table,'retiradas');assert.equal(x.state().queue[1].operation,'delete');assert.equal(x.state().medPuts,0);console.log('PASS removal preserves single companion queue');
 console.log('MACRO02_PREMIUM_ACQUISITION_QUEUE_REGRESSION_PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
