'use strict';
// Bundle exact production repository and authority against a synthetic auth/DB adapter.
// No source files changed. Real browser IndexedDB; mock authentication, no backend.
const path=require('node:path'),fs=require('node:fs');const root=process.cwd();
const esbuild=require(process.env.ESBUILD_MODULE);
const fixture=String.raw`
import Dexie from 'dexie';
export const db=new Dexie('vault-macro02-preflight-native-idb');
db.version(1).stores({medicamentos:'id,person_id,user_id',doseLogs:'id,medicamento_id,person_id,data,horario',syncQueue:'id,chave'});
let owner='u';let rpcCalls=0;const listeners=[];
export const supabase={auth:{onAuthStateChange:fn=>{listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}};}},rpc:async()=>{rpcCalls++;throw Error('no network');}};
export const getLocalFirstAuthUser=async()=>({data:{user:owner?{id:owner}:null},error:null});
export const fixtureState={rpcCount:()=>rpcCalls,changeOwner:(v)=>{owner=v;listeners.forEach(fn=>fn('SIGNED_OUT',null));}};
`;
const entry=String.raw`
import {db,fixtureState} from '@/lib/db';
import {doseLogsRepository as repo} from '@/lib/repositories/doseLogs';
import {projectLongitudinalA10} from '@/lib/a10/longitudinal';
import {MACRO02_PREMIUM_UI_ENABLED} from '@/lib/dose-premium/dormant-release-authority';
const check=(ok,label)=>{if(!ok)throw Error(label)};
const med={id:'m',user_id:'u',person_id:'p',nome:'Synthetic',status:'ativo',tipo_uso:'continuo',estoque_quantidade:3,estoque_unidade_medida:'comprimido',estoque_unidade_por_dose:1};
const input={personId:'p',medicamentoId:'m',data:'2026-11-25',horario:'10:00',status:'taken',quantidade:1,tomadoEm:'2026-11-25T10:00:00Z',requireRegisteredStock:true};
const planned={id:'old-planned',user_id:'u',person_id:'p',medicamento_id:'m',data:input.data,horario:input.horario,dose_kind:'planned',quantidade:1,created_at:'2026-11-24T10:00:00Z',synced:true};
window.__vaultPreflight=async phase=>{await db.open();check(navigator.onLine===false,'browser must actually be offline');check(MACRO02_PREMIUM_UI_ENABLED===false,'Premium UI not dormant');
 if(phase===1){check(await db.medicamentos.count()===0,'fixture profile not empty');await db.medicamentos.add(med);await db.doseLogs.add(planned);check(await repo.setStatus(input)===planned.id,'planned identity lost');check(await repo.setStatus(input)===planned.id,'repeat changed identity');check((await db.medicamentos.get('m')).estoque_quantidade===2,'repeat debit');check(await db.syncQueue.count()===2,'legacy queue count');}
 else {check((await db.doseLogs.get(planned.id)).dose_kind==='planned','restart lost origin');check((await db.medicamentos.get('m')).estoque_quantidade===2,'restart changed stock');check(await db.syncQueue.count()===2,'restart lost queue');check(await repo.setStatus(input)===planned.id,'restart duplicate');check((await db.medicamentos.get('m')).estoque_quantidade===2,'restart duplicate debit');const next={...input,horario:'11:00',tomadoEm:'2026-11-25T11:00:00Z'};await repo.setStatus(next);check((await db.medicamentos.get('m')).estoque_quantidade===1,'offline restart write failed');const before=await db.doseLogs.count();fixtureState.changeOwner('other');let blocked=false;try{await repo.setStatus({...input,horario:'12:00'});}catch{blocked=true;}check(blocked&&await db.doseLogs.count()===before,'cross account writer not blocked');fixtureState.changeOwner('u');}
 const fact=await db.doseLogs.get(planned.id);check(fact.dose_kind==='planned'&&fact.created_at===planned.created_at,'origin/history changed');const projected=projectLongitudinalA10({medicamentos:[med],doseLogs:[fact]},'u','p',false,'America/Sao_Paulo').facts;check(projected[0]?.status==='Tomada registrada'&&projected[0]?.dateKind==='factual','A10 not factual');check(!(await db.syncQueue.toArray()).some(q=>q.payload.macro02_atomic!==undefined),'Premium queue in dormant');check(fixtureState.rpcCount()===0,'unexpected RPC');db.close();return 'PASS';};
`;
(async()=>{await esbuild.build({stdin:{contents:entry,resolveDir:root,sourcefile:'vault-preflight-entry.ts',loader:'ts'},bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:process.env.WRITER_BUNDLE,tsconfig:path.join(root,'tsconfig.json'),nodePaths:[path.join(root,'node_modules')],plugins:[{name:'synthetic-auth-and-db',setup(b){b.onResolve({filter:/^@\/lib\/(db|supabase\/(client|local-auth))$/},()=>({path:'fixture',namespace:'synthetic'}));b.onLoad({filter:/.*/,namespace:'synthetic'},()=>({contents:fixture,loader:'ts',resolveDir:root}));}}]});console.log('WRITER_BUNDLE_OK');})().catch(e=>{console.error(e.message);process.exitCode=1;});
