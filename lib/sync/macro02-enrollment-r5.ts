import {supabase} from '@/lib/supabase/client';
import {parseMacro02Enrollment} from '@/lib/dose-premium/cutover-enrollment-authority';
/** A live, account-scoped read. Network failure is not evidence of a legacy
 * account, and the result is not permission to mutate local clinical data. */
export async function readMacro02EnrollmentR5(uid:string){
 let invalid=false;const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalid=true;});
 try{
  const before=await supabase.auth.getUser();if(invalid||before.error||before.data.user?.id!==uid)throw Error('M02_R5_AUTH');
  const {data,error}=await supabase.rpc('vault_macro02_read_enrollment_r5');if(invalid||error)throw Error('M02_R5_ENROLLMENT_UNAVAILABLE');
  const after=await supabase.auth.getUser();if(invalid||after.error||after.data.user?.id!==uid)throw Error('M02_R5_ACCOUNT_CHANGED');
  return parseMacro02Enrollment(data,uid);
 }finally{subscription.unsubscribe();}
}
