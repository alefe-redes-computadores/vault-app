import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { HealthReminderRule } from "./types";

const DAYS_AHEAD=21;
const MAX_PENDING=60;
const CHANNEL_ID="vault-health-reminders";
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h%2147483000)+1}
function dateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function occurrences(rule:HealthReminderRule){const [hour,minute]=rule.time.split(":").map(Number);if(!Number.isInteger(hour)||!Number.isInteger(minute))return [];const now=new Date();const out:Date[]=[];for(let offset=0;offset<=DAYS_AHEAD;offset++){const d=new Date(now);d.setDate(now.getDate()+offset);d.setHours(hour,minute,0,0);const allowed=rule.frequency==="daily"||rule.weekdays.length===0||rule.weekdays.includes(d.getDay());if(allowed&&d>now)out.push(d)}return out}
export function notificationId(ruleId:string,date:Date){return hash(`${ruleId}:${dateKey(date)}:${date.getHours()}:${date.getMinutes()}`)}
export async function reconcileHealthReminderNotifications(rules:HealthReminderRule[]){
  if(!Capacitor.isNativePlatform())return{native:false,scheduled:0};
  const pending=await LocalNotifications.getPending();
  const ours=pending.notifications.filter(n=>(n.extra as {vaultHealthReminder?:boolean}|undefined)?.vaultHealthReminder).map(n=>({id:n.id}));
  if(ours.length)await LocalNotifications.cancel({notifications:ours});
  const active=rules.filter(r=>r.status==="active");
  if(!active.length)return{native:true,scheduled:0};
  let permission=await LocalNotifications.checkPermissions();
  if(permission.display!=="granted")permission=await LocalNotifications.requestPermissions();
  if(permission.display!=="granted")return{native:true,scheduled:0};
  await LocalNotifications.createChannel({id:CHANNEL_ID,name:"Lembretes de saúde",description:"Lembretes configurados por você no Vault",importance:4,visibility:1,vibration:true}).catch(()=>undefined);
  const notifications=active.flatMap(rule=>occurrences(rule).map(at=>({rule,at}))).sort((a,b)=>a.at.getTime()-b.at.getTime()).slice(0,MAX_PENDING).map(({rule,at})=>({id:notificationId(rule.id,at),title:rule.title,body:rule.body||"Hora de registrar no Vault.",channelId:CHANNEL_ID,schedule:{at,allowWhileIdle:true},extra:{vaultHealthReminder:true,reminderId:rule.id,personId:rule.person_id,targetRoute:rule.target_route,type:"health_reminder"}}));
  if(notifications.length)await LocalNotifications.schedule({notifications});
  return{native:true,scheduled:notifications.length};
}
