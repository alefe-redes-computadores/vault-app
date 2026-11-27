import {db} from '@/lib/db';
import {supabase} from '@/lib/supabase/client';
import {CUTOVER_TABLES} from '@/lib/dose-premium/cutover-recovery';
import {captureMacro02LocalCutover} from '@/lib/dose-premium/cutover-local-snapshot';
import {exactMacro02LocalIdentity,readMacro02ExactRecoveryImage,exportMacro02ExactRecoveryImage} from '@/lib/dose-premium/cutover-storage-codec';
import {recoverMacro02Operational,type RecoveryHost} from '@/lib/dose-premium/cutover-operational-recovery';

const tables=()=>[...CUTOVER_TABLES,'syncQueue'].map(t=>db.table(t));
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
/** This operation requires the R3 authenticated server preparation fence.
 * No legacy fallback, startup automation, upload, activation or sync ACK.
 * The owner retains the exact backup privately; the recovery receipt stores
 * hashes only. Close the operation on any change of identity or lifecycle. */
async function withAuthenticatedRecoverySession<T>(uid:string,fn:(host:RecoveryHost)=>Promise<T>):Promise<T>{
 if(typeof window==='undefined'||!uid||!crypto.subtle)throw Error('M02_RECOVERY_BROWSER_REQUIRED');
 let invalid=false;
 const invalidate=()=>{invalid=true;};
 const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event!=='INITIAL_SESSION')invalidate();});
 window.addEventListener('pagehide',invalidate);document.addEventListener('visibilitychange',invalidate);
 const assertSession=()=>{if(invalid)throw Error('M02_RECOVERY_SESSION_CHANGED');};
 const authenticatedAccount=async()=>{assertSession();const {data,error}=await supabase.auth.getUser();assertSession();return error?null:data.user?.id??null;};
 const rpc=async(name:string,args:Record<string,unknown>)=>{assertSession();const {data,error}=await supabase.rpc(name,args);assertSession();if(error)throw Error('M02_RECOVERY_REMOTE_UNAVAILABLE');return data;};
 const host:RecoveryHost={assertSession,authenticatedAccount,sha256,
  acquire:s=>rpc('vault_macro02_recovery_claim_r3',{p_epoch:s.epoch,p_operation_id:s.operationId,p_acquire:true}),
  reread:s=>rpc('vault_macro02_recovery_claim_r3',{p_epoch:s.epoch,p_operation_id:s.operationId,p_acquire:false}),
  finalize:receipt=>rpc('vault_macro02_recovery_complete_r3',{p_receipt:receipt}),
  transaction:run=>db.transaction('rw',tables(),run),
  readLocal:()=>captureMacro02LocalCutover({transaction:run=>db.transaction('r',tables(),run),readTable:t=>db.table(t).toArray(),assertSession,validateLocal:exactMacro02LocalIdentity,requireAllQueueDependenciesClear:true},uid),
  add:async(t,row)=>{assertSession();await db.table(t).add(row);assertSession();},
 };
 try{if(await authenticatedAccount()!==uid)throw Error('M02_RECOVERY_ACCOUNT_UNCONFIRMED');return await fn(host);}finally{invalidate();subscription.unsubscribe();window.removeEventListener('pagehide',invalidate);document.removeEventListener('visibilitychange',invalidate);}
}
/** Private exact capture; caller decides how to store the bytes locally.
 * Do not send the contents to any remote logging or diagnostics endpoint. */
export async function exportAuthenticatedMacro02RecoveryImage(uid:string){
 return withAuthenticatedRecoverySession(uid,async host=>{const bytes=exportMacro02ExactRecoveryImage(await host.readLocal());host.assertSession();const digest=await host.sha256(bytes);if(await host.authenticatedAccount()!==uid)throw Error('M02_RECOVERY_ACCOUNT_CHANGED');return {bytes,sha256:digest,allowsActivation:false as const};});
}
export async function restoreAuthenticatedMacro02RecoveryImage(input:{uid:string;epoch:string;operationId:string;backupText:string;expectedSourceSha256:string}){
 return withAuthenticatedRecoverySession(input.uid,async host=>{
  const digest=await host.sha256(input.backupText);if(digest!==input.expectedSourceSha256)throw Error('M02_RECOVERY_BACKUP_CHECKSUM');
  const backup=readMacro02ExactRecoveryImage(JSON.parse(input.backupText),input.uid);host.assertSession();
  return recoverMacro02Operational(host,{scope:{uid:input.uid,epoch:input.epoch,operationId:input.operationId},backup,sourceSha256:digest});
 });
}
