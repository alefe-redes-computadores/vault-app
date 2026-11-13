/** V8 P2 — Pure presentation of already scoped V8 evidence; never imputes missing days. */
import type { AxisSeriesV8, StudioSnapshotV8, VitalWitnessV8 } from './visual-studio-v8';
import { shiftBrainDayV7, validBrainDayV7 } from './brain-v7-universal';

export type AxisCalendarCellV8P2 = Readonly<{
  day: string; value: number | null; time: string | null;
  source: string | null; recorded: boolean;
}>;
export type AxisCalendarV8P2 = Readonly<{
  label: string; kind: AxisSeriesV8['kind']; days: readonly AxisCalendarCellV8P2[];
  recordedDays: number; missingDays: number; latest: AxisCalendarCellV8P2 | null;
  minimum: number | null; maximum: number | null; median: number | null;
}>;

function validAxisPoint(p: AxisSeriesV8['points'][number], first: string, last: string): boolean {
  return validBrainDayV7(p.day) && p.day >= first && p.day <= last &&
    typeof p.value === 'number' && Number.isInteger(p.value) && p.value >= 0 && p.value <= 10;
}

export function projectAxisCalendarV8P2(snapshot: StudioSnapshotV8, axis: AxisSeriesV8, days: 7 | 14 | 30): AxisCalendarV8P2 {
  const blank: AxisCalendarV8P2={label:axis.label,kind:axis.kind,days:[],recordedDays:0,missingDays:0,latest:null,minimum:null,maximum:null,median:null};
  if (!snapshot.authorized || !validBrainDayV7(snapshot.day) || ![7,14,30].includes(days)) return blank;
  const first=shiftBrainDayV7(snapshot.day,1-days);
  // If duplicate dates appear in a projected input, keep the latest documented time, not an average.
  const byDay=new Map<string,AxisSeriesV8['points'][number]>();
  for(const p of axis.points){
    if(!validAxisPoint(p,first,snapshot.day))continue;
    const prior=byDay.get(p.day);
    if(!prior || (p.time||'') >= (prior.time||''))byDay.set(p.day,p);
  }
  const calendar:AxisCalendarCellV8P2[]=Array.from({length:days},(_,i)=>{
    const day=shiftBrainDayV7(first,i),r=byDay.get(day);
    return {day,value:r?.value??null,time:r?.time||null,source:r?.source||null,recorded:Boolean(r)};
  });
  const observed=calendar.filter(x=>x.recorded);
  const sorted=observed.map(x=>x.value!).sort((a,b)=>a-b);
  const midpoint=Math.floor(sorted.length/2);
  const median=sorted.length===0?null:sorted.length%2?sorted[midpoint]:(sorted[midpoint-1]+sorted[midpoint])/2;
  return {label:axis.label,kind:axis.kind,days:calendar,recordedDays:observed.length,
    missingDays:days-observed.length,latest:observed.at(-1)||null,
    minimum:sorted[0]??null,maximum:sorted.at(-1)??null,median};
}

export type VitalProvenanceV8P2 = Readonly<{
  key:VitalWitnessV8['tipo'];value:string;day:string;source:string;
  deviceName:string|null;hasLinkedDevice:boolean;
}>;
/** Preserve the distinction between a registered device and a measurement linked to it. */
export function projectVitalsProvenanceV8P2(snapshot:StudioSnapshotV8):readonly VitalProvenanceV8P2[]{
  if(!snapshot.authorized)return [];
  return snapshot.vitals.filter(v=>validBrainDayV7(v.day)&&v.day<=snapshot.day)
    .map(v=>({key:v.tipo,value:v.value,day:v.day,source:v.source,
      deviceName:v.deviceName||null,hasLinkedDevice:Boolean(v.deviceName)}));
}
