import type { RegistroSaude } from "@/lib/types";
import type { HealthMetric } from "./types";
export function summarizeHealthDay(records:RegistroSaude[],date:string){
  const groups=new Map<HealthMetric,RegistroSaude[]>();let imported=0,manual=0,unknown=0;
  for(const record of records){if(record.data!==date)continue;
    const key=record.tipo as HealthMetric,group=groups.get(key);if(group)group.push(record);else groups.set(key,[record]);
    if(record.source==="health_connect")imported++;else if(record.source==="manual"||record.source==="samsung_manual")manual++;else unknown++;
  }
  return {groups,imported,manual,unknown,total:imported+manual+unknown};
}
export function adjacentHealthDays(records:RegistroSaude[],date:string,today:string){
  let previous:string|null=null,next:string|null=null;
  for(const record of records){const day=record.data;if(day>today)continue;if(day<date&&(!previous||day>previous))previous=day;if(day>date&&(!next||day<next))next=day;}
  return {previous,next};
}
