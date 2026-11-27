import { db } from '@/lib/db';
import type { SyncQueueItem, Tratamento } from '@/lib/types';
import type { supabase } from '@/lib/supabase/client';
import {canWriteTreatmentChoiceR03,mergeVisualProjectionR03,readVisualIntentR03,sameVisualScopeR03,visualAcknowledgedR03,visualRevisionR03} from '@/lib/health-profile/treatment-preferences-r03';
import {buildSyncFailureUpdate,SYNC_MAX_RETRIES} from "@/lib/sync/queue-health";
import {preserveA0Tratamento} from '@/lib/sync/a0-preserve-local-parity';
type Row=Record<string,unknown>;
const asRow=(v:object)=>v as Row;
export class TreatmentVisualConflictR03 extends Error {}
/** Re-read inside the same Dexie transaction as the write. Never replace a clinical pending row. */
export async function mergeTreatmentRemoteR03(remote:Row,userId:string):Promise<void>{
  if(typeof remote.id!=='string'||!remote.id||remote.user_id!==userId)throw Error('Tratamento remoto fora da conta.');
  const id=remote.id;
  await db.transaction('rw',[db.tratamentos,db.syncQueue],async()=>{
    const local=await db.tratamentos.get(id);
    if(local&&local.user_id!==userId)throw Error('Tratamento local fora da conta.');
    const clinical=await db.syncQueue.where('chave').equals(`tratamentos:${id}`).first();
    if(clinical?.operation==='delete')return;
    if(local&&!sameVisualScopeR03(remote,local)&&readVisualIntentR03(local.visual_identity_pending))throw Error('Pessoa alterada durante sincronização visual.');
    const localTime=Date.parse(local?.updated_at??''),remoteTime=Date.parse(typeof remote.updated_at==='string'?remote.updated_at:'');
    const keepClinical=!!clinical||local?.synced===false||(Number.isFinite(localTime)&&Number.isFinite(remoteTime)&&localTime>=remoteTime);
    if(keepClinical){
      if(local){const next=mergeVisualProjectionR03(remote,asRow(local));if(JSON.stringify(next)!==JSON.stringify(local))await db.tratamentos.put(next as unknown as Tratamento);}
      return;
    }
    const next=preserveA0Tratamento(remote,local?asRow(local):undefined);
    await db.tratamentos.put({...next,synced:true} as unknown as Tratamento);
  });
}
export async function syncTreatmentVisualIntentR03(item:SyncQueueItem,client:typeof supabase):Promise<boolean>{
  const p=item.payload,intent=readVisualIntentR03(p);
  if(item.operation!=='update'||!intent||intent.state!=='pending'||typeof p.id!=='string'||typeof p.user_id!=='string'||typeof p.person_id!=='string')throw Error('Comando visual inválido.');
  const id=p.id;
  const local=await db.tratamentos.get(id);
  if(!local||!sameVisualScopeR03(p,local))throw new TreatmentVisualConflictR03('Tratamento ou pessoa não está mais disponível para a escolha visual.');
  const pending=readVisualIntentR03(local.visual_identity_pending);
  if(pending?.operation!==intent.operation){if(visualAcknowledgedR03(intent,local))return finalizeTreatmentVisualIntentR03(item);throw new TreatmentVisualConflictR03('Escolha visual não corresponde à fila local.');}
  if(pending.state==='conflict')throw new TreatmentVisualConflictR03('Escolha visual em conflito. Revise o ícone do tratamento.');
  // Reader compatibility must never expand the deployed CAS writer contract.
  if(!canWriteTreatmentChoiceR03(intent.choice))throw Error('Ícone aguardando compatibilidade de versões; escolha preservada na fila.');
  const {data,error}=await client.rpc('vault_set_treatment_visual_r03',{p_id:id,p_person:p.person_id,p_base:intent.base,p_choice:intent.choice,p_operation:intent.operation});
  if(error)throw Error(`Sincronização visual: ${error.message}`);
  const result=data as {status?:unknown;row?:Row}|null;
  const row=result?.row;
  if(!row||!sameVisualScopeR03(p,row)||visualRevisionR03(row)===null)throw Error('Resposta visual inválida ou fora da pessoa.');
  const ack=result?.status==='ack'&&visualAcknowledgedR03(intent,row);
  const conflict=result?.status==='conflict'&&(visualRevisionR03(row)??-1)>=intent.base;
  if(!ack&&!conflict)throw Error('Confirmação visual não corresponde à operação.');
  const finalized=await db.transaction('rw',[db.tratamentos,db.syncQueue],async()=>{
    const current=await db.tratamentos.get(id);
    if(!current||!sameVisualScopeR03(p,current)||!item.id)return false;
    const queued=await db.syncQueue.get(item.id);
    if(!queued||queued.payload.operation!==intent.operation)return false;
    const live=readVisualIntentR03(current.visual_identity_pending);
    if(live?.operation!==intent.operation)return false;
    const merged=mergeVisualProjectionR03(row,asRow(current));
    await db.tratamentos.put({...merged,visual_identity_pending:ack?null:{...intent,state:'conflict'}} as unknown as Tratamento);
    if(ack){await db.syncQueue.delete(item.id);return true;}
    await db.syncQueue.update(item.id,buildSyncFailureUpdate(SYNC_MAX_RETRIES,'Outro aparelho alterou o ícone. Revise a escolha no tratamento.'));return false;
  });
  if(conflict)throw new TreatmentVisualConflictR03('Outro aparelho alterou o ícone. Revise a escolha no tratamento.');
  return finalized;
}
/** ACK is independent from clinical synced and compares the operation, not wall clock. */
export async function finalizeTreatmentVisualIntentR03(item:SyncQueueItem):Promise<boolean>{
  if(!item.id)return false;
  const id=item.id,p=item.payload,intent=readVisualIntentR03(p);
  if(!intent||typeof p.id!=='string')return false;
  const treatmentId=p.id;
  return db.transaction('rw',[db.syncQueue,db.tratamentos],async()=>{
    const current=await db.syncQueue.get(id),local=await db.tratamentos.get(treatmentId);
    if(!current||current.payload.operation!==intent.operation||!local||!sameVisualScopeR03(p,local)||readVisualIntentR03(local.visual_identity_pending)?.operation===intent.operation||!visualAcknowledgedR03(intent,local))return false;
    await db.syncQueue.delete(id);return true;
  });
}

/** The managed Realtime publication does not currently include tratamentos. Refresh only
 * confirmed visual projections; never create a partial treatment or mutate clinical facts. */
export async function refreshTreatmentVisualProjectionR03(client:typeof supabase,userId:string,active:()=>boolean):Promise<void>{
  if(!userId||!active())return;
  const size=200;let cursor:string|undefined;
  while(active()){
    let query=client.from('tratamentos').select('id,user_id,person_id,visual_icon,visual_icon_revision,visual_icon_operation_id,visual_icon_updated_at').eq('user_id',userId).gt('visual_icon_revision',0).order('id',{ascending:true}).limit(size);
    if(cursor)query=query.gt('id',cursor);
    const {data,error}=await query;
    if(!active())return;
    if(error)throw Error('Não foi possível atualizar a identidade dos tratamentos.');
    if(!Array.isArray(data)||data.length>size)throw Error('Projeção visual inválida.');
    let last=cursor;
    for(const raw of data){
      const row=raw as Row;
      if(typeof row.id!=='string'||!row.id||row.user_id!==userId||typeof row.person_id!=='string'||(last!==undefined&&row.id<=last)||(visualRevisionR03(row)??0)<=0)throw Error('Projeção visual fora do escopo ou inválida.');
      last=row.id;
    }
    await db.transaction('rw',[db.tratamentos,db.syncQueue],async()=>{
      for(const raw of data){
        if(!active())return;
        const remote=raw as Row,id=remote.id as string;
        const local=await db.tratamentos.get(id);
        if(!active())return;
        if(!local||!sameVisualScopeR03(remote,local))continue;
        const pending=await db.syncQueue.where('chave').equals(`tratamentos:${id}`).first();
        if(!active())return;
        if(pending?.operation==='delete')continue;
        const next=mergeVisualProjectionR03(remote,asRow(local));
        if(JSON.stringify(next)!==JSON.stringify(local))await db.tratamentos.put(next as unknown as Tratamento);
      }
    });
    if(data.length<size)return;
    cursor=last;
  }
}
