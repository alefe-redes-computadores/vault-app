'use strict';
// Executes the exact extracted safeSetDoseLog postimage, with serialized in-memory DB doubles.
// Not a Dexie integration test. No application data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),cp=require('node:child_process');
const ts=require(process.env.VAULT_TYPESCRIPT || 'typescript');
const root=path.resolve(__dirname,'..'),review=path.join(root,'../host-review');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vault-dose-p4-'));
let pass=0;const base={user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-11-25',horario:'08:00',quantidade:2};
async function main(){
 const sources=fs.readdirSync(path.join(root,'lib/dose-premium')).filter(n=>n.endsWith('.ts')).map(n=>path.join(root,'lib/dose-premium',n));
 const tsc=process.env.VAULT_TSC_JS||path.join(root,'node_modules/typescript/lib/tsc.js');
 const args=['--strict','--esModuleInterop','--skipLibCheck','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',dir,...sources];assert.equal(cp.spawnSync(fs.existsSync(tsc)?process.execPath:'tsc',fs.existsSync(tsc)?[tsc,...args]:args,{stdio:'inherit'}).status,0);
 const {resolveWritableSlot}=require(path.join(dir,'slot-write-guard.js'));
 const source=fs.readFileSync(path.join(root,'lib/db/index.ts'),'utf8');
 const start=source.indexOf('export async function safeSetDoseLog(');const end=source.indexOf('\n// ============================================================',start);
 assert(start>=0&&end>start);const fn=source.slice(start,end);
 const compiled=ts.transpileModule(fn,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,strict:true},reportDiagnostics:true});assert.equal(compiled.diagnostics.length,0);
 let rows,med,chain,seq,transactions;
 function reset(seed=[]){rows=seed.map(r=>({...r}));med={id:'m',user_id:'u',person_id:'p'};chain=Promise.resolve();seq=0;transactions=0;}
 const db={medicamentos:{get:async id=>id===med.id?med:undefined},doseLogs:{where:()=>({equals:id=>({filter:predicate=>({toArray:async()=>rows.filter(x=>x.medicamento_id===id&&predicate(x))})})}),update:async(id,changes)=>{Object.assign(rows.find(x=>x.id===id),changes);return 1;},add:async row=>{rows.push(row);return row.id;}},transaction:(_mode,tables,fn)=>{assert(tables.includes(db.doseLogs)&&tables.includes(db.medicamentos));transactions++;const task=chain.then(async()=>{const before=rows.map(x=>({...x}));try{return await fn()}catch(e){rows=before;throw e}});chain=task.catch(()=>{});return task;}};
 const mod={exports:{}};vm.runInNewContext(compiled.outputText,{exports:mod.exports,db,resolveWritableSlot,nowIso:()=> '2026-11-25T12:00:00Z',getLocalTodayISO:()=>base.data,generateId:()=>`new-${++seq}`});const write=mod.exports.safeSetDoseLog;
 async function test(name,fn){await fn();pass++;console.log('PASS '+name);}
 await test('SOS e extra não são sobrescritos pelo host real',async()=>{reset([{...base,id:'s',dose_kind:'sos'},{...base,id:'e',dose_kind:'extra'}]);const id=await write({...base,dose_kind:'scheduled'});assert.equal(id,'new-1');assert.equal(rows.length,3);assert.equal(rows[0].quantidade,2);});
 await test('slot programado existente conserva ID',async()=>{reset([{...base,id:'a',dose_kind:'scheduled'}]);assert.equal(await write({...base,quantidade:3}),'a');assert.equal(rows[0].quantidade,3);assert.equal(rows.length,1);});
 await test('segundos legados resolvem o mesmo slot',async()=>{reset([{...base,id:'a',horario:'08:00:00'}]);assert.equal(await write(base),'a');});
 await test('conta divergente aborta sem gravação',async()=>{reset();med.user_id='x';await assert.rejects(write(base));assert.equal(rows.length,0);});
 await test('pessoa divergente aborta',async()=>{reset();med.person_id='x';await assert.rejects(write(base));assert.equal(rows.length,0);});
 await test('duplicados bloqueiam sem tocar saldo ou registro',async()=>{reset([{...base,id:'a'},{...base,id:'b'}]);await assert.rejects(write({...base,quantidade:3}));assert(rows.every(x=>x.quantidade===2));});
 await test('escritor auxiliar não aceita recibo injetado',async()=>{reset();await assert.rejects(write({...base,estoque_movimento:{state:'not_applied'}}));assert.equal(rows.length,0);});
 await test('escritor auxiliar não aceita unidade injetada',async()=>{reset();await assert.rejects(write({...base,unidade_dose:'drop'}));assert.equal(rows.length,0);});
 await test('registro protegido não é alterado por caminho legado',async()=>{reset([{...base,id:'a',unidade_dose:'drop'}]);await assert.rejects(write({...base,quantidade:3}));assert.equal(rows[0].quantidade,2);});
 await test('auxiliary writer cannot create factual taken or ignored records',async()=>{reset();for(const k of ['tomado_em','ignorado_em'])await assert.rejects(write({...base,[k]:'2026-11-25T11:00:00Z'}));assert.equal(rows.length,0);});
 await test('auxiliary writer cannot erase a legacy factual event',async()=>{reset([{...base,id:'old',tomado_em:'2026-11-25T11:00:00Z'}]);await assert.rejects(write(base));assert.equal(rows[0].tomado_em,'2026-11-25T11:00:00Z');});
 await test('SOS não é gravada pelo auxiliar programado',async()=>{reset();await assert.rejects(write({...base,dose_kind:'sos'}));assert.equal(rows.length,0);});
 await test('transação serializada impede duas criações em concorrência simulada',async()=>{reset();const ids=await Promise.all([write(base),write(base)]);assert.equal(ids[0],ids[1]);assert.equal(rows.length,1);assert.equal(transactions,2);});
 for(const f of ['DosePremiumCenter.tsx','DoseHistoricalUnitField.tsx']){await test('TSX parse '+f,async()=>{const text=fs.readFileSync(path.join(root,'components/hoje',f),'utf8');const parsed=ts.transpileModule(text,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(parsed.diagnostics.length,0);});}
 console.log(`P4_HOST_DOUBLES_AND_TSX_PASS=${pass} (not Dexie, full TSC or Android)`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
