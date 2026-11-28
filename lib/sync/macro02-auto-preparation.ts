import {Capacitor} from '@capacitor/core';
import {supabase} from '@/lib/supabase/client';
import {readMacro02EnrollmentR5} from './macro02-enrollment-r5';
import {exportAuthenticatedMacro02RecoveryImage,restoreAuthenticatedMacro02RecoveryImage} from './macro02-operational-recovery';
import {readMacro02ExactRecoveryImage,normalizeMacro02LocalForComparison} from '@/lib/dose-premium/cutover-storage-codec';
import {assertMacro02LocalPreparation} from '@/lib/dose-premium/cutover-recovery';
import {prepareMacro02Automatically,resumeMacro02Automatically,preparationScope,type PreparationHost} from '@/lib/dose-premium/auto-preparation';
import {createPrivatePreparationStore} from '@/lib/dose-premium/private-preparation-store';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
async function run<T>(uid:string,synchronize:()=>Promise<boolean>,fn:(h:PreparationHost)=>Promise<T>){
 if(typeof window==='undefined'||!navigator.onLine||!crypto.subtle)throw Error('M02_RECOVERY_AUTO_ONLINE');
 // Native app storage is sandboxed and persistent across normal updates.
 // A PWA must obtain explicit durable origin storage before preparation.
 if(!Capacitor.isNativePlatform()&&!(await navigator.storage?.persisted?.()||await navigator.storage?.persist?.()))throw Error('M02_RECOVERY_AUTO_PERSISTENCE');
 const store=createPrivatePreparationStore();let invalid=false;const invalidate=()=>{invalid=true;};
 const {data:{subscription}}=supabase.auth.onAuthStateChange((e,session)=>{if(e!=='INITIAL_SESSION'&&!(e==='TOKEN_REFRESHED'&&session?.user.id===uid))invalidate();});
 window.addEventListener('pagehide',invalidate);document.addEventListener('visibilitychange',invalidate);
 const guard=()=>{if(invalid)throw Error('M02_RECOVERY_AUTO_SESSION_CHANGED');};
 const enrollment=async()=>{guard();const e=await readMacro02EnrollmentR5(uid);guard();return e;};
 const inspect=(bytes:string)=>{guard();assertMacro02LocalPreparation(normalizeMacro02LocalForComparison(readMacro02ExactRecoveryImage(JSON.parse(bytes),uid)));};
 try{await enrollment();return await fn({guard,enrollment,synchronize,capture:()=>exportAuthenticatedMacro02RecoveryImage(uid),inspect,digest,uuid:()=>crypto.randomUUID(),store,recover:restoreAuthenticatedMacro02RecoveryImage});}
 finally{invalidate();subscription.unsubscribe();window.removeEventListener('pagehide',invalidate);document.removeEventListener('visibilitychange',invalidate);store.close();}
}
export const prepareMacro02Private=(uid:string,sync:()=>Promise<boolean>)=>run(uid,sync,h=>prepareMacro02Automatically(h,uid));
export const resumeMacro02Private=(uid:string)=>run(uid,async()=>false,h=>resumeMacro02Automatically(h,uid));
export const readMacro02PrivateStatus=(uid:string)=>run(uid,async()=>false,async h=>{const v=await h.store.read(uid);h.guard();if(!v)return null;if(v.account_id!==uid||await h.digest(v.bytes)!==v.sha256)throw Error('M02_RECOVERY_AUTO_SAVED_HASH');h.guard();h.inspect(v.bytes);return preparationScope(v);});
