/** M5 appointments: opt-in native notifications only, namespaced from M2 and medications. */
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { isVaultNative } from '@/lib/native-runtime';
import { isNotificationPreferenceEnabled, ensureVaultNotificationChannel, VAULT_NOTIFICATION_CHANNEL_ID } from '@/lib/notifications';
import { readQuietHoursM115 } from '@/lib/health-reminders/quiet-hours-m115';
import { reconcileVaultNotificationSet, VAULT_NOTIFICATION_FINGERPRINT, vaultNotificationFingerprint } from '@/lib/notification-reconciliation';
import { adjustQuietM2 } from '@/lib/clinical-exams-m2/notifications';
import type { RehabProgramM5, RehabSessionM5 } from './types';
export const M5_REHAB_NOTICE_MARKER='vaultM5RehabSession';
const MIN=1_890_000_000,WIDTH=60_000_000;
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619);}return h>>>0;};
export const rehabNoticeIdM5=(key:string)=>MIN+(hash(key)%WIDTH);
export async function reconcileRehabNotificationsM5(input:{userId:string;personId:string;programs:readonly RehabProgramM5[];
 sessions:readonly RehabSessionM5[];now?:number}):Promise<{mode:string;scheduled:number;collisions:number}>{
 if(!isVaultNative())return {mode:'web',scheduled:0,collisions:0};
 const owns=(n:{extra?:Record<string,unknown>})=>n.extra?.[M5_REHAB_NOTICE_MARKER]===true;
 if(!input.userId||!input.personId||!isNotificationPreferenceEnabled()){
  await reconcileVaultNotificationSet([],owns);return {mode:'disabled',scheduled:0,collisions:0};
 }
 const permission=await LocalNotifications.checkPermissions();
 if(permission.display!=='granted'){
  await reconcileVaultNotificationSet([],owns);return {mode:'denied',scheduled:0,collisions:0};
 }
 const exact=await LocalNotifications.checkExactNotificationSetting();
 const mode=exact.exact_alarm==='granted'?'exact':'approximate';
 const current=await LocalNotifications.getPending();
 const taken=new Set(current.notifications.filter(n=>!owns(n)).map(n=>n.id));
 const ownedIds=new Set(input.programs.filter(p=>p.user_id===input.userId&&p.person_id===input.personId&&!p.deleted_at).map(p=>p.id));
 const now=input.now??Date.now(),quiet=readQuietHoursM115();
 const eligible=input.sessions.filter(s=>s.user_id===input.userId&&s.person_id===input.personId&&!s.deleted_at&&
  ownedIds.has(s.program_id)&&Boolean(s.reminder_opt_in)&&['scheduled','confirmed'].includes(s.status)&&Date.parse(s.scheduled_at)>now)
  .sort((a,b)=>a.id.localeCompare(b.id));
 const used=new Set<number>();let collisions=0;const wanted:LocalNotificationSchema[]=[];
 for(const s of eligible){
  const target=adjustQuietM2(Date.parse(s.scheduled_at),quiet);
  if(target.at<=now)continue;
  const key=`${input.userId}:${input.personId}:${s.id}`;
  let nativeId=rehabNoticeIdM5(key),attempt=0;
  while((taken.has(nativeId)||used.has(nativeId))&&attempt++<WIDTH){nativeId=MIN+((nativeId-MIN+1)%WIDTH);}
  if(attempt>=WIDTH)throw Error('Faixa de notificações de reabilitação indisponível.');
  if(attempt)collisions++;
  used.add(nativeId);
  const p=input.programs.find(p=>p.id===s.program_id);
  wanted.push({id:nativeId,title:'Sessão de reabilitação agendada',body:p?.title||'Confira os detalhes da sessão no VAULT.',
   channelId:VAULT_NOTIFICATION_CHANNEL_ID,schedule:{at:new Date(target.at),allowWhileIdle:true},
   extra:{[M5_REHAB_NOTICE_MARKER]:true,type:'health_event',eventKind:'reabilitacao',eventId:s.program_id,
    userId:input.userId,personId:input.personId,
    targetRoute:`/saude/reabilitacao/detalhes?id=${encodeURIComponent(s.program_id)}`,
    [VAULT_NOTIFICATION_FINGERPRINT]:vaultNotificationFingerprint([key,s.scheduled_at,s.status,target.at])}});
 }
 await ensureVaultNotificationChannel();
 const result=await reconcileVaultNotificationSet(wanted.slice(0,60),owns);
 return {mode,scheduled:result.desired,collisions};
}
