import type { RegistroSaude } from "@/lib/types";
import { validDate } from "./metrics";
import { healthReadingValue } from "./avatar-readings";
import type { HealthMetric } from "./types";
export type MetricPeriod = "today" | "7" | "30" | "all";
/** Civil dates, including the selected day; missing days are never synthesized. */
export function selectMetricHistory(records: RegistroSaude[], type: HealthMetric, today: string, period: MetricPeriod) {
  if(!validDate(today))return [];
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - (period === "7" ? 6 : 29));
  const since = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  return records.filter(r => r.tipo === type && validDate(r.data) && r.data <= today && (period === "all" || (period === "today" ? r.data === today : r.data >= since)))
    .sort((a,b) => `${b.data}T${b.horario || "00:00"}`.localeCompare(`${a.data}T${a.horario || "00:00"}`));
}

/** Open the shortest existing period containing a valid observation. */
export function metricOpeningPeriod(records:RegistroSaude[],type:HealthMetric,today:string):MetricPeriod {
 const latest=selectMetricHistory(records,type,today,'all').find(r=>healthReadingValue(r)!==null);
 if(!latest)return 'today';
 for(const period of ['today','7','30','all'] as const){
  if(selectMetricHistory([latest],type,today,period).length)return period;
 }
 return 'today';
}

export function readingRecency(date:string,today:string):string|null {
 if(!validDate(date)||!validDate(today)||date>today)return null;
 const day=(v:string)=>{const [y,m,d]=v.split('-').map(Number);return Date.UTC(y,m-1,d);};
 const days=Math.round((day(today)-day(date))/86400000);
 return days===0?'Hoje':days===1?'Ontem':`Há ${days} dias`;
}
