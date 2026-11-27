import {activeReceiptRequestR7} from '@/lib/dose-premium/active-receipt-recovery-r7';
import {readMacro02EnrollmentR5} from '@/lib/sync/macro02-enrollment-r5';
import {inspectClinicalBackupEvidence} from '@/lib/dose-premium/clinical-backup-evidence';
import {db} from '@/lib/db';
import {supabase} from '@/lib/supabase/client';
import {Macro02RecoveryStageDB,restoreMacro02StageEmpty,removeMacro02RecoveryStage} from '@/lib/sync/macro02-recovery-stage';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {classifyMacro02RecoveryFile,planMacro02QueueRecovery,readMacro02RecoveryFile} from '@/lib/dose-premium/backup-recovery';
import {macro02Authority} from '@/lib/sync/macro02-authority';
import type {PendingItem} from '@/lib/dose-premium/atomic-envelope';

async function readRecoveryLedger(uid:string,pending:readonly PendingItem[]){
 let invalid=false;const {data:{subscription}}=supabase.auth.onAuthStateChange(e=>{if(e!=='INITIAL_SESSION')invalid=true;});
 const guard=()=>{if(invalid)throw Error('M02_R7_LEDGER_SESSION');};
 try{
  const bound=pending.some(q=>q.payload.macro02_epoch!==undefined||q.payload.macro02_compound!==undefined||q.payload.macro02_metadata!==undefined);
  // Before migration only historical, unbound evidence may use the old read-only endpoint.
  // Never downgrade an epoch-bound envelope when the active RPC is unavailable.
  let e:Awaited<ReturnType<typeof readMacro02EnrollmentR5>>;
  try{e=await readMacro02EnrollmentR5(uid);}catch(err){guard();if(bound)throw err;const old=await macro02Authority().readLedger(uid,pending);guard();return old;}
  guard();if(e.state!=='premium'||!e.epoch){if(bound)throw Error('M02_R7_LEDGER_EPOCH');const old=await macro02Authority().readLedger(uid,pending);guard();return old;}
  const ids=activeReceiptRequestR7(pending,uid,e.epoch);
  const {data,error}=await supabase.rpc('vault_macro02_read_active_receipts_r7',{p_epoch:e.epoch,p_ids:ids});guard();
  const after=await readMacro02EnrollmentR5(uid);guard();if(error||!data||after.state!=='premium'||after.epoch!==e.epoch||after.generation!==e.generation)throw Error('M02_R7_LEDGER_SESSION');
  return data;
 }finally{invalid=true;subscription.unsubscribe();}
}
export async function inspectMacro02Backup(file:File,uid:string){
 if(file.size>25*1024*1024)throw Error('Backup maior que 25 MB; preserve o arquivo para revisão assistida.');
 const auth=await getLocalFirstAuthUser();if(auth.error||auth.data.user?.id!==uid)throw Error('Conta não confirmada.');
 const value:unknown=JSON.parse(await file.text());
 const result=readMacro02RecoveryFile(value,uid);
 const outbox=inspectClinicalBackupEvidence(value,uid,result.pending);
 const ledger=await readRecoveryLedger(uid,result.pending);
 const verified=classifyMacro02RecoveryFile(value,uid,ledger,ledger.fence_id);
 return {userId:uid,pendingCount:result.pendingCount,confirmed:verified.confirmed.length,needsReview:verified.pendingNeedsRemoteState.length,outbox,allowsMutation:false as const};
}
export async function recoverMacro02Pending(uid:string,pending:readonly PendingItem[]){
 // R2 is read-only: absence at the dormant fence is never permission to replay.
 // This legacy recovery entry point remains blocked until a separate restore protocol is certified.
 const auth=await getLocalFirstAuthUser();if(auth.error||auth.data.user?.id!==uid)throw Error('Conta mudou; recuperação cancelada.');
 const authority=await macro02Authority().prepareWrite(uid);
 if(authority.writer!=='premium')throw Error('MACRO02_RECOVERY_REPLAY_NOT_AUTHORIZED');
 const count=await db.transaction('rw',[db.persons,db.medicamentos,db.doseLogs,db.renovacoes,db.retiradas,db.syncQueue],async()=>{
  const [persons,medications,doses,acquisitions,withdrawals,queue]=await Promise.all([db.persons.where('user_id').equals(uid).toArray(),db.medicamentos.where('user_id').equals(uid).toArray(),db.doseLogs.where('user_id').equals(uid).toArray(),db.renovacoes.where('user_id').equals(uid).toArray(),db.retiradas.where('user_id').equals(uid).toArray(),db.syncQueue.toArray()]);
  await authority.assertCurrent();
  const missing=planMacro02QueueRecovery({userId:uid,persons,medications,doses:doses.map(x=>({...x})),acquisitions:acquisitions.map(x=>({...x})),withdrawals:withdrawals.map(x=>({...x})),queue},pending);
  for(const q of missing){
   if(!['doseLogs','medicamentos','renovacoes'].includes(q.table)||q.operation!=='update')throw Error('Intenção incompatível.');
   await enfileirarOperacao(q.table as 'doseLogs'|'medicamentos'|'renovacoes','update',q.payload,{dispatchSync:false});
   const saved=await db.syncQueue.where('chave').equals(q.chave).first();if(!saved||JSON.stringify(saved.payload)!==JSON.stringify(q.payload))throw Error('Recuperação da fila não confirmada; nada foi alterado.');
  }
  await authority.assertCurrent();return missing.length;
 });
 if(count)solicitarProcessamentoSync();return count;
}

/** Staging is deliberately separate from the operational DB. The authenticated
 * R2 read is evidence only, and expires normally. No grant is reused for replay. */
async function withMacro02RecoverySession<T>(uid:string,run:(assertSession:()=>void)=>Promise<T>):Promise<T>{
 if(!uid||typeof window==='undefined')throw Error('Conta não confirmada.');
 let invalidated=false;
 const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
  if(event!=='INITIAL_SESSION'||session?.user.id!==uid)invalidated=true;
 });
 const assertSession=()=>{if(invalidated)throw Error('Sessão mudou; operação de cópia isolada cancelada.');};
 try{const auth=await getLocalFirstAuthUser();if(auth.error||auth.data.user?.id!==uid)throw Error('Conta não confirmada.');assertSession();return await run(assertSession);}
 finally{subscription.unsubscribe();}
}
export async function stageMacro02Backup(file:File,uid:string){
 if(file.size>25*1024*1024)throw Error('Backup maior que 25 MB; preserve o arquivo para revisão assistida.');
 return withMacro02RecoverySession(uid,async assertSession=>{
  const bytes=await file.arrayBuffer();const sourceSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const parsed=readMacro02RecoveryFile(value,uid);assertSession();
  const ledger=await readRecoveryLedger(uid,parsed.pending);assertSession();
  const stageDB=new Macro02RecoveryStageDB();try{return await restoreMacro02StageEmpty(stageDB,{value,uid,ledger,fence:ledger.fence_id,sourceSha256,assertSession});}finally{stageDB.close();}
 });
}
export async function getMacro02StagedSummary(uid:string){
 return withMacro02RecoverySession(uid,async assertSession=>{
  const stageDB=new Macro02RecoveryStageDB();try{const value=await stageDB.evidence.get(uid);assertSession();return value?{rows:value.rows,queue:value.queue,issues:value.issues.length,outboxScopeComplete:value.outboxScopeComplete,confirmed:value.confirmed.length,needsReview:value.needsReview}:null;}finally{stageDB.close();}
 });
}
export async function clearMacro02StagedBackup(uid:string){
 return withMacro02RecoverySession(uid,async assertSession=>{
  const stageDB=new Macro02RecoveryStageDB();try{await removeMacro02RecoveryStage(stageDB,uid,assertSession);}finally{stageDB.close();}
 });
}
