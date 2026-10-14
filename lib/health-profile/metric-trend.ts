import type {RegistroSaude} from '@/lib/types';
import type {HealthMetric} from './types';
import {healthReadingValue} from './avatar-readings';
import {validDate} from './metrics';
export function metricTrendData(records:RegistroSaude[],type:HealthMetric) {
 const seen=new Set<string>();
 const ordered=records.filter(r=>r.tipo===type&&validDate(r.data)).sort((a,b)=>`${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`)||(b.id||'').localeCompare(a.id||''));
 const recent:RegistroSaude[]=[];
 for(const record of ordered){if(record.id&&seen.has(record.id))continue;if(healthReadingValue(record)===null)continue;if(record.id)seen.add(record.id);recent.push(record);if(recent.length===7)break;}
 const rows=recent.reverse();
 const samples=rows.map(r=>{const primary=type==='pressao_arterial'?Number(r.valor_medicao!.trim().split('/')[0]):(type==='sono'||type==='caminhada'?r.duracao_minutos??r.valor_numerico:r.valor_numerico)!;
 const secondary=type==='pressao_arterial'?Number(r.valor_medicao!.split('/')[1].replace(/mmhg/i,'').trim()):undefined;
 const [year,month,day]=r.data.split('-').map(Number),match=r.horario?.match(/^(\d{2}):(\d{2})$/);const minutes=match&&Number(match[1])<24&&Number(match[2])<60?Number(match[1])*60+Number(match[2]):720;
 return {record:r,primary,secondary,time:Date.UTC(year,month-1,day)+minutes*60000};});
 const values=samples.flatMap(s=>s.secondary===undefined?[s.primary]:[s.primary,s.secondary]);
 const min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
 const times=samples.map(s=>s.time),first=times.length?Math.min(...times):0,last=times.length?Math.max(...times):0;
 return {samples,min,max,points:samples.map(s=>({...s,x:first===last?60:6+(s.time-first)/(last-first)*108,y:min===max?16:26-(s.primary-min!)/(max!-min!)*20,ySecondary:s.secondary===undefined?undefined:min===max?16:26-(s.secondary-min!)/(max!-min!)*20}))};
}
