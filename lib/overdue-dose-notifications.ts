import { LocalNotifications } from "@capacitor/local-notifications";
import { isVaultNative } from "@/lib/native-runtime";
import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import { getVaultNotificationBrainSettings } from "@/lib/notification-brain";
import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";
import type { DoseLog, Medicamento } from "@/lib/types";

const ACTION_TYPE_ID = "DOSE_REMINDER_ACTIONS";
const HORIZON_DAYS = 7;
const MAX_PENDING_OVERDUE = 80;
// VAULT_SMART_OVERDUE_ESCALATION_V52

function hashToId(value:string){let hash=0;for(let i=0;i<value.length;i+=1){hash=(hash<<5)-hash+value.charCodeAt(i);hash|=0;}return ((hash>>>0)%2147483646)+1;}
function normalizeHorario(value:string):string|null{const m=/^(\d{1,2}):(\d{2})$/.exec(value.trim());if(!m)return null;const h=Number(m[1]),min=Number(m[2]);if(!Number.isInteger(h)||!Number.isInteger(min)||h<0||h>23||min<0||min>59)return null;return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;}
function localDateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function addLocalDays(base:Date,days:number){const d=new Date(base);d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d;}
function dateAt(data:string,horario:string):Date|null{const d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(data),h=/^(\d{2}):(\d{2})$/.exec(horario);if(!d||!h)return null;const result=new Date(+d[1],+d[2]-1,+d[3],+h[1],+h[2],0,0);return Number.isNaN(result.getTime())?null:result;}
function slotKey(personId:string,medicamentoId:string,data:string,horario:string){return `${personId}:${medicamentoId}:${data}:${horario}`;}
export function getOverdueDoseNotificationId(personId:string,medicamentoId:string,data:string,horario:string,offsetMinutes=30){return hashToId(`dose-overdue:v52:${slotKey(personId,medicamentoId,data,horario)}:${offsetMinutes}`);}
function isResolved(logs:DoseLog[],personId:string,medicamentoId:string,data:string,horario:string){return logs.some(log=>log.person_id===personId&&log.medicamento_id===medicamentoId&&log.data===data&&log.horario===horario&&Boolean(log.tomado_em||log.ignorado_em));}
function eligible(med:Medicamento,personId:string){return Boolean(med.id)&&med.person_id===personId&&med.status!=="descontinuado"&&med.tipo_uso!=="sos"&&med.tipo_uso!=="esporadico"&&Array.isArray(med.estoque_horarios)&&med.estoque_horarios.length>0;}
async function cancelIds(ids:number[]){if(!ids.length)return;await LocalNotifications.cancel({notifications:Array.from(new Set(ids)).map(id=>({id}))});}

export async function cancelOverdueDoseNotification(input:{personId:string;medicamentoId:string;data:string;horario:string}){
  if(!isVaultNative())return;
  try{
    const pending=await LocalNotifications.getPending();
    const ids=pending.notifications.filter((n)=>{const e=n.extra as Record<string,unknown>|undefined;return e?.type==="dose_overdue"&&e?.personId===input.personId&&e?.medicamentoId===input.medicamentoId&&e?.data===input.data&&e?.horario===input.horario;}).map(n=>n.id);
    await cancelIds(ids);
  }catch(error){console.error("[overdue-dose] cancel slot:",error);}
}
export async function cancelAllOverdueDoseNotifications(){if(!isVaultNative())return;try{const pending=await LocalNotifications.getPending();await cancelIds(pending.notifications.filter(n=>(n.extra as Record<string,unknown>|undefined)?.type==="dose_overdue").map(n=>n.id));}catch(error){console.error("[overdue-dose] cancel all:",error);}}

export async function reconcileOverdueDoseNotifications(input:{personId:string;medicamentos:Medicamento[];logs:DoseLog[];now?:Date;}){
  if(!isVaultNative())return;
  const personId=input.personId.trim();if(!personId)return;
  const pending=await LocalNotifications.getPending();
  const existing=pending.notifications.filter(n=>(n.extra as Record<string,unknown>|undefined)?.type==="dose_overdue");
  if(!isNotificationPreferenceEnabled()||!isVaultNotificationCategoryEnabled("doses")){await cancelIds(existing.map(n=>n.id));return;}
  const permission=await LocalNotifications.checkPermissions();if(permission.display!=="granted")return;
  await ensureVaultNotificationChannel();
  const now=input.now??new Date();
  const offsets=getVaultNotificationBrainSettings().doseOverdueOffsets.slice().sort((a,b)=>a-b);
  const desired=new Map<number,{id:number;title:string;body:string;at:Date;personId:string;medicamentoId:string;data:string;horario:string;offsetMinutes:number}>();
  for(let day=0;day<HORIZON_DAYS;day+=1){
    const data=localDateKey(addLocalDays(now,day));
    for(const med of input.medicamentos.filter(m=>eligible(m,personId))){
      const medicamentoId=med.id!;
      const horarios=Array.from(new Set((med.estoque_horarios||[]).map(normalizeHorario).filter((v):v is string=>Boolean(v))));
      for(const horario of horarios){
        if(isResolved(input.logs,personId,medicamentoId,data,horario))continue;
        const base=dateAt(data,horario);if(!base)continue;
        for(const offsetMinutes of offsets){
          const at=new Date(base.getTime()+offsetMinutes*60000);
          if(at<=now)continue;
          const id=getOverdueDoseNotificationId(personId,medicamentoId,data,horario,offsetMinutes);
          desired.set(id,{id,title:`Dose pendente: ${med.nome}`,body:`A dose de ${horario} continua pendente. Marque como tomada ou ignorada.`,at,personId,medicamentoId,data,horario,offsetMinutes});
          if(desired.size>=MAX_PENDING_OVERDUE)break;
        }
        if(desired.size>=MAX_PENDING_OVERDUE)break;
      }
      if(desired.size>=MAX_PENDING_OVERDUE)break;
    }
    if(desired.size>=MAX_PENDING_OVERDUE)break;
  }
  await cancelIds(existing.filter(n=>!desired.has(n.id)).map(n=>n.id));
  const existingIds=new Set(existing.map(n=>n.id));
  const fresh=Array.from(desired.values()).filter(x=>!existingIds.has(x.id));
  if(!fresh.length)return;
  await LocalNotifications.schedule({notifications:fresh.map(x=>({id:x.id,title:x.title,body:x.body,channelId:VAULT_NOTIFICATION_CHANNEL_ID,actionTypeId:ACTION_TYPE_ID,schedule:{at:x.at,allowWhileIdle:true},extra:{type:"dose_overdue",medicamentoId:x.medicamentoId,personId:x.personId,horario:x.horario,data:x.data,offsetMinutes:x.offsetMinutes,targetRoute:`/saude/medicamentos/detalhes?id=${encodeURIComponent(x.medicamentoId)}`}}))});
}
