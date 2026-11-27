import {recoveryOperationR7} from './active-receipt-recovery-r7';
import {intentFromQueue,sameAcquisition,type PendingItem} from './atomic-envelope';
import {validateMacro02Backup} from './backup-contract';
import type {ScopedStockRow} from './stock-context';
import {classifyMacro02RestoreIntents} from './receipt-recovery';

type Row=Record<string,unknown>;
type LocalRecoveryState=Parameters<typeof validateMacro02Backup>[0];
const isRow=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=(v:unknown):Row[]=>{if(!Array.isArray(v)||!v.every(isRow))throw Error('Estrutura de backup inválida.');return v;};
/** Reject ambiguous snapshots at the import boundary. Legacy facts may lack a
 * person_id or refer to a removed medication; do not invent these relationships.
 * The existing canonical validator separately requires dependencies for every
 * protected fact and pending envelope. */
function ownedUniqueRows(value:unknown,userId:string,label:string):Row[]{
 const input=rows(value),ids=new Set<string>();
 for(const row of input){
  if(row.user_id!==userId||typeof row.id!=='string'||!row.id.trim()||ids.has(row.id))throw Error('Identidade duplicada ou fora da conta no backup: '+label+'.');
  ids.add(row.id);
 }
 return input;
}

function parseMacro02RecoveryFile(value:unknown,userId:string){
 if(!isRow(value)||value.user_id!==userId||value.version!=='3.0'||!isRow(value.macro02_recovery))throw Error('Backup incompatível ou de outra conta.');
 const r=value.macro02_recovery;if(r.user_id!==userId||r.version!==1||r.mode!=='evidence_only_no_replay')throw Error('Recibo de exportação incompatível.');
 const pending=rows(r.pending).map(x=>{if(!isRow(x.payload)||typeof x.table!=='string'||typeof x.operation!=='string'||typeof x.chave!=='string'||x.payload.user_id!==userId)throw Error('Intenção fora do escopo.');const q={table:x.table,operation:x.operation,chave:x.chave,payload:x.payload};recoveryOperationR7(q,userId);return q;});
 const state:LocalRecoveryState={userId,persons:ownedUniqueRows(value.persons,userId,'persons'),medications:ownedUniqueRows(value.medicamentos,userId,'medicamentos') as ScopedStockRow[],doses:ownedUniqueRows(value.dose_logs,userId,'dose_logs'),acquisitions:ownedUniqueRows(value.renovacoes,userId,'renovacoes'),withdrawals:ownedUniqueRows(value.retiradas,userId,'retiradas'),links:value.a1_prescription_links===undefined?[]:ownedUniqueRows(value.a1_prescription_links,userId,'a1_prescription_links'),queue:pending};
 const verified=validateMacro02Backup(state);
 if(verified.pendingCount!==r.pendingCount||verified.pendingCount!==pending.length)throw Error('Fila do backup incompleta.');
 return {state,verified};
}
export function readMacro02RecoveryFile(value:unknown,userId:string){return parseMacro02RecoveryFile(value,userId).verified;}
/** Read-only classification of the exact imported bytes, not a restore permit.
 * The caller must establish a verified server fence before obtaining the ledger.
 * No path here can write local facts, authorize replay, or synthesize ACKs. */
export function classifyMacro02RecoveryFile(value:unknown,userId:string,ledger:unknown,expectedFence:string){
 const {state}=parseMacro02RecoveryFile(value,userId);
 return classifyMacro02RestoreIntents(state,ledger,expectedFence);
}
/** Recover only original pending intents when current clinical rows already match their terminal state.
 * No dose, stock, acquisition or receipt is imported. Never mint an operation ID or replay a local debit. */
export function planMacro02QueueRecovery(local:LocalRecoveryState,pending:readonly PendingItem[]){
 if(pending.some(q=>q.payload.macro02_compound!==undefined))throw Error('Recuperação de envelope composto exige o recibo integral; preserve o arquivo.');
 const scopes=new Set(pending.map(q=>{const i=intentFromQueue(q);if(!i||i.stockBefore.user_id!==local.userId)throw Error('Intenção fora da conta.');return i.stockBefore.medicationId;}));
 const current=local.queue.filter(q=>q.payload.user_id===local.userId&&scopes.has(String(q.table==='medicamentos'?q.payload.id:q.payload.medicamento_id)));
 const byKey=new Map(pending.map(q=>[q.chave,q]));
 for(const q of current){const original=byKey.get(q.chave);if(!original||q.table!==original.table||q.operation!==original.operation||!sameAcquisition(original.payload,q.payload)||!sameAcquisition(q.payload,original.payload))throw Error('Fila local possui alteração não representada neste backup.');}
 validateMacro02Backup({...local,queue:pending});
 const missing=pending.filter(q=>!current.some(x=>x.chave===q.chave));
 for(const q of missing){const i=intentFromQueue(q)!;const med=local.medications.find(m=>m.id===i.stockBefore.medicationId&&m.user_id===local.userId&&m.person_id===i.stockBefore.person_id);const hasUnsyncedFact=local.doses.some(d=>d.user_id===local.userId&&d.person_id===i.stockBefore.person_id&&d.medicamento_id===i.stockBefore.medicationId&&d.synced===false&&pending.some(row=>{const v=intentFromQueue(row)!;return v.version===1&&(v.after??v.previous)!.id===d.id;}));if(!med||((med as ScopedStockRow&{synced?:boolean}).synced===true&&!hasUnsyncedFact&&!current.some(x=>intentFromQueue(x)?.stockBefore.medicationId===med.id)))throw Error('Saldo já confirmado ou não disponível neste dispositivo. Não será reenviado.');}
 return missing;
}
