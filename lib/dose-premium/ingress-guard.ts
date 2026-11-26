import {samePharmaceuticalSnapshot} from './pharmaceutical-snapshot';
import {checkIncomingDoseEvidence} from './wire-fields';
import {verifyDoseSnapshotAck,type DoseSnapshot} from './compatibility';
import {validInstant} from './center-view';
import {readDoseUnit} from './historical-unit';
import {readStockEvidence} from './stock-evidence';
/** Read-side gate shared by the existing transports. It does not write or fetch anything. */
type Row=Record<string,unknown>;
const fields=['unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot'];
export function hasProtectedDoseEvidence(row:Row|undefined):boolean {
  // Even a malformed non-null field is evidence that requires review rather than deletion.
  return !!row&&fields.some(k=>row[k]!=null);
}
function snapshot(row:Row):DoseSnapshot|null {
  if(['id','user_id','person_id','medicamento_id','data','horario'].some(k=>typeof row[k]!=='string'||!(row[k] as string).trim()))return null;
  // Legacy slots may be serialized with seconds. Preserve their stored value, compare only exact midnight seconds.
  const hour=String(row.horario);
  return {...row,horario:/^\d{2}:\d{2}:00$/.test(hour)?hour.slice(0,5):hour} as DoseSnapshot;
}
export function checkDoseIngress(userId:string,local:Row|undefined,remote:Row):'accept'|'review' {
  if(!userId||remote.user_id!==userId||typeof remote.id!=='string'||!remote.id)return 'review';
  if(local&&(local.user_id!==userId||local.id!==remote.id||local.person_id!==remote.person_id||local.medicamento_id!==remote.medicamento_id))return 'review';
  if(!hasProtectedDoseEvidence(local)&&!hasProtectedDoseEvidence(remote))return 'accept'; // existing legacy transport remains compatible
  const a=local?snapshot(local):undefined,b=snapshot(remote);
  if(!b||(local&&!a))return 'review';
  try {
    if(readDoseUnit(b).state==='invalid')return 'review';readStockEvidence(b.estoque_movimento);
    return checkIncomingDoseEvidence(a??undefined,b);
  }catch{return 'review';}
}
/** Realtime DELETE does not carry the full verified clinical receipt. Preserve protected local facts. */
export function canAcceptDoseDelete(userId:string,local:Row|undefined):boolean {
  return !!userId&&!!local&&local.user_id===userId&&!hasProtectedDoseEvidence(local);
}

/** Pagination may never manufacture completion from a null response or repeated identity. */
export function acceptDosePage(userId:string,page:unknown,seen:Set<string>):void {
  if(!userId||!Array.isArray(page))throw Error('Página de doses não confirmada pela nuvem.');
  const next=new Set<string>();
  for(const item of page){
    if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Registro remoto de dose inválido.');
    const row=item as Row;
    if(row.user_id!==userId||typeof row.id!=='string'||!row.id.trim()||typeof row.person_id!=='string'||!row.person_id.trim()||typeof row.medicamento_id!=='string'||!row.medicamento_id.trim())throw Error('Escopo remoto de dose não confirmado.');
    if(seen.has(row.id)||next.has(row.id))throw Error('Paginação de doses instável; repita a conferência.');
    next.add(row.id);
  }
  for(const id of next)seen.add(id);
}

/** Receipt fetched from the canonical remote ledger, never from realtime or an ordinary row payload. */
export type RemoteDoseReceipt={id:string;user_id:string;person_id:string;medication_id:string;committed_at:string;ack:{version:1;operationId:string;dose:DoseSnapshot|null;deleted:boolean};previous:DoseSnapshot|null};
export function verifyRemoteDoseReceipt(userId:string,local:Row|undefined,remote:Row|null,proof:RemoteDoseReceipt|undefined):boolean{
  if(!proof||!userId||proof.user_id!==userId||proof.ack?.version!==1||typeof proof.ack.operationId!=='string'||!proof.ack.operationId||!validInstant(proof.committed_at)||!proof.id)return false;
  if(local&&(local.user_id!==userId||local.id!==proof.id||local.person_id!==proof.person_id||local.medicamento_id!==proof.medication_id))return false;
  const b=remote?snapshot(remote):null,a=local?snapshot(local):null;
  if(remote&&(!b||remote.id!==proof.id||remote.user_id!==userId||remote.person_id!==proof.person_id||remote.medicamento_id!==proof.medication_id))return false;
  if(local&&!a)return false;
  if(proof.ack.deleted){return !remote&&!!a&&!!proof.previous&&verifyDoseSnapshotAck(a,proof.previous);}
  if(!b||!proof.ack.dose||!verifyDoseSnapshotAck(b,proof.ack.dose))return false;
  if(a&&(!validInstant(a.updated_at)||!validInstant(b.updated_at)||Date.parse(b.updated_at)<=Date.parse(a.updated_at)))return false;
  // Never erase explicit unit from a local historical fact. The compatible writer
  // can change an outcome/quantity, but an identified unit stays immutable.
  if(a?.farmaco_snapshot!=null&&!samePharmaceuticalSnapshot(a.farmaco_snapshot,b.farmaco_snapshot,a))return false;
  if(a){const x=readDoseUnit(a),y=readDoseUnit(b);if(x.state==='invalid'||x.state==='known'&&(y.state!=='known'||JSON.stringify(x.fields)!==JSON.stringify(y.fields)))return false;}
  return true;
}
