import {inspectClinicalBackupEvidence} from '@/lib/dose-premium/clinical-backup-evidence';
import {db} from '@/lib/db';
import {getLocalFirstAuthUser} from '@/lib/supabase/local-auth';
import {enfileirarOperacao,solicitarProcessamentoSync} from '@/lib/sync/enfileirarOperacao';
import {classifyMacro02RecoveryFile,planMacro02QueueRecovery,readMacro02RecoveryFile} from '@/lib/dose-premium/backup-recovery';
import {macro02Authority} from '@/lib/sync/macro02-authority';
import type {PendingItem} from '@/lib/dose-premium/atomic-envelope';

export async function inspectMacro02Backup(file:File,uid:string){
 if(file.size>25*1024*1024)throw Error('Backup maior que 25 MB; preserve o arquivo para revisão assistida.');
 const auth=await getLocalFirstAuthUser();if(auth.error||auth.data.user?.id!==uid)throw Error('Conta não confirmada.');
 const value:unknown=JSON.parse(await file.text());
 const result=readMacro02RecoveryFile(value,uid);
 const outbox=inspectClinicalBackupEvidence(value,uid,result.pending);
 const ledger=await macro02Authority().readLedger(uid,result.pending);
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
