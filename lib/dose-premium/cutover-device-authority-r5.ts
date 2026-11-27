import {parseMacro02Enrollment,selectMacro02Enrollment,type Enrollment} from './cutover-enrollment-authority';
import {countMacro02ActivePending} from './cutover-active-queue-r5';
import {countMacro02Pending} from './authority-session';
import type {PendingItem} from './atomic-envelope';
import type {ClinicalWriteAuthority} from './dormant-release-authority';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
export type DeviceEnrollmentR5=Readonly<{format:'macro02-device-r5';account_id:string;epoch:string;generation:number;local_sha256:string;remote_sha256:string}>;
export type DeviceModeR5='legacy'|'premium'|'hold';
export function parseMacro02DeviceR5(raw:unknown,uid:string):DeviceEnrollmentR5|null{
 if(raw==null)return null;
 if(typeof raw!=='object'||Array.isArray(raw))throw Error('M02_R5_DEVICE_SCOPE');const r=raw as Record<string,unknown>;
 if(Object.keys(r).sort().join(',')!=='account_id,epoch,format,generation,local_sha256,remote_sha256'||r.format!=='macro02-device-r5'||r.account_id!==uid||!uuid(uid)||!uuid(r.epoch)||typeof r.generation!=='number'||!Number.isSafeInteger(r.generation)||r.generation<2||!hash(r.local_sha256)||!hash(r.remote_sha256))throw Error('M02_R5_DEVICE_SCOPE');
 return Object.freeze({...r}) as DeviceEnrollmentR5;
}
/** Local marker means the device compared its complete image against an
 * authenticated active snapshot. It is never a remote permission or ACK. */
export function selectMacro02DeviceR5(input:{uid:string;online:boolean;remote:unknown;device:unknown;queue:readonly PendingItem[]}){
 const {uid,online,queue}=input,device=parseMacro02DeviceR5(input.device,uid);let enrollment:Enrollment|null=null;
 if(online){if(input.remote==null)return {mode:'hold' as const,enrollment:null};enrollment=parseMacro02Enrollment(input.remote,uid);}
 else if(device)enrollment={format:'macro02-enrollment-r3',account_id:uid,state:'premium',epoch:device.epoch,minimum_protocol:3,generation:device.generation};
 if(!enrollment)return {mode:'hold' as const,enrollment:null};
 if(device&&(enrollment.state!=='premium'||enrollment.epoch!==device.epoch||enrollment.generation!==device.generation))return {mode:'hold' as const,enrollment};
 if(enrollment.state==='premium'&&!device)return {mode:'hold' as const,enrollment};
 const p=enrollment.state==='premium'&&enrollment.epoch?countMacro02ActivePending(queue,uid,enrollment.epoch):countMacro02Pending(queue,uid);
 const d=selectMacro02Enrollment(enrollment,uid,online,p);return {mode:d.kind==='allow'?d.writer:'hold' as DeviceModeR5,enrollment};
}
export function createMacro02DeviceAuthorityR5(host:{localAccount:()=>Promise<string|null>;online:()=>boolean;readRemote:(uid:string)=>Promise<unknown>;readDevice:(uid:string)=>Promise<unknown>;queue:()=>Promise<readonly PendingItem[]>}){
 let generation=0,last:{uid:string;identity:string}|null=null;
 let running:{uid:string;promise:ReturnType<typeof resolveFresh>}|null=null;
 const invalidate=()=>{generation++;last=null;running=null;};
 async function resolveFresh(uid:string){
  const started=generation;if(!uid||await host.localAccount()!==uid||started!==generation)throw Error('M02_R5_DEVICE_AUTH');
  const online=host.online();let remote:unknown=null;
  if(online)try{remote=await host.readRemote(uid);}catch{if(started===generation)invalidate();throw Error('M02_R5_ENROLLMENT_UNAVAILABLE');}
  const device=await host.readDevice(uid),queue=await host.queue();
  if(await host.localAccount()!==uid||started!==generation||online!==host.online())throw Error('M02_R5_DEVICE_CHANGED');
  const result=selectMacro02DeviceR5({uid,online,remote,device,queue});
  const identity=JSON.stringify({mode:result.mode,enrollment:result.enrollment,online,device});
  if(!last||last.uid!==uid||last.identity!==identity){generation++;last={uid,identity};}
  return {...result,generation,online};
 }
 function resolve(uid:string){
  if(running?.uid===uid)return running.promise;
  const promise=resolveFresh(uid);running={uid,promise};
  const clear=()=>{if(running?.promise===promise)running=null;};void promise.then(clear,clear);return promise;
 }
 async function prepareWrite(uid:string):Promise<ClinicalWriteAuthority>{
  const selected=await resolve(uid);if(selected.mode==='hold'||!selected.enrollment)throw Error('M02_R5_DEVICE_REVIEW_REQUIRED');
  const ep=selected.enrollment.epoch;let first=true;
  const guard=()=>{if(generation!==selected.generation||host.online()!==selected.online)throw Error('M02_R5_DEVICE_CHANGED');};
  const assertFinalQueue=async()=>{guard();const q=await host.queue();const p=selected.mode==='premium'&&ep?countMacro02ActivePending(q,uid,ep):countMacro02Pending(q,uid);guard();if(p.unclassified||selected.mode==='premium'&&p.legacy||selected.mode==='legacy'&&p.premium)throw Error('M02_R5_DEVICE_QUEUE_CONFLICT');};
  const assertCurrent=async()=>{guard();if(first){first=false;await assertFinalQueue();}guard();};
  return Object.freeze({writer:selected.mode,epoch:ep??undefined,assertCurrent,assertFinalQueue});
 }
 return {resolve,prepareWrite,invalidate};
}
