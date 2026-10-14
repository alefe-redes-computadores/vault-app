"use client";
import {Suspense,useEffect,useRef} from 'react';
import {useSearchParams} from 'next/navigation';
import {readMetricInsightTarget,type MetricInsightTarget} from '@/lib/health-profile/metric-link';
function Bridge({personId,today,onOpen}:{personId:string;today:string;onOpen:(target:MetricInsightTarget)=>void}) {
 const params=useSearchParams(),query=params.toString(),seen=useRef(''),callback=useRef(onOpen);
 useEffect(()=>{callback.current=onOpen;},[onOpen]);
 useEffect(()=>{const identity=personId+'|'+query;if(!personId||seen.current===identity)return;seen.current=identity;const target=readMetricInsightTarget(new URLSearchParams(query),personId,today);if(target)callback.current(target);},[personId,query,today]);
 return personId&&params.get('metric')&&params.get('person_id')&&params.get('person_id')!==personId?<p role="status" className="my-3 rounded-xl border border-amber-400/25 p-3 text-xs text-amber-300">Este histórico pertence a outra pessoa. Selecione-a no aplicativo para consultá-lo.</p>:null;
}
export function MetricHistoryLink(props:{personId:string;today:string;onOpen:(target:MetricInsightTarget)=>void}) {return <Suspense fallback={null}><Bridge {...props}/></Suspense>;}
