import { LocalNotifications } from "@capacitor/local-notifications";
import { isVaultNative } from "@/lib/native-runtime";
import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";
import type { DoseLog, Medicamento } from "@/lib/types";

const ACTION_TYPE_ID = "DOSE_REMINDER_ACTIONS";
const OVERDUE_DELAY_MINUTES = 30;
const HORIZON_DAYS = 7;
const MAX_PENDING_OVERDUE = 40;
const MARKER_PREFIX = "vault:dose-overdue:v43:";

function hashToId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return ((hash >>> 0) % 2147483646) + 1;
}
function normalizeHorario(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
}
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function addLocalDays(base: Date, days: number): Date {
  const d = new Date(base); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return d;
}
function dateAt(data: string, horario: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data), h = /^(\d{2}):(\d{2})$/.exec(horario);
  if (!d || !h) return null;
  const result = new Date(+d[1], +d[2]-1, +d[3], +h[1], +h[2], 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}
function slotKey(personId:string, medicamentoId:string, data:string, horario:string) {
  return `${personId}:${medicamentoId}:${data}:${horario}`;
}
export function getOverdueDoseNotificationId(personId:string, medicamentoId:string, data:string, horario:string): number {
  return hashToId(`dose-overdue:${slotKey(personId,medicamentoId,data,horario)}`);
}
function markerKey(personId:string, medicamentoId:string, data:string, horario:string) {
  return `${MARKER_PREFIX}${slotKey(personId,medicamentoId,data,horario)}`;
}
function wasAlreadyScheduled(personId:string, medicamentoId:string, data:string, horario:string): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(markerKey(personId,medicamentoId,data,horario)) === "1"; } catch { return false; }
}
function markScheduled(personId:string, medicamentoId:string, data:string, horario:string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(markerKey(personId,medicamentoId,data,horario),"1"); } catch {}
}
function isResolved(logs:DoseLog[], personId:string, medicamentoId:string, data:string, horario:string): boolean {
  return logs.some(log =>
    log.person_id === personId &&
    log.medicamento_id === medicamentoId &&
    log.data === data &&
    log.horario === horario &&
    Boolean(log.tomado_em || log.ignorado_em)
  );
}
function eligible(med:Medicamento, personId:string): boolean {
  return Boolean(med.id) && med.person_id === personId && med.status !== "descontinuado" &&
    med.tipo_uso !== "sos" && med.tipo_uso !== "esporadico" &&
    Array.isArray(med.estoque_horarios) && med.estoque_horarios.length > 0;
}
async function cancelIds(ids:number[]) {
  if (!ids.length) return;
  await LocalNotifications.cancel({notifications:Array.from(new Set(ids)).map(id=>({id}))});
}
export async function cancelOverdueDoseNotification(input:{personId:string;medicamentoId:string;data:string;horario:string}) {
  if (!isVaultNative()) return;
  try { await cancelIds([getOverdueDoseNotificationId(input.personId,input.medicamentoId,input.data,input.horario)]); }
  catch(error){ console.error("[overdue-dose] cancel slot:",error); }
}
export async function cancelAllOverdueDoseNotifications() {
  if (!isVaultNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    await cancelIds(pending.notifications.filter(n => (n.extra as Record<string,unknown>|undefined)?.type === "dose_overdue").map(n=>n.id));
  } catch(error){ console.error("[overdue-dose] cancel all:",error); }
}

export async function reconcileOverdueDoseNotifications(input:{
  personId:string; medicamentos:Medicamento[]; logs:DoseLog[]; now?:Date;
}) {
  if (!isVaultNative()) return;
  const personId=input.personId.trim(); if(!personId) return;

  if (!isNotificationPreferenceEnabled() || !isVaultNotificationCategoryEnabled("doses")) {
    await cancelAllOverdueDoseNotifications(); return;
  }
  const permission=await LocalNotifications.checkPermissions();
  if(permission.display !== "granted") return;
  await ensureVaultNotificationChannel();

  const now=input.now ?? new Date();
  const meds=input.medicamentos.filter(m=>eligible(m,personId));
  const desired=new Map<number,{id:number;title:string;body:string;at:Date;personId:string;medicamentoId:string;data:string;horario:string}>();

  for(let offset=0;offset<HORIZON_DAYS;offset++){
    const data=localDateKey(addLocalDays(now,offset));
    for(const med of meds){
      const medicamentoId=med.id!;
      const horarios=Array.from(new Set((med.estoque_horarios||[]).map(normalizeHorario).filter((v):v is string=>Boolean(v))));
      for(const horario of horarios){
        if(isResolved(input.logs,personId,medicamentoId,data,horario)) continue;
        const base=dateAt(data,horario); if(!base) continue;
        const overdueAt=new Date(base.getTime()+OVERDUE_DELAY_MINUTES*60000);
        let at=overdueAt;
        if(overdueAt.getTime()<=now.getTime()){
          if(offset!==0 || wasAlreadyScheduled(personId,medicamentoId,data,horario)) continue;
          at=new Date(now.getTime()+5000);
        }
        const id=getOverdueDoseNotificationId(personId,medicamentoId,data,horario);
        desired.set(id,{
          id,title:`Dose pendente: ${med.nome}`,
          body:`O horário de ${horario} passou e esta dose ainda não foi marcada como tomada ou ignorada.`,
          at,personId,medicamentoId,data,horario
        });
        if(desired.size>=MAX_PENDING_OVERDUE) break;
      }
      if(desired.size>=MAX_PENDING_OVERDUE) break;
    }
    if(desired.size>=MAX_PENDING_OVERDUE) break;
  }

  const pending=await LocalNotifications.getPending();
  const existing=pending.notifications.filter(n => (n.extra as Record<string,unknown>|undefined)?.type === "dose_overdue");
  await cancelIds(existing.filter(n=>!desired.has(n.id)).map(n=>n.id));
  const existingIds=new Set(existing.map(n=>n.id));
  const fresh=Array.from(desired.values()).filter(x=>!existingIds.has(x.id));
  if(!fresh.length) return;

  await LocalNotifications.schedule({notifications:fresh.map(x=>({
    id:x.id,title:x.title,body:x.body,channelId:VAULT_NOTIFICATION_CHANNEL_ID,actionTypeId:ACTION_TYPE_ID,
    schedule:{at:x.at,allowWhileIdle:true},
    extra:{type:"dose_overdue",medicamentoId:x.medicamentoId,personId:x.personId,horario:x.horario,data:x.data}
  }))});
  fresh.forEach(x=>markScheduled(x.personId,x.medicamentoId,x.data,x.horario));
}
