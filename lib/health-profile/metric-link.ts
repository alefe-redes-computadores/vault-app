import type {RegistroSaude} from '@/lib/types';
import {METRICS,type HealthMetric} from './types';
import {validDate} from './metrics';
import {selectMetricHistory} from './history';
export interface MetricInsightRange {since:string;until:string}
export interface MetricInsightTarget extends MetricInsightRange {type:HealthMetric}
export function validMetricRange(range:MetricInsightRange|undefined,today:string):range is MetricInsightRange {return !!range&&validDate(today)&&validDate(range.since)&&validDate(range.until)&&range.since<=range.until&&range.until<=today;}
export function readMetricInsightTarget(params:URLSearchParams,personId:string,today:string):MetricInsightTarget|null {
 const type=params.get('metric'),since=params.get('desde'),until=params.get('ate');
 if(!personId||params.get('person_id')!==personId||!type||!Object.hasOwn(METRICS,type)||!since||!until)return null;
 const range={since,until};return validMetricRange(range,today)?{type:type as HealthMetric,...range}:null;
}
export function selectInsightMetricHistory(records:RegistroSaude[],type:HealthMetric,today:string,range:MetricInsightRange) {return validMetricRange(range,today)?selectMetricHistory(records,type,today,'all').filter(r=>r.data>=range.since&&r.data<=range.until):[];}
export function clearMetricInsightQuery(params:URLSearchParams):string {const copy=new URLSearchParams(params);for(const key of ['metric','person_id','desde','ate'])copy.delete(key);return copy.toString();}
