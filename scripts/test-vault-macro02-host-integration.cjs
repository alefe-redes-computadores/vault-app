#!/usr/bin/env node
'use strict';
// Integration of the actual host source functions, with DB/HTTP doubles only.
// A separate full Dexie/Postgres/React/Android test remains mandatory.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),vm=require('node:vm');
const ts=require(process.env.VAULT_TYPESCRIPT||'typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'vault-dose-host-'));let pass=0;
function source(p){return ts.createSourceFile(p,fs.readFileSync(path.join(root,p),'utf8'),ts.ScriptTarget.Latest,true);}
function extract(p,kind,name){const s=source(p);let found;function visit(n){if(n.kind===kind&&n.name?.getText(s)===name)found=n;ts.forEachChild(n,visit);}visit(s);assert(found,`${p}:${name}`);return found.getText(s);}
function load(code,globals){const out=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,strict:true},reportDiagnostics:true});assert.equal(out.diagnostics.length,0);const m={exports:{}};vm.runInNewContext(out.outputText,{exports:m.exports,module:m,...globals});return m.exports;}
async function main(){
 const sources=fs.readdirSync(path.join(root,'lib/dose-premium')).filter(x=>x.endsWith('.ts')).map(x=>path.join(root,'lib/dose-premium',x));
 const tsc=process.env.VAULT_TSC_JS||path.join(root,'node_modules/typescript/lib/tsc.js');const args=['--strict','--esModuleInterop','--skipLibCheck','--target','ES2022','--module','commonjs','--moduleResolution','node','--outDir',dir,...sources];
 assert.equal(cp.spawnSync(fs.existsSync(tsc)?process.execPath:'tsc',fs.existsSync(tsc)?[tsc,...args]:args,{stdio:'inherit'}).status,0);
 const guard=require(path.join(dir,'slot-write-guard.js')),wire=require(path.join(dir,'wire-fields.js')),units=require(path.join(dir,'historical-unit.js')),compat=require(path.join(dir,'compatibility.js'));
 const base={id:'d',user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-11-25',horario:'08:00',quantidade:5,dose_kind:'scheduled',tomado_em:'2026-11-25T11:00:00.123Z',created_at:'2026-11-25T11:01:00Z',updated_at:'2026-11-25T11:01:00Z',...units.declareDoseUnit('drop','declared'),estoque_movimento:{state:'not_applied',reason:'historical_review'}};
 async function test(name,fn){await fn();pass++;console.log('PASS '+name);}
 let rows=[];const db={doseLogs:{where:()=>({equals:id=>({filter:fn=>({toArray:async()=>rows.filter(x=>x.medicamento_id===id&&fn(x))})})})}};
 const slot=load('export '+extract('lib/repositories/doseLogs.ts',ts.SyntaxKind.FunctionDeclaration,'getDoseLogForSlot'),{db,resolveWritableSlot:guard.resolveWritableSlot}).getDoseLogForSlot;
 const lookup=()=>slot('m','p','2026-11-25','08:00','u');
 await test('actual repository does not select SOS or extra',async()=>{rows=[{...base,id:'s',dose_kind:'sos'},{...base,id:'e',dose_kind:'extra'},base];assert.equal((await lookup()).id,'d');});
 await test('actual repository reports absent when only independent facts exist',async()=>{rows=[{...base,dose_kind:'sos'}];assert.equal(await lookup(),undefined);});
 await test('actual repository rejects duplicate scheduled slot',async()=>{rows=[base,{...base,id:'x',horario:'08:00:00'}];await assert.rejects(lookup);});
 await test('actual repository rejects cross-owner fact',async()=>{rows=[{...base,user_id:'another'}];await assert.rejects(lookup);});
 let sent,selection,where,reply;
 const client={from:t=>{assert.equal(t,'dose_logs');return{upsert:(payload,options)=>{assert.equal(options.onConflict,'id');sent=payload;return{select:async select=>{selection=select;return reply(sent);}};},delete:()=>{where=[];const q={eq:(k,v)=>{where.push([k,v]);return q;},then:cb=>Promise.resolve(cb({error:null}))};return q;}}}};
 const requireId=x=>{if(typeof x!=='string'||!x)throw Error('missing identity');return x;};
 const sync=load('export const '+extract('hooks/useSyncQueue.ts',ts.SyntaxKind.VariableDeclaration,'syncDoseLog'),{isMacro02Atomic:()=>false,requireSupabase:()=>client,requireUserId:requireId,requirePersonId:requireId,requirePayloadId:item=>requireId(item.payload.id),...wire}).syncDoseLog;
 const send=()=>sync({operation:'update',payload:base});
 await test('wire exact unit/evidence plus full select',async()=>{reply=x=>({data:[{...x,tomado_em:'2026-11-25T11:00:00.123000+00:00',created_at:'2026-11-25T11:01:00+00:00',updated_at:'2026-11-25T11:01:00+00:00'}],error:null});await send();assert.equal(sent.unidade_dose,'drop');assert.equal(sent.estoque_movimento.reason,'historical_review');assert.equal(selection,wire.DOSE_PREMIUM_SELECT);});
 for(const [name,patch] of [['ID-only',{id:'d'}],['quantity',{...base,quantidade:7}],['person',{...base,person_id:'x'}],['unit',{...base,unidade_dose:null}],['evidence',{...base,estoque_movimento:null}],['timestamp microsecond',{...base,tomado_em:'2026-11-25T11:00:00.123001Z'}],['revision',{...base,updated_at:'2026-11-25T11:01:01Z'}]])await test('reject ACK '+name,async()=>{reply=()=>({data:[patch],error:null});await assert.rejects(send);});
 await test('reject empty or duplicate response',async()=>{for(const data of [null,[],[base,base]]){reply=()=>({data,error:null});await assert.rejects(send);}});
 await test('scope explicit delete to identity',async()=>{await sync({operation:'delete',payload:base});assert.deepEqual(where,[['id','d'],['user_id','u'],['person_id','p']]);});
 await test('equivalent offsets and full precision',()=>{assert(compat.sameClinicalInstant('2026-11-25T08:00:00.123456-03:00','2026-11-25T11:00:00.123456Z'));assert(!compat.sameClinicalInstant('2026-11-25T11:00:00.123456Z','2026-11-25T11:00:00.123457Z'));});
 console.log(`MACRO02_HOST_INTEGRATION_DOUBLES_PASS=${pass}`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
