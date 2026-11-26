"use client";
import {useLiveQuery} from 'dexie-react-hooks';
import {useVitalRuntime} from './useVitalRuntime';
import type {VitalEvidence} from '@/lib/vital/facts';
/** Scoped read-only snapshot consumed by clinical report and Brain, not a duplicate writer. */
export function useVitalEvidence(){const {repo,scope,loading}=useVitalRuntime();const key=scope?`${scope.user_id}:${scope.person_id}`:'';const result=useLiveQuery(async()=>{if(!scope)return {key,data:null,error:null};try{const data=await repo.snapshot(scope);return {key,data:{workouts:data.workouts,meals:data.meals,trainingCheckins:data.trainingCheckins,nutritionCheckins:data.nutritionCheckins} satisfies VitalEvidence,error:null};}catch{return {key,data:null,error:'Não foi possível consultar os registros Vital.'};}},[repo,key]);return {scope,data:result?.key===key?result.data:null,error:result?.key===key?result.error:null,loading:loading||!!scope&&result?.key!==key};}
