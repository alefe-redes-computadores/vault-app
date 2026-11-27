import {macro02DeviceAuthorityR5} from '@/lib/sync/macro02-device-r5';
import {db} from '@/lib/db';
import {supabase} from '@/lib/supabase/client';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {createDormantReleaseAuthority} from '@/lib/dose-premium/dormant-release-authority';
import {createMacro02R2Transport} from '@/lib/dose-premium/r2-transport';

// Volatile grant. Never persist or infer a grant from an error, a user flag, or
// a cached wall-clock timestamp. The browser lifecycle invalidates on resume.
let runtime:ReturnType<typeof createMacro02R2Transport>|undefined;
export function macro02Authority(){
 if(typeof window==='undefined')throw Error('MACRO02_BROWSER_REQUIRED');
 if(runtime)return runtime;
 const startWall=Date.now(),startMono=performance.now();let lastWall=startWall;
 const host:ReturnType<typeof createMacro02R2Transport>=createMacro02R2Transport({
  nowMono:()=>{const wall=Date.now();if(wall<lastWall){lastWall=wall;host.invalidate();return NaN;}lastWall=wall;return Math.max(performance.now(),startMono+wall-startWall);},
  newSessionEpoch:()=>crypto.randomUUID(),
  authenticatedAccount:async()=>{const {data,error}=await getLocalFirstAuthUser();return error?null:data.user?.id??null;},
  rpc:async(name,args)=>{const {data,error}=await supabase.rpc(name,args);if(error)throw Error('MACRO02_AUTHENTICATED_RPC_UNAVAILABLE');return data;},
  queue:()=>db.syncQueue.toArray(),
 });
 runtime=host;
 supabase.auth.onAuthStateChange((event)=>{if(event!=='INITIAL_SESSION')host.invalidate();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')host.invalidate();});
 window.addEventListener('pageshow',()=>host.invalidate());
 return host;
}
// Separate release authority: neither R2 RPC failure nor expiry enables this
// path. R2 grants remain volatile and mandatory for remote ledger inspection.
let dormant:ReturnType<typeof createDormantReleaseAuthority>|undefined;
export function macro02DormantAuthority(){
 if(typeof window==='undefined')throw Error('MACRO02_BROWSER_REQUIRED');
 if(dormant)return dormant;
 const host=createDormantReleaseAuthority({
  localAccount:async()=>{const {data,error}=await getLocalFirstAuthUser();return error?null:data.user?.id??null;},
  queue:()=>db.syncQueue.toArray(),
 });
 dormant=host;
 supabase.auth.onAuthStateChange(event=>{if(event!=='INITIAL_SESSION')host.invalidate();});
 // Resume may have missed a session change in another tab. A new operation
 // obtains a fresh local identity, without a server-capability lease.
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')host.invalidate();});
 window.addEventListener('pageshow',()=>host.invalidate());
 return host;
}
export async function prepareMacro02ClinicalWrite(uid:string){return macro02DeviceAuthorityR5().prepareWrite(uid);}
