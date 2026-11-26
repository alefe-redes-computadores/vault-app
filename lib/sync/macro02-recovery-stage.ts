import Dexie,{type Table} from 'dexie';
import {prepareMacro02RecoveryStage,type StagedClinicalRow} from '@/lib/dose-premium/restore-staging';

type RecordRow=StagedClinicalRow&{account_id:string};
type QueueRow={account_id:string;queue_id:string;original:Record<string,unknown>};
type StageMeta={account_id:string;source_sha256:string;created_at:string;rows:number;queue:number;issues:ReturnType<typeof prepareMacro02RecoveryStage>['issues'];ledger:unknown;outboxScopeComplete:boolean;omittedUnowned:number|null;confirmed:string[];needsReview:number;mode:'isolated_no_replay'};
/** This is intentionally NOT the operational Vault database. It has no pull,
 * push, notifications, medication calculations or syncQueue table. Staged
 * clinical data has the same local privacy requirements as the original file.
 * No database version bump or table changes in the main Vault database. */
export class Macro02RecoveryStageDB extends Dexie {
 records!:Table<RecordRow,[string,string,string]>;
 originalOutbox!:Table<QueueRow,[string,string]>;
 evidence!:Table<StageMeta,string>;
 constructor(name='vault-macro02-recovery-stage-v1'){
  super(name);this.version(1).stores({records:'[account_id+table+row_id],account_id',originalOutbox:'[account_id+queue_id],account_id',evidence:'account_id'});
 }
}
/** Requires an already authenticated ledger read. Session guard is synchronous
 * and must be checked before/after writes; no network inside IndexedDB.
 * Only an empty account staging area is accepted, even on retry. The original
 * file is retained externally; no duplicate debit and no fabricated ACK. */
export async function restoreMacro02StageEmpty(stageDB:Macro02RecoveryStageDB,input:{value:unknown;uid:string;ledger:unknown;fence:string;sourceSha256:string;assertSession:()=>void}){
 const {uid,assertSession}=input;
 if(!/^[a-f0-9]{64}$/.test(input.sourceSha256))throw Error('MACRO02_STAGE_SOURCE_HASH');
 assertSession();const plan=prepareMacro02RecoveryStage(input.value,uid,input.ledger,input.fence);assertSession();
 const records=plan.rows.map(row=>({...row,account_id:uid}));
 const outbox=plan.queue.map(original=>({account_id:uid,queue_id:String(original.id),original}));
 const meta:StageMeta={account_id:uid,source_sha256:input.sourceSha256,created_at:new Date().toISOString(),rows:records.length,queue:outbox.length,issues:plan.issues,ledger:plan.ledger,outboxScopeComplete:plan.outboxScopeComplete,omittedUnowned:plan.omittedUnowned,confirmed:plan.confirmed,needsReview:plan.needsReview,mode:'isolated_no_replay'};
 return stageDB.transaction('rw',[stageDB.records,stageDB.originalOutbox,stageDB.evidence],async()=>{
  assertSession();
  if(await stageDB.evidence.get(uid)||await stageDB.records.where('account_id').equals(uid).count()||await stageDB.originalOutbox.where('account_id').equals(uid).count())throw Error('Já existe uma cópia isolada nesta conta. Nenhum registro foi substituído.');
  if(records.length)await stageDB.records.bulkAdd(records);
  if(outbox.length)await stageDB.originalOutbox.bulkAdd(outbox);
  await stageDB.evidence.add(meta);
  if(await stageDB.records.where('account_id').equals(uid).count()!==records.length||await stageDB.originalOutbox.where('account_id').equals(uid).count()!==outbox.length)throw Error('MACRO02_STAGE_INCOMPLETE');
  assertSession();return {rows:records.length,queue:outbox.length,issues:plan.issues.length,outboxScopeComplete:plan.outboxScopeComplete,confirmed:plan.confirmed.length,needsReview:plan.needsReview,allowsLiveRestore:false as const,allowsReplay:false as const};
 });
}

/** Explicit cleanup of a staging copy only. Never delete the original export or
 * anything in the operational database. The caller obtains user confirmation. */
export async function removeMacro02RecoveryStage(stageDB:Macro02RecoveryStageDB,uid:string,assertSession:()=>void){
 if(!uid)throw Error('MACRO02_STAGE_ACCOUNT');
 await stageDB.transaction('rw',[stageDB.records,stageDB.originalOutbox,stageDB.evidence],async()=>{
  assertSession();await stageDB.records.where('account_id').equals(uid).delete();await stageDB.originalOutbox.where('account_id').equals(uid).delete();await stageDB.evidence.delete(uid);assertSession();
 });
}
