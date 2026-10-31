#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const content = rel => fs.readFileSync(path.join(root,rel),'utf8');
const now=new Date(); const TODAY=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const sample = (id, changes={}) => ({id,user_id:'owner',person_id:'person',medicamento_id:'med',data:TODAY,horario:'10:00',tomado_em:'2026-10-31T13:00:00Z',synced:true,...changes});
const store = {remote:[], requests:[], errors:[], hold:null, local:[], queue:[], writes:0};
const supabase = {from(table){assert.equal(table,'dose_logs'); const params={}; const chain={
  select(){return chain;},eq(k,v){params[k]=v;return chain;},gte(k,v){params[k+'_since']=v;return chain;},order(k,p){assert.equal(k,'id');assert(p.ascending);return chain;},
  async range(start,end){store.requests.push({start,end,...params});if(store.hold) await store.hold;
    if(store.errors.length) return {data:null,error:{message:store.errors.shift()}};
    return {data:store.remote.filter(r=>r.user_id===params.user_id && r.person_id===params.person_id && r.data>=params.data_since).slice(start,end+1),error:null};}
};return chain;}};
const query = rows => ({equals(user){assert.equal(user,'owner');return {filter(fn){return {toArray:async()=>rows.filter(r=>r.user_id===user).filter(fn)};}};},filter(fn){return {toArray:async()=>rows.filter(fn)};}});
const db={doseLogs:{where(key){assert.equal(key,'user_id');return query(store.local);},put(){store.writes++;throw Error('NO WRITE');}},syncQueue:{filter(fn){return {toArray:async()=>store.queue.filter(fn)};},put(){store.writes++;throw Error('NO WRITE');}}};
const file=path.join(root,'lib/sync/p13-device-audit.ts');
const compiled=ts.transpileModule(content('lib/sync/p13-device-audit.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod=new Module(file,module);mod.filename=file;
mod.require=id=>id==='@/lib/db'?{db}:id==='@/lib/supabase/client'?{supabase}:require(id);
mod._compile(compiled,file);
const {compareDeviceDoses,downloadDeviceDoses,inspectDeviceDoses}=mod.exports;
let count=0;
function check(name,fn){count++;return Promise.resolve().then(fn).then(()=>console.log(`✓ P13 ${count}: ${name}`));}
(async()=>{
  await check('conta vazia bloqueada antes de consulta',async()=>{store.requests.length=0;await assert.rejects(downloadDeviceDoses('','person'));assert.equal(store.requests.length,0);});
  await check('pessoa vazia bloqueada antes de consulta',async()=>{store.requests.length=0;await assert.rejects(downloadDeviceDoses('owner',''));assert.equal(store.requests.length,0);});
  await check('caminho Supabase inclui conta e pessoa',async()=>{store.remote=[sample('one')];store.requests.length=0;await downloadDeviceDoses('owner','person');assert.equal(store.requests[0].user_id,'owner');assert.equal(store.requests[0].person_id,'person');assert.equal(store.requests[0].start,0);assert.equal(store.requests[0].end,299);assert.match(store.requests[0].data_since,/^\d{4}-\d{2}-\d{2}$/);});
  await check('paginação recupera mais de 300 registros',async()=>{store.remote=Array.from({length:350},(_,i)=>sample('dose'+i));store.requests.length=0;const rows=await downloadDeviceDoses('owner','person');assert.equal(rows.length,350);assert.equal(store.requests.length,2);assert.equal(store.requests[1].start,300);});
  await check('retorno fora da conta falha fechado',async()=>{const orig=supabase.from; supabase.from=()=>({select(){return this},eq(){return this},gte(){return this},order(){return this},range:async()=>({data:[sample('bad',{user_id:'other'})],error:null})});try{await assert.rejects(downloadDeviceDoses('owner','person'),/fora da pessoa/);}finally{supabase.from=orig;}});
  await check('erro de rede não anuncia sucesso',async()=>{store.errors.push('Falha simulada');await assert.rejects(downloadDeviceDoses('owner','person'),/Falha simulada/);});
  await check('chamadas simultâneas compartilham a mesma promise',async()=>{store.remote=[sample('one')];let release;store.hold=new Promise(resolve=>release=resolve);const a=downloadDeviceDoses('owner','person'),b=downloadDeviceDoses('owner','person');assert.strictEqual(a,b);release();await Promise.all([a,b]);store.hold=null;});
  await check('troca de conta durante leitura é recusada',async()=>{let release;store.hold=new Promise(resolve=>release=resolve);const a=downloadDeviceDoses('owner','person');await assert.rejects(downloadDeviceDoses('other','person'),/Outra conta/);release();await a;store.hold=null;});
  await check('troca de pessoa durante leitura é recusada',async()=>{let release;store.hold=new Promise(resolve=>release=resolve);const a=downloadDeviceDoses('owner','person');await assert.rejects(downloadDeviceDoses('owner','person2'),/Outra conta ou pessoa/);release();await a;store.hold=null;});
  await check('comparação separa somente local',()=>{const r=compareDeviceDoses([sample('a')],[],[],'owner','person');assert.equal(r.onlyLocal,1);});
  await check('comparação separa somente nuvem',()=>{const r=compareDeviceDoses([],[sample('a')],[],'owner','person');assert.equal(r.onlyCloud,1);});
  await check('igualdade ignora metadados de sync',()=>{const r=compareDeviceDoses([sample('a')],[sample('a',{updated_at:'later'})],[],'owner','person');assert.equal(r.same,1);});
  await check('divergência clínica detectada sem sobrescrita',()=>{const r=compareDeviceDoses([sample('a')],[sample('a',{tomado_em:'2026-10-31T14:00:00Z'})],[],'owner','person');assert.equal(r.divergent,1);});
  await check('dose pendente local não vira conflito',()=>{const r=compareDeviceDoses([sample('a',{synced:false})],[sample('a',{tomado_em:'outro'})],[],'owner','person');assert.equal(r.pendingLocal,1);assert.equal(r.divergent,0);});
  await check('fila de conta/pessoa ativa é protegida',()=>{const queue=[{table:'doseLogs',payload:{id:'a',user_id:'owner',person_id:'person'}}];const r=compareDeviceDoses([sample('a')],[sample('a',{tomado_em:'outro'})],queue,'owner','person');assert.equal(r.pendingLocal,1);});
  await check('sem vazamento entre pessoas e contas',()=>{const r=compareDeviceDoses([sample('a',{person_id:'other'}),sample('b',{user_id:'other'})],[sample('c',{user_id:'other'})],[],'owner','person');assert.equal(r.local,0);assert.equal(r.cloud,0);});
  await check('auditoria executa somente leituras, UI e TSX válidos',async()=>{
    store.local=[sample('a')];store.remote=[sample('a'),sample('b')];store.queue=[];store.writes=0;
    const result=await inspectDeviceDoses('owner','person');assert.equal(result.onlyCloud,1);assert.equal(store.writes,0);
    const ui=content('components/saude/P13DeviceDoseAudit.tsx');const recovery=content('app/recuperacao/page.tsx');
    assert(ui.includes('useActivePersonId')&&ui.includes('inspectDeviceDoses')&&recovery.includes('<P13DeviceDoseAudit />'));
    for(const rel of ['components/saude/P13DeviceDoseAudit.tsx','app/recuperacao/page.tsx']){
      const parsed=ts.createSourceFile(rel,content(rel),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
      assert.equal(parsed.parseDiagnostics.length,0,`TSX inválido: ${rel}`);
    }
    assert(content('scripts/test-v63-release-gate.mjs').includes('scripts/test-p13-device-cert.cjs'));
  });
  assert.equal(count,17);
  console.log('VAULT P13 R2: 17 contratos reais de leitura, escopo, paginação, concorrência, conflitos e acessibilidade: OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
