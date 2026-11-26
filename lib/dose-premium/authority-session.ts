import {acceptMacro02Capability,type AuthorityContext,type AuthorityEvidence,type AuthoritySnapshot,type PendingAuthority} from './account-authority';
import {intentFromQueue,type PendingItem} from './atomic-envelope';

/** Fail-closed count for the complete clinical outbox. Ambiguous scope or
 * protected fields without an atomic intent require reconciliation, not legacy
 * fallback. Ordinary metadata updates still need a separate clinical/visual
 * classification before an active account can be enabled. */
export function countMacro02Pending(rows:readonly PendingItem[],accountId:string):PendingAuthority{
 let legacy=0,premium=0,unclassified=0;
 for(const row of rows){
  if(!['doseLogs','medicamentos','renovacoes','retiradas'].includes(row.table))continue;
  if(typeof row.payload.user_id!=='string'||!row.payload.user_id){unclassified++;continue;}
  if(row.payload.user_id!==accountId)continue;
  if(row.payload.macro02_atomic!==undefined){try{const intent=intentFromQueue(row);if(!intent||intent.stockBefore.user_id!==accountId)throw Error('scope');premium++;}catch{unclassified++;}continue;}
  if(['unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot','estoque_ciclo_id'].some(k=>row.payload[k]!=null)||row.payload.macro02_stock_managed===true){unclassified++;continue;}
  legacy++;
 }
 return {legacy,premium,unclassified};
}
/** Volatile capability cache. Only refresh can use network. Snapshot can be
 * called inside an actual Dexie transaction and never contacts a server.
 * Auth/lifecycle integration must invalidate on session changes and resume.
 * A stale or failed response cannot replace a newer generation. */
export function createMacro02AuthoritySession(host:{
 clientProtocol:number;
 nowMono:()=>number;
 newSessionEpoch:()=>string;
 authenticatedAccount:()=>Promise<string|null>;
 requestCapability:()=>Promise<unknown>;
}){
 let generation=0,sessionEpoch=host.newSessionEpoch(),evidence:AuthorityEvidence|null=null;
 function invalidate(){generation++;sessionEpoch=host.newSessionEpoch();evidence=null;}
 function context(accountId:string):AuthorityContext{return {accountId,sessionEpoch,clientProtocol:host.clientProtocol};}
 async function refresh(accountId:string):Promise<boolean>{
  // A new refresh invalidates a previous in-flight response and cached grant.
  invalidate();const own=generation,ctx=context(accountId);
  try{
   if(!accountId||await host.authenticatedAccount()!==accountId||own!==generation)return false;
   const started=host.nowMono(),raw=await host.requestCapability(),received=host.nowMono();
   if(await host.authenticatedAccount()!==accountId||own!==generation)return false;
   const accepted=acceptMacro02Capability(raw,ctx,started,received);
   if(host.nowMono()>=accepted.deadlineMono||own!==generation)return false;
   evidence=accepted;return true;
  }catch{if(own===generation)invalidate();return false;}
 }
 function snapshot(accountId:string,pending:PendingAuthority):AuthoritySnapshot{return {context:context(accountId),evidence,nowMono:host.nowMono(),pending};}
 return {refresh,invalidate,snapshot};
}
