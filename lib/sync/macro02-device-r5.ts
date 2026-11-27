import {db} from '@/lib/db';
import {supabase} from '@/lib/supabase/client';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {createMacro02DeviceAuthorityR5,parseMacro02DeviceR5,type DeviceEnrollmentR5} from '@/lib/dose-premium/cutover-device-authority-r5';
import {readMacro02EnrollmentR5} from '@/lib/sync/macro02-enrollment-r5';
import {CUTOVER_TABLES,cutoverCanonical} from '@/lib/dose-premium/cutover-recovery';
import {captureMacro02LocalCutover} from '@/lib/dose-premium/cutover-local-snapshot';
import {exactMacro02LocalIdentity,normalizeMacro02LocalForComparison,normalizeMacro02RemoteForComparison} from '@/lib/dose-premium/cutover-storage-codec';
import {projectMacro02CutoverLab} from '@/lib/dose-premium/cutover-projection-lab';
const tableName='macro02_device_enrollment';
const localAccount=async()=>{const a=await getLocalFirstAuthUser();return a.error?null:a.data.user?.id??null;};
const online=()=>typeof navigator!=='undefined'&&navigator.onLine;
let runtime:ReturnType<typeof createMacro02DeviceAuthorityR5>|undefined;
export function macro02DeviceAuthorityR5(){
 if(typeof window==='undefined')throw Error('M02_R5_BROWSER');if(runtime)return runtime;
 const host=createMacro02DeviceAuthorityR5({localAccount,online,readRemote:readMacro02EnrollmentR5,readDevice:uid=>db.table(tableName).get(uid),queue:()=>db.syncQueue.toArray()});runtime=host;
 const invalidate=()=>host.invalidate();supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalidate();});
 for(const event of ['online','offline','pageshow','pagehide','vault:macro02-device'])window.addEventListener(event,invalidate);
 document.addEventListener('visibilitychange',invalidate);return host;
}
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
/** Explicit device verification; no automatic restore, deletion or replay. A
 * previously unseen device cannot use a Premium epoch until every local row
 * and dependency matches authenticated remote evidence. */
export async function verifyMacro02ActiveDeviceR5(uid:string){
 if(!online()||!crypto.subtle)throw Error('M02_R5_DEVICE_ONLINE_REQUIRED');
 let invalid=false;const invalidate=()=>{invalid=true;};const guard=()=>{if(invalid)throw Error('M02_R5_DEVICE_SESSION_CHANGED');};
 const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalidate();});window.addEventListener('pagehide',invalidate);document.addEventListener('visibilitychange',invalidate);
 const tables=[...CUTOVER_TABLES,'syncQueue'].map(t=>db.table(t));
 const capture=()=>captureMacro02LocalCutover({transaction:run=>db.transaction('r',tables,run),readTable:t=>db.table(t).toArray(),assertSession:guard,validateLocal:exactMacro02LocalIdentity,requireAllQueueDependenciesClear:true},uid);
 try{
  const e=await readMacro02EnrollmentR5(uid);guard();if(e.state!=='premium'||!e.epoch)throw Error('M02_R5_DEVICE_ACCOUNT_NOT_ACTIVE');
  const readRemote=async()=>{const {data,error}=await supabase.rpc('vault_macro02_active_snapshot_r5',{p_epoch:e.epoch});guard();if(error||!data||data.format!=='macro02-active-snapshot-r5'||data.account_id!==uid||data.epoch!==e.epoch||data.fence_id!==`m02-active-r5:${uid}:${e.epoch}`)throw Error('M02_R5_DEVICE_REMOTE_EVIDENCE');return data;};
  const first=await readRemote(),local=await capture();guard();const identity=exactMacro02LocalIdentity(local);
  const wire=normalizeMacro02RemoteForComparison({...first,format:'macro02-raw-pg-lab-v1',fence_id:`m02-cutover-lab:${uid}:${e.epoch}`});
  if(!projectMacro02CutoverLab(wire,normalizeMacro02LocalForComparison(local),e.epoch).inspection.localMatchesFence)throw Error('M02_R5_DEVICE_LOCAL_REVIEW_REQUIRED');
  const second=await readRemote();if(cutoverCanonical(first)!==cutoverCanonical(second))throw Error('M02_R5_DEVICE_REMOTE_CHANGED');
  const proof:DeviceEnrollmentR5={format:'macro02-device-r5',account_id:uid,epoch:e.epoch,generation:e.generation,local_sha256:await digest(identity),remote_sha256:await digest(cutoverCanonical(second))};parseMacro02DeviceR5(proof,uid);
  const fresh=await readMacro02EnrollmentR5(uid);guard();if(cutoverCanonical(e)!==cutoverCanonical(fresh))throw Error('M02_R5_DEVICE_EPOCH_CHANGED');
  await db.transaction('rw',[...tables,db.table(tableName)],async()=>{guard();if(exactMacro02LocalIdentity(await capture())!==identity)throw Error('M02_R5_DEVICE_LOCAL_CHANGED');const old=parseMacro02DeviceR5(await db.table(tableName).get(uid),uid);if(old&&(old.epoch!==proof.epoch||old.generation!==proof.generation))throw Error('M02_R5_DEVICE_NO_DOWNGRADE');await db.table(tableName).put(proof);guard();});
  window.dispatchEvent(new Event('vault:macro02-device'));return proof;
 }finally{subscription.unsubscribe();window.removeEventListener('pagehide',invalidate);document.removeEventListener('visibilitychange',invalidate);}
}
