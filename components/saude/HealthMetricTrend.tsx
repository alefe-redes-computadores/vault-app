import {memo,useMemo} from 'react';
import type {RegistroSaude} from '@/lib/types';
import {METRICS,type HealthMetric} from '@/lib/health-profile/types';
import {metricTrendData} from '@/lib/health-profile/metric-trend';
/** Discrete observations at their civil dates; gaps are not interpolated. */
export const HealthMetricTrend=memo(function HealthMetricTrend({records,type}:{records:RegistroSaude[];type:HealthMetric}) {
 const data=useMemo(()=>metricTrendData(records,type),[records,type]);
 if(data.samples.length<2)return null;
 return <div className="mt-3 border-t border-surface-border/50 pt-2"><svg viewBox="0 0 120 32" className="h-12 w-full" role="img" aria-label={`${data.samples.length} registros recentes em datas reais; mínimo ${data.min}, máximo ${data.max} ${METRICS[type].unit}. Dias sem registro não são estimados.`}>
 {data.points.map((p,i)=><g key={p.record.id||i}><circle cx={p.x} cy={p.y} r="2.3" fill="currentColor"><title>{`${p.record.data} ${p.record.horario||'sem horário'}: ${p.primary} ${METRICS[type].unit}${type==='pressao_arterial'?' sistólica':''}`}</title></circle>{p.ySecondary!==undefined&&<circle cx={p.x} cy={p.ySecondary} r="2.3" fill="none" stroke="currentColor" strokeWidth="1.2"><title>{`${p.record.data}: ${p.secondary} mmHg diastólica`}</title></circle>}</g>)}
 </svg><p className="text-[10px] text-ink-muted">Últimos {data.samples.length} registros · {data.min}–{data.max} {METRICS[type].unit}</p>{type==='pressao_arterial'&&<p className="mt-1 text-[10px] text-ink-muted">● Sistólica · ○ Diastólica</p>}<p className="mt-1 text-[9px] text-ink-muted">Pontos observados; a escala se ajusta aos valores, sem classificar o estado de saúde.</p></div>;
});
