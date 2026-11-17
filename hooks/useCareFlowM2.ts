'use client';
import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { careflowM2Repository } from '@/lib/repositories/careflowM2';
import type { CareFlowEventInputM2, CareFlowEventM2 } from '@/lib/careflow-m2/domain';
export function useCareFlowM2(){
  const {user}=useAuth();const {activePersonId}=useActivePersonId();
  const events=useLiveQuery(async()=>{
    if(!user?.id||!activePersonId)return [];
    const rows=await db.careflow_events_m2.where('person_id').equals(activePersonId).toArray();
    return rows.filter(e=>e.user_id===user.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  },[user?.id,activePersonId]);
  const append=useCallback(async(input:CareFlowEventInputM2)=>{
    if(!activePersonId||!user?.id)throw new Error('Pessoa não identificada.');
    return careflowM2Repository.append(activePersonId,input);
  },[activePersonId,user?.id]);
  const appendMany=useCallback(async(inputs:readonly CareFlowEventInputM2[])=>{
    if(!activePersonId||!user?.id)throw new Error('Pessoa não identificada.');
    return careflowM2Repository.appendMany(activePersonId,inputs);
  },[activePersonId,user?.id]);
  return {events:events as CareFlowEventM2[]|undefined,loading:events===undefined,append,appendMany,activePersonId,userId:user?.id||''};
}
