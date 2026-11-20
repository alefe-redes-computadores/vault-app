/** M2 native session alerts. Explicit opt-ins; no alerts for pending items or speculative dates. */
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { isVaultNative } from '@/lib/native-runtime';
import { isNotificationPreferenceEnabled, ensureVaultNotificationChannel, VAULT_NOTIFICATION_CHANNEL_ID } from '@/lib/notifications';
import { isVaultNotificationCategoryEnabled } from '@/lib/notification-preferences';
import { reconcileVaultNotificationSet, VAULT_NOTIFICATION_FINGERPRINT, vaultNotificationFingerprint } from '@/lib/notification-reconciliation';
import { readQuietHoursM115, quietAtM115, type QuietHoursM115 } from '@/lib/health-reminders/quiet-hours-m115';
import type { ExamWorkspaceM2, ExamReminderPlanM2 } from './domain';
import { planExamRemindersM2 } from './domain';

export const M2_NOTICE_MARKER='vaultM2ExamSession';
const FIRST_ID=1_770_000_000, MAX_IDS=100_000_000;
const hash=(s:string):number=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
export function examReminderNativeIdM2(key:string):number{return FIRST_ID+(hash(key)%MAX_IDS);}

export function adjustQuietM2(instant:number,quiet:QuietHoursM115):{at:number;advanced:boolean}{
  const at=new Date(instant);
  if(!quietAtM115(at,quiet))return {at:instant,advanced:false};
  const startH=Number(quiet.start.slice(0,2)),startM=Number(quiet.start.slice(3));
  const begin=startH*60+startM, minute=at.getHours()*60+at.getMinutes();
  const endMinute=Number(quiet.end.slice(0,2))*60+Number(quiet.end.slice(3));
  const beganPreviousDay=begin>endMinute&&minute<endMinute;
  at.setHours(startH,startM,0,0);
  if(beganPreviousDay)at.setDate(at.getDate()-1);
  at.setMinutes(at.getMinutes()-5);
  return {at:at.getTime(),advanced:true};
}

export async function checkExamNotificationStateM2():Promise<'web'|'disabled'|'denied'|'exact'|'approximate'>{
  if(!isVaultNative())return 'web';
  if(!isNotificationPreferenceEnabled()||!isVaultNotificationCategoryEnabled('exames'))return 'disabled';
  try{
    const permitted=await LocalNotifications.checkPermissions();
    if(permitted.display!=='granted')return 'denied';
    const exact=await LocalNotifications.checkExactNotificationSetting();
    return exact.exact_alarm==='granted'?'exact':'approximate';
  }catch{return 'approximate';}
}

/** Only called by an explicit user tap; never silently opens Android settings. */
export async function requestExactExamAlarmsM2():Promise<void>{
  if(!isVaultNative())return;
  await LocalNotifications.changeExactNotificationSetting();
}

export async function reconcileExamSessionNotificationsM2(
  rows:readonly ExamWorkspaceM2[], now:number=Date.now()
):Promise<{scheduled:number;mode:string;collisions:number}>{
  if(!isVaultNative())return {scheduled:0,mode:'web',collisions:0};
  const owns=(n:{extra?:Record<string,unknown>})=>n.extra?.[M2_NOTICE_MARKER]===true;
  const mode=await checkExamNotificationStateM2();
  if(mode==='denied'||mode==='disabled'){
    await reconcileVaultNotificationSet([],owns);
    return {scheduled:0,mode,collisions:0};
  }
  const existing=await LocalNotifications.getPending();
  const foreign=new Set(existing.notifications.filter(n=>!owns(n as {extra?:Record<string,unknown>})).map(n=>n.id));
  const desired:LocalNotificationSchema[]=[];
  const reserved=new Set<number>();let collisions=0;
  const quiet=readQuietHoursM115();
  const plan=planExamRemindersM2(rows,now);
  // Sort by stable semantic key so collisions resolve deterministically on every device.
  const sorted=[...plan].sort((a,b)=>a.key.localeCompare(b.key));
  for(const item of sorted){
    const shifted=adjustQuietM2(item.at,quiet);
    if(shifted.at<=now)continue;
    let id=examReminderNativeIdM2(item.key);
    let probes=0;
    while((foreign.has(id)||reserved.has(id))&&probes<MAX_IDS){id=FIRST_ID+((id-FIRST_ID+1)%MAX_IDS);probes++;}
    if(probes>=MAX_IDS)throw Error('Faixa de IDs de exames esgotada.');
    if(probes>0)collisions++;
    reserved.add(id);
    const suffix=shifted.advanced?' Aviso antecipado para respeitar o horário de silêncio.':'';
    desired.push({
      id,title:item.title,body:`Sessão registrada no VAULT.${suffix}`,
      channelId:VAULT_NOTIFICATION_CHANNEL_ID,
      schedule:{at:new Date(shifted.at),allowWhileIdle:true},
      extra:{[M2_NOTICE_MARKER]:true,type:'health_event',eventKind:'exame_m2',
        eventId:item.sessionId,userId:item.key.split(':')[0],personId:item.key.split(':')[1],
        targetRoute:item.targetRoute,
        [VAULT_NOTIFICATION_FINGERPRINT]:vaultNotificationFingerprint([item.key,item.at,shifted.at,item.title]),
      },
    });
  }
  await ensureVaultNotificationChannel();
  // Native reconciliation serializes with medication/event schedulers; only owned IDs may be cancelled.
  const result=await reconcileVaultNotificationSet(desired.slice(0,60),owns);
  return {scheduled:result.desired,mode,collisions};
}
