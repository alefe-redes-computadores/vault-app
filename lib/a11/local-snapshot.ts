'use client';
/** Contagens locais sob ação explícita. Sem upload, SQL, sync ou retorno de registros clínicos. */
import { db } from '@/lib/db';
import {getSyncQueueState} from '@/lib/sync/queue-health';

export type A11LocalSnapshot={scope:string;checkedAt:string;counts:Record<string,number|null>;
 queue:{ready:number;deferred:number;failed:number};coverage:'local_counts_only';warnings:string[]};
const SOURCES=[
 ['doses','doseLogs'],['vacinas','vaccination_events_a8'],
 ['reabilitacao','rehab_sessions_m5'],['internacoes','hospitalizations_a5'],
 ['cirurgias','surgery_journey_events_a7'],['procedimentos','procedure_events_a9'],
] as const;
export async function collectA11LocalSnapshot(userId:string,personId:string):Promise<A11LocalSnapshot>{
 const uid=userId.trim(),pid=personId.trim();if(!uid||!pid)throw Error('Conta e pessoa obrigatórias');
 const person=await db.persons.get(pid);
 if(!person||person.user_id!==uid)throw Error('Pessoa não pertence à conta autenticada');
 const counts:Record<string,number|null>={};const warnings:string[]=[];
 // Índice por proprietário; nunca transformar consulta inexistente em contagem zero.
 for(const [name,tableName] of SOURCES){
  try{
   const rows=await db.table(tableName).where('[user_id+person_id]').equals([uid,pid]).count();
   counts[name]=rows;
  }catch{
   counts[name]=null;warnings.push('Fonte '+name+' indisponível para conferência local');
  }
 }
 let queue={ready:0,deferred:0,failed:0};
 try{
  const items=await db.syncQueue.filter(item=>
   item.payload?.user_id===uid&&item.payload?.person_id===pid).toArray();
  for(const item of items)queue[getSyncQueueState(item)]++;
 }catch{warnings.push('Fila de sincronização indisponível para este escopo');}
 // Revalidar após todos os awaits; saída contém apenas contagens.
 const current=await db.persons.get(pid);
 if(!current||current.user_id!==uid)throw Error('Escopo mudou durante a conferência');
 return {scope:JSON.stringify([uid,pid]),checkedAt:new Date().toISOString(),counts,queue,
  coverage:'local_counts_only',warnings};
}
