import type { DoseLog } from "@/lib/types";

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
  const taken=records.some(row=>Boolean(row.tomado_em));
  const ignored=records.some(row=>Boolean(row.ignorado_em));
  const latest=records.reduce<DoseLog|null>((current,row)=>!current||String(row.updated_at||row.created_at||"")>String(current.updated_at||current.created_at||"")?row:current,null);
  return {state:taken&&ignored?"conflict":taken?"taken":ignored?"ignored":"pending",records,latest};
}

export const doseSlotIsResolved=(snapshot:DoseSlotSnapshot)=>snapshot.state==="taken"||snapshot.state==="ignored"||snapshot.state==="conflict";
