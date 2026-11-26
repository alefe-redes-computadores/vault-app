import type { DoseLog } from "@/lib/types";

/** Realization evidence is independent of dose_kind. Never guess a timezone or normalize an impossible date. */
export function doseConfirmationInstant(value:unknown):string|null {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)||value.endsWith("-00:00"))return null;
  const day=value.slice(0,10),civil=new Date(day+"T00:00:00Z");
  return !day.startsWith("0000")&&Number.isFinite(civil.getTime())&&civil.toISOString().slice(0,10)===day&&Number.isFinite(Date.parse(value))?value:null;
}
export type DoseRealization={state:"taken"|"ignored"|"pending"|"conflict"|"unknown";confirmedAt:string|null};
export function classifyDoseRealization(row:{tomado_em?:unknown;ignorado_em?:unknown}):DoseRealization {
  const present=(v:unknown)=>v!==undefined&&v!==null&&v!=="";
  const taken=present(row.tomado_em),ignored=present(row.ignorado_em);
  if(taken&&ignored)return {state:"conflict",confirmedAt:null};
  if(!taken&&!ignored)return {state:"pending",confirmedAt:null};
  const confirmedAt=doseConfirmationInstant(taken?row.tomado_em:row.ignorado_em);
  return confirmedAt?{state:taken?"taken":"ignored",confirmedAt}:{state:"unknown",confirmedAt:null};
}

export type DoseSlotState="absent"|"pending"|"taken"|"ignored"|"conflict";
export type DoseSlotSnapshot={state:DoseSlotState;records:DoseLog[];latest:DoseLog|null};
export type DoseSlotIndex=Map<string,DoseLog[]>;
const TIME_RE=/^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
export const doseSlotKey=(medicationId:string,date:string,time:string)=>`${medicationId}|${date}|${time.slice(0,5)}`;
const scheduleLike=(row:DoseLog)=>!row.dose_kind||row.dose_kind==="scheduled"||row.dose_kind==="planned";

/** One account/person-scoped projection reused by UI and native reminders. */
export function buildDoseSlotIndex(logs:readonly DoseLog[],scope?:{userId?:string;personId?:string}):DoseSlotIndex{
  const index:DoseSlotIndex=new Map();
  for(const row of logs){
    if(scope?.userId&&row.user_id!==scope.userId)continue;
    if(scope?.personId&&row.person_id!==scope.personId)continue;
    if(!row.medicamento_id||!DATE_RE.test(row.data)||!TIME_RE.test(String(row.horario||"").slice(0,5))||!scheduleLike(row))continue;
    const key=doseSlotKey(row.medicamento_id,row.data,String(row.horario));
    const group=index.get(key)||[];group.push(row);index.set(key,group);
  }
  return index;
}

export function resolveDoseSlot(index:DoseSlotIndex,medicationId:string,date:string,time:string):DoseSlotSnapshot{
  const records=index.get(doseSlotKey(medicationId,date,time))||[];
  if(!records.length)return {state:"absent",records,latest:null};
  // M23: one scan preserves taken+ignored conflicts and latest-row tie order.
  let taken=false,ignored=false,invalid=false,latest:DoseLog|null=null;
  for(const row of records){
    const evidence=classifyDoseRealization(row);
    if(evidence.state==='taken')taken=true;
    if(evidence.state==='ignored')ignored=true;
    if(evidence.state==='conflict'||evidence.state==='unknown')invalid=true;
    if(!latest||String(row.updated_at||row.created_at||"")>String(latest.updated_at||latest.created_at||""))latest=row;
  }
  return {state:invalid||taken&&ignored?"conflict":taken?"taken":ignored?"ignored":"pending",records,latest};
}

export const doseSlotIsResolved=(snapshot:DoseSlotSnapshot)=>snapshot.state==="taken"||snapshot.state==="ignored"||snapshot.state==="conflict";
