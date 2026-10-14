import type { RegistroSaude } from '@/lib/types';
import { METRICS,type HealthMetric,type HealthDevice } from './types';
import { validDate,validateMetric } from './metrics';
export function healthReadingSource(source?:string|null) {
 return source==='health_connect'?'Health Connect':source==='samsung_manual'?'Samsung Health · manual':source==='manual'?'Registro manual':'Origem não informada';
}
export function healthReadingValue(r:RegistroSaude):string|null {
 if(!Object.hasOwn(METRICS,r.tipo))return null;const type=r.tipo as HealthMetric;
 if(r.unidade_medida?.trim().toLowerCase()!==METRICS[type].unit.toLowerCase())return null;
  let value:string;
  try{
   if(type==='pressao_arterial'){const m=r.valor_medicao?.match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})(?:\s*mmHg)?\s*$/i);if(!m)return null;validateMetric(type,Number(m[1]),Number(m[2]));value=`${m[1]}/${m[2]} mmHg`;}
   else {const n=(type==='sono'||type==='caminhada')?r.duracao_minutos??r.valor_numerico:r.valor_numerico;if(typeof n!=='number')return null;validateMetric(type,n);value=`${n.toLocaleString('pt-BR')} ${METRICS[type].unit}`;}
  }catch{return null;}
 return value;
}
export function latestAvatarReadings(records:RegistroSaude[],devices:HealthDevice[],pid:string,uid:string,today:string) {
 const latest=new Map<HealthMetric,{record:RegistroSaude;value:string;source:string;device?:HealthDevice}>();
 if(!pid||!uid||!validDate(today))return latest;
 const own=records.filter(r=>r.person_id===pid&&r.user_id===uid&&validDate(r.data)&&r.data<=today)
  .sort((a,b)=>`${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`)||(b.id||'').localeCompare(a.id||''));
 for(const r of own){
  if(!Object.hasOwn(METRICS,r.tipo))continue;const type=r.tipo as HealthMetric;
  if(latest.has(type)||r.unidade_medida?.trim().toLowerCase()!==METRICS[type].unit.toLowerCase())continue;
  const value=healthReadingValue(r);if(value===null)continue;
  const device=devices.find(d=>d.id===r.device_id&&d.person_id===pid&&d.user_id===uid);
  latest.set(type,{record:r,value,source:healthReadingSource(r.source),device});
 }
 return latest;
}
