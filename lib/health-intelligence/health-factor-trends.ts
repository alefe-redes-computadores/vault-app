import type { RegistroSaude } from "@/lib/types";
export type HealthFactor = "sono"|"caminhada"|"sintoma"|"humor";
export const FACTOR_LABELS: Record<HealthFactor,{label:string;unit:string}> = { sono:{label:"Sono registrado",unit:"min"}, caminhada:{label:"Caminhada registrada",unit:"min"}, sintoma:{label:"Intensidade dos sintomas",unit:"/10"}, humor:{label:"Humor declarado",unit:"/10"} };
export type TrendDay = {date:string;value:number|null;records:number};
export type TrendResult = {factor:HealthFactor;days:TrendDay[];samples:number;documentedDays:number;mean:number|null;max:number|null;unit:string;description:string};
const DAY = 86_400_000;
export function dateAsUtc(value:string):number|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split("-").map(Number),stamp=Date.UTC(y,m-1,d),check=new Date(stamp);
 return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d?stamp:null;
}
function key(ms:number){return new Date(ms).toISOString().slice(0,10)}
function factorValue(row:RegistroSaude,factor:HealthFactor):number|null {
 if(factor==="sono" || factor==="caminhada"){
   if(row.tipo!==factor)return null;
   const value=row.duracao_minutos;
   return typeof value==="number" && Number.isFinite(value)&&value>0&&value<=1440?value:null;
 }
 if(factor==="sintoma" && row.categoria!=="sintoma")return null;
 if(factor==="humor" && row.categoria!=="humor")return null;
 const value=factor==="humor" && typeof row.intensidade!=="number" ? row.valor_numerico : row.intensidade;
 return typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=10?value:null;
}
export function buildHealthFactorTrend(input:{records:RegistroSaude[];userId:string;personId:string;today:string;days?:number;factor:HealthFactor}):TrendResult {
 const {factor}=input;
 const length=input.days===undefined?30:Math.min(90,Math.max(1,Math.floor(input.days)));
 const result:TrendResult={factor,days:[],samples:0,documentedDays:0,mean:null,max:null,unit:factor==="sono"||factor==="caminhada"?"min":"/10",description:"Somente registros documentados; ausência não é zero."};
 const today=dateAsUtc(input.today);
 if(today===null || !input.personId?.trim() || !input.userId?.trim())return result;
 const grouped=new Map<string,number[]>();
 const seen=new Set<string>();
 for(const r of input.records){
  if(r.person_id!==input.personId||r.user_id!==input.userId)continue;
  const date=dateAsUtc(r.data);
  if(date===null||date>today||date<today-(length-1)*DAY)continue;
  const value=factorValue(r,factor);
  if(value===null)continue;
  const dedupeKey=r.id||r.source_record_id||`${r.data}:${r.horario}:${r.tipo}:${r.nome}:${value}`;
  if(seen.has(dedupeKey))continue;seen.add(dedupeKey);
  const vals=grouped.get(r.data)||[];vals.push(value);grouped.set(r.data,vals);
 }
 const all:number[]=[];
 for(let i=length-1;i>=0;i--){
  const date=key(today-i*DAY),values=grouped.get(date)||[];
  // Sleep: principal night, not a sum of naps from multiple devices.
  // Other factors: average of valid records on that day.
  const val=values.length?((factor==="sono"||factor==="caminhada")?Math.max(...values):values.reduce((a,b)=>a+b,0)/values.length):null;
  result.days.push({date,value:val===null?null:Math.round(val*10)/10,records:values.length});
  if(val!==null)all.push(val);
  result.samples+=values.length;
 }
 result.documentedDays=all.length;
 if(all.length){result.mean=Math.round(all.reduce((a,b)=>a+b,0)/all.length*10)/10;result.max=Math.max(...all);}
 return result;
}
