import type { RegistroSaude } from "@/lib/types";
import { buildHealthFactorTrend, FACTOR_LABELS, type HealthFactor } from "./health-factor-trends";

export type CautiousAssociation = {
  id: string; factors: [HealthFactor, HealthFactor]; pairedDays: number;
  coefficient: number; strength: "leve" | "moderada" | "forte";
  direction: "juntas" | "opostas"; message: string;
};
const pairs: Array<[HealthFactor, HealthFactor]> = [["sono","humor"],["sono","sintoma"],["caminhada","humor"],["caminhada","sintoma"],["humor","sintoma"]];
function pearson(points:Array<[number,number]>):number {
  const n=points.length,mx=points.reduce((s,p)=>s+p[0],0)/n,my=points.reduce((s,p)=>s+p[1],0)/n;
  const top=points.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0),dx=Math.sqrt(points.reduce((s,p)=>s+(p[0]-mx)**2,0)),dy=Math.sqrt(points.reduce((s,p)=>s+(p[1]-my)**2,0));
  return dx&&dy?top/(dx*dy):0;
}
/** Descriptive co-variation only. It never labels cause, diagnosis or treatment effect. */
export function buildCautiousAssociations(input:{records:RegistroSaude[];userId:string;personId:string;today:string;days?:7|30|90}):CautiousAssociation[]{
  const days=input.days??30, cache=new Map<HealthFactor,ReturnType<typeof buildHealthFactorTrend>>();
  const trend=(factor:HealthFactor)=>{const found=cache.get(factor);if(found)return found;const value=buildHealthFactorTrend({...input,days,factor});cache.set(factor,value);return value;};
  return pairs.flatMap(([a,b])=>{
    const byDate=new Map(trend(b).days.map(d=>[d.date,d.value]));
    const points=trend(a).days.flatMap(d=>d.value===null||byDate.get(d.date)===null||byDate.get(d.date)===undefined?[]:[[d.value,byDate.get(d.date)!] as [number,number]]);
    if(points.length<5)return [];
    const coefficient=Math.round(pearson(points)*100)/100,absolute=Math.abs(coefficient);
    if(absolute<.3)return [];
    const strength=absolute>=.7?"forte":absolute>=.5?"moderada":"leve";
    const direction=coefficient>=0?"juntas":"opostas";
    return [{id:`${a}:${b}`,factors:[a,b] as [HealthFactor,HealthFactor],pairedDays:points.length,coefficient,strength:strength as CautiousAssociation["strength"],direction:direction as CautiousAssociation["direction"],
      message:`Nos ${points.length} dias com os dois dados, ${FACTOR_LABELS[a].label.toLowerCase()} e ${FACTOR_LABELS[b].label.toLowerCase()} tenderam a variar em direções ${direction}.`}];
  }).sort((a,b)=>Math.abs(b.coefficient)-Math.abs(a.coefficient)).slice(0,3);
}
