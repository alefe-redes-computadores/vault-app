import type {Macro02Writer,PendingAuthority} from './account-authority';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid=(x:unknown):x is string=>typeof x==='string'&&UUID.test(x);
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const fail=(s:string):never=>{throw Error('M02_ENROLLMENT_'+s);};
export type Enrollment=Readonly<{format:'macro02-enrollment-r3';account_id:string;state:'legacy'|'frozen'|'premium'|'hold';epoch:string|null;minimum_protocol:3;generation:number}>;
export type LocalEnrollmentDecision=Readonly<{kind:'allow';writer:Macro02Writer;epoch:string|null;generation:number;online:boolean}|{kind:'hold';reason:string}>;
// This is a durable routing record, not a bearer capability or a sync ACK.
// The server must validate the exact account and epoch on each mutation.
// A Premium enrollment never returns to legacy, even after a hold or restart.
export function parseMacro02Enrollment(raw:unknown,uid:string):Enrollment{
 if(!uuid(uid)||!record(raw)||Object.keys(raw).sort().join(',')!=='account_id,epoch,format,generation,minimum_protocol,state'||raw.format!=='macro02-enrollment-r3'||raw.account_id!==uid||raw.minimum_protocol!==3||typeof raw.generation!=='number'||!Number.isSafeInteger(raw.generation)||raw.generation<0||!['legacy','frozen','premium','hold'].includes(String(raw.state)))return fail('SCOPE');
 if(raw.state==='legacy'?raw.epoch!==null:!uuid(raw.epoch))return fail('EPOCH');
 return Object.freeze({...raw}) as Enrollment;
}
export function acceptMacro02Enrollment(previous:Enrollment|null,raw:unknown,uid:string):Enrollment{
 const next=parseMacro02Enrollment(raw,uid);
 if(!previous){if(next.state==='premium'||next.state==='hold')return fail('DEVICE_RECOVERY_REQUIRED');return next;}
 const old=parseMacro02Enrollment(previous,uid);
 if(next.generation<old.generation)return fail('STALE');
 if(next.generation===old.generation){if(next.state!==old.state||next.epoch!==old.epoch)return fail('GENERATION_CONFLICT');return next;}
 if(old.state==='premium'||old.state==='hold'){
  if(next.state==='legacy'||next.state==='frozen'||next.epoch!==old.epoch)return fail('NO_DOWNGRADE');
 }else if(old.state==='frozen'&&(next.state==='premium'||next.state==='hold')&&next.epoch!==old.epoch)return fail('EPOCH_CHANGED');
 else if(old.state==='legacy'&&next.state==='premium')return fail('MISSED_CUTOVER_REQUIRES_RECOVERY');
 return next;
}
/** Offline legacy is not inferred from absent data or network failure. A
 * known Premium epoch can route local immutable intentions after a restart;
 * it cannot prove remote acceptance. Unknown/held/frozen always stop writes.
 * Offline legacy after a prior server observation remains held: another
 * device could have established the cutover while this device was offline. */
export function selectMacro02Enrollment(enrollment:Enrollment|null,uid:string,online:boolean,pending:PendingAuthority):LocalEnrollmentDecision{
 if(!enrollment)return {kind:'hold',reason:'unconfirmed'};
 let e:Enrollment;try{e=parseMacro02Enrollment(enrollment,uid);}catch{return {kind:'hold',reason:'scope'};}
 if(e.state==='frozen'||e.state==='hold')return {kind:'hold',reason:e.state};
 if(![pending.legacy,pending.premium,pending.unclassified].every(n=>Number.isSafeInteger(n)&&n>=0)||pending.unclassified||e.state==='legacy'&&pending.premium||e.state==='premium'&&pending.legacy)return {kind:'hold',reason:'pending-conflict'};
 if(e.state==='legacy'&&!online)return {kind:'hold',reason:'legacy-offline-cutover-unknown'};
 return {kind:'allow',writer:e.state,epoch:e.epoch,generation:e.generation,online};
}
export function assertMacro02EnrollmentUnchanged(selected:LocalEnrollmentDecision,current:LocalEnrollmentDecision){
 if(selected.kind!=='allow'||current.kind!=='allow'||selected.writer!==current.writer||selected.epoch!==current.epoch||selected.generation!==current.generation||selected.online!==current.online)return fail('CHANGED');
}
