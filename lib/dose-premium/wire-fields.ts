import {readPharmaceuticalSnapshot} from './pharmaceutical-snapshot';
import {readDoseUnit} from './historical-unit';
import {readStockEvidence} from './stock-evidence';
import {verifyDoseSnapshotAck,type DoseSnapshot} from './compatibility';
/** Exact clinical projection for the existing dose_logs upsert/select path. Not a second transport. */
export const DOSE_PREMIUM_SELECT='id,user_id,person_id,medicamento_id,data,horario,tomado_em,ignorado_em,quantidade,dose_kind,motivo,unidade_dose,unidade_dose_rotulo,fonte_unidade,estoque_movimento,farmaco_snapshot,created_at,updated_at';
export function dosePremiumWireFields(row:DoseSnapshot){
  const unit=readDoseUnit(row);if(unit.state==='invalid')throw Error('Unidade histórica inválida.');
  const stock=readStockEvidence(row.estoque_movimento);
  const wire={...unit.fields,farmaco_snapshot:readPharmaceuticalSnapshot(row.farmaco_snapshot,row),estoque_movimento:stock.state==='unknown'?null:stock};
  if(!verifyDoseSnapshotAck(row,{...row,...wire}))throw Error('Snapshot de dose inválido.');
  return wire;
}
export function assertDosePremiumAck(expected:DoseSnapshot,rows:readonly DoseSnapshot[]|null){
  if(!rows||rows.length!==1||!verifyDoseSnapshotAck(expected,rows[0]))throw Error('Dose não confirmada integralmente pela nuvem. Preserve a fila.');
}
/** A newer remote row cannot silently erase a historical receipt or rewrite protected facts as a legacy payload. */
export function checkIncomingDoseEvidence(local:DoseSnapshot|undefined,remote:DoseSnapshot):'accept'|'review'{
  try{
    dosePremiumWireFields(remote);
    if(!local)return 'accept';
    if(local.id!==remote.id||local.user_id!==remote.user_id||local.person_id!==remote.person_id||local.medicamento_id!==remote.medicamento_id||local.data!==remote.data||local.horario!==remote.horario)return 'review';
    const u=readDoseUnit(local),v=readDoseUnit(remote),a=readStockEvidence(local.estoque_movimento),b=readStockEvidence(remote.estoque_movimento);
    if(u.state==='invalid'||u.state==='known'&&v.state!=='known'||a.state!=='unknown'&&b.state==='unknown')return 'review';
    // A changed protected fact needs a verified compatible writer/receipt or explicit reconciliation, not a silent last-write-wins.
    if((u.state==='known'||a.state!=='unknown'||local.farmaco_snapshot!=null)&&!verifyDoseSnapshotAck(local,remote))return 'review';
    return 'accept';
  }catch{return 'review';}
}
