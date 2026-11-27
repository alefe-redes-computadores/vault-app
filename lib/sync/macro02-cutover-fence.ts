import {supabase} from '@/lib/supabase/client';
import {readAuthenticatedRawCutoverLab} from '@/lib/dose-premium/cutover-fence-read';
/** Lab-only authenticated remote read. Never invoked by the published app.
 * Do not replace getUser() with a local/offline auth cache. The proposed RPC
 * must be certified and authorised separately; it is not installed in R2. */
export function readMacro02ServerCutoverLab(uid:string,epoch:string,assertSession:()=>void){
 return readAuthenticatedRawCutoverLab({assertSession,authenticatedAccount:async()=>{const {data,error}=await supabase.auth.getUser();return error?null:data.user?.id??null;},readSnapshot:async p_epoch=>{const {data,error}=await supabase.rpc('vault_macro02_cutover_snapshot_lab',{p_epoch});if(error)throw Error('M02_FENCE_LAB_REMOTE_UNAVAILABLE');return data;}},uid,epoch);
}
