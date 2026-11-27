/** Adapter for the existing SyncQueue processor. It does not own a timer, database or session. */
import { assertAtomicAck,intentFromQueue,medicationPending,sameStock,sameCount,sameAcquisition,type AtomicAck,type PendingItem } from '@/lib/dose-premium/atomic-envelope';
import {acquisitionWire,withdrawalReceiptWire} from '@/lib/dose-premium/acquisition-wire';
import { sameClinicalInstant,verifyDoseSnapshotAck,type DoseSnapshot } from '@/lib/dose-premium/compatibility';
import { observedStockContext } from '@/lib/dose-premium/stock-context';
import type { Medicamento,SyncQueueItem,DoseLog } from '@/lib/types';
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import { supabase } from '@/lib/supabase/client';
import {requireMacro02AtomicEpoch} from '@/lib/dose-premium/cutover-active-queue-r5';

export const isMacro02Atomic=(item:PendingItem)=>item.payload.macro02_atomic!==undefined;
export async function pendingAtomicPredecessor(item:SyncQueueItem):Promise<boolean>{
 const intent=intentFromQueue(item);if(!intent)return false;
 const chain=medicationPending(await db.syncQueue.toArray(),intent.stockBefore);
 const first=chain[0];if(!first)throw Error('Intenção acoplada não está mais na fila.');
 return first.operationId!==intent.operationId;
}
export async function sendMacro02Atomic(item:SyncQueueItem,uid:string):Promise<AtomicAck>{
 if(item.payload.macro02_compound!==undefined)throw Error("M02_COMPOUND_TRANSPORT_REQUIRED");
 const intent=intentFromQueue(item);if(!intent||intent.stockBefore.user_id!==uid)throw Error('Intenção de dose fora da conta autenticada.');
 const person=await db.persons.get(intent.stockBefore.person_id);if(!person||person.user_id!==uid)throw Error('Pessoa da intenção não pertence à conta.');
 // The server must independently recalculate the debit and atomically commit dose + inventory.
 // Unknown/missing RPC cannot result in legacy fallback or queue finalization.
 const {data,error}=await supabase.rpc(intent.version===1?'vault_macro02_commit_dose':'vault_macro02_commit_stock',{p_intent:intent});
 if(error)throw Error('Dose e estoque aguardam sincronização integral: '+error.message);
 return assertAtomicAck(intent,data);
}
/** R5 never calls the old unbound RPC or rewrites a stored epoch. */
export async function sendMacro02AtomicR5(item:SyncQueueItem,uid:string):Promise<AtomicAck>{
 if(item.payload.macro02_compound!==undefined)throw Error("M02_COMPOUND_TRANSPORT_REQUIRED");
 const intent=intentFromQueue(item),epoch=requireMacro02AtomicEpoch(item.payload.macro02_epoch);
 if(!intent||intent.stockBefore.user_id!==uid)throw Error('M02_R5_ATOMIC_SCOPE');
 const person=await db.persons.get(intent.stockBefore.person_id);if(!person||person.user_id!==uid)throw Error('M02_R5_ATOMIC_PERSON');
 let invalid=false;const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalid=true;});
 try{
  const before=await supabase.auth.getUser();if(invalid||before.error||before.data.user?.id!==uid)throw Error('M02_R5_ATOMIC_AUTH');
  const {data,error}=await supabase.rpc('vault_macro02_commit_atomic_r5',{p_epoch:epoch,p_intent:intent});
  if(invalid||error)throw Error('M02_R5_ATOMIC_REMOTE_UNAVAILABLE');
  const after=await supabase.auth.getUser();if(invalid||after.error||after.data.user?.id!==uid)throw Error('M02_R5_ATOMIC_ACCOUNT_CHANGED');
  return assertAtomicAck(intent,data);
 }finally{subscription.unsubscribe();}
}
function doseSnapshot(row:DoseLog|undefined):DoseSnapshot|null{
 if(!row)return null;if(!row.id||!row.person_id||!row.user_id)throw Error('Dose local perdeu escopo.');return {...row,id:row.id,person_id:row.person_id};
}
/** Finalization checks the actual current local chain. An ACK for an older operation can
 * remove only that intention; it can never mark a newer dose or balance as synced. */
export async function finalizeMacro02Atomic(item:SyncQueueItem,ack:AtomicAck,assertSession:()=>void=()=>{}):Promise<boolean>{
 if(item.payload.macro02_compound!==undefined)throw Error("M02_COMPOUND_FINALIZE_REQUIRED");
 assertSession();
 const intent=intentFromQueue(item);if(!intent||!item.id)throw Error('Intenção ausente.');assertAtomicAck(intent,ack);
 const {data,error}=await getLocalFirstAuthUser();if(error||data.user?.id!==intent.stockBefore.user_id)throw Error('Conta mudou durante a sincronização.');assertSession();
 return db.transaction('rw',[db.syncQueue,db.doseLogs,db.medicamentos,db.persons,db.renovacoes,db.retiradas],async()=>{
  assertSession();const current=await db.syncQueue.get(item.id!);assertSession();if(!current||current.chave!==item.chave||current.updated_at!==item.updated_at||JSON.stringify(current.payload)!==JSON.stringify(item.payload))return false;
  const scope=intent.stockBefore,person=await db.persons.get(scope.person_id);if(!person||person.user_id!==scope.user_id)throw Error('Pessoa mudou durante a sincronização.');
  const chain=medicationPending(await db.syncQueue.toArray(),scope);if(chain[0]?.operationId!==intent.operationId)return false;
  assertSession();const remaining=chain.slice(1);
  if(intent.version===1){const identity=(intent.after??intent.previous)!;
   const sameDose=remaining.some(x=>x.version===1&&(x.after??x.previous)!.id===identity.id);
   if(!sameDose){const local=doseSnapshot(await db.doseLogs.get(identity.id));if(intent.after===null?local!==null:!local||!verifyDoseSnapshotAck(intent.after,local))throw Error('Dose local divergiu durante a confirmação; fila preservada.');
    if(local)await db.doseLogs.update(identity.id,{synced:true});}
  }else if(intent.acquisition){const id=String(intent.acquisition.id),row=await db.renovacoes.get(id);if(!row||!sameAcquisition(intent.acquisition,acquisitionWire(row)))throw Error('Aquisição local divergiu; fila preservada.');await db.renovacoes.update(id,{synced:true});if(intent.withdrawalId){const w=await db.retiradas.get(intent.withdrawalId);if(!w||!sameAcquisition(intent.withdrawalAfter??null,withdrawalReceiptWire(w)))throw Error('Retirada local divergiu; fila preservada.');await db.retiradas.update(intent.withdrawalId,{synced:true});}}
  const later=remaining.at(-1)??intent,med:Medicamento|undefined=await db.medicamentos.get(scope.medicationId);if(!med||!sameStock(observedStockContext(med,scope),later.stockAfter)||!sameClinicalInstant(med.updated_at??null,later.stockRevisionAfter)||(later.version===2&&!sameCount(med,later.afterCount)))throw Error('Saldo local divergiu durante a confirmação; fila preservada.');
  if(!remaining.length){const ordinary=await db.syncQueue.where('chave').equals(`medicamentos:${scope.medicationId}`).first();if(!ordinary)await db.medicamentos.update(scope.medicationId,{synced:true});}
  assertSession();await db.syncQueue.delete(item.id!);assertSession();return true;
 });
}

/** R5 finalization is also tied to live authentication, not a cached session.
 * The callback is synchronous so Dexie never waits on network while writing. */
export async function finalizeMacro02AtomicR5(item:SyncQueueItem,ack:AtomicAck):Promise<boolean>{
 const intent=intentFromQueue(item);requireMacro02AtomicEpoch(item.payload.macro02_epoch);
 if(!intent)throw Error('M02_R5_ATOMIC_SCOPE');const uid=intent.stockBefore.user_id;
 let invalid=false;const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalid=true;});
 const guard=()=>{if(invalid)throw Error('M02_R5_ATOMIC_ACCOUNT_CHANGED');};
 try{const a=await supabase.auth.getUser();guard();if(a.error||a.data.user?.id!==uid)throw Error('M02_R5_ATOMIC_AUTH');return await finalizeMacro02Atomic(item,ack,guard);}finally{subscription.unsubscribe();}
}
