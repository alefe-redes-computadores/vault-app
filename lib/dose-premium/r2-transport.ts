import {assertSameMacro02Authority,selectMacro02Writer,type AuthoritySnapshot,type Decision,type Macro02Writer} from './account-authority';
import {createMacro02AuthoritySession,countMacro02Pending} from './authority-session';
import {intentFromQueue,type PendingItem} from './atomic-envelope';

/** R2 is a dormant-only server contract, not an activation protocol. */
export const R2_CAPABILITY_RPC='vault_macro02_read_capability_r1';
export const R2_RECEIPTS_RPC='vault_macro02_read_operation_receipts_r1';
const epoch='m02-dormant-r1';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const empty={legacy:0,premium:0,unclassified:0};
type Allowed=Extract<Decision,{kind:'allow'}>;
export function createMacro02R2Transport(host:{
 nowMono:()=>number;newSessionEpoch:()=>string;
 authenticatedAccount:()=>Promise<string|null>;
 rpc:(name:string,args?:Record<string,unknown>)=>Promise<unknown>;
 queue:()=>Promise<readonly PendingItem[]>;
}){
 const session=createMacro02AuthoritySession({...host,clientProtocol:2,requestCapability:async()=>{
  const raw=await host.rpc(R2_CAPABILITY_RPC);
  if(!record(raw)||raw.writer!=='legacy'||raw.epoch!==epoch||typeof raw.account_id!=='string'||raw.fence_id!==`${epoch}:${raw.account_id}`||raw.minimum_protocol!==2)throw Error('MACRO02_R2_DORMANT_CONTRACT');
  return raw;
 }});
 let flight:{uid:string;promise:Promise<boolean>}|null=null;
 function invalidate(){flight=null;session.invalidate();}
 function decision(uid:string){const snap=session.snapshot(uid,empty);return selectMacro02Writer(snap.context,snap.evidence,snap.nowMono,snap.pending);}
 async function grant(uid:string):Promise<Allowed>{
  if(!uid||await host.authenticatedAccount()!==uid)throw Error('MACRO02_ACCOUNT_UNCONFIRMED');
  let selected=decision(uid);
  if(selected.kind!=='allow'){
   if(flight&&flight.uid!==uid)invalidate();
   if(!flight){const promise=session.refresh(uid);flight={uid,promise};}
   const own=flight;
   const ok=await own.promise;
   if(flight===own)flight=null;
   if(!ok)throw Error('MACRO02_CAPABILITY_UNAVAILABLE');
   selected=decision(uid);
  }
  if(selected.kind!=='allow')throw Error('MACRO02_AUTHORITY_HOLD:'+selected.reason);
  return selected;
 }
 function assertSelected(uid:string,selected:Allowed,pending:AuthoritySnapshot['pending']){
  const s=session.snapshot(uid,pending);assertSameMacro02Authority(selected,s.context,s.evidence,s.nowMono,s.pending);
 }
 /** Call before opening the write transaction; assertCurrent inside it and before
  * commit. No network or auth storage access in the transaction. */
 async function prepareWrite(uid:string):Promise<{writer:Macro02Writer;assertCurrent:()=>Promise<void>}>{
  const selected=await grant(uid);
  const assertCurrent=async()=>{const rows=await host.queue();assertSelected(uid,selected,countMacro02Pending(rows,uid));};
  await assertCurrent();return {writer:selected.writer,assertCurrent};
 }
 /** Read-only proof. Pending incompatible writers do not block inspection, but
  * neither the fence nor absence is a permission to restore/replay. */
 async function readLedger(uid:string,items:readonly PendingItem[]){
  const selected=await grant(uid);const ids=items.map(q=>{const i=intentFromQueue(q);if(!i||i.stockBefore.user_id!==uid||!uuid.test(i.operationId))throw Error('MACRO02_LEDGER_SCOPE');return i.operationId;});
  if(new Set(ids).size!==ids.length)throw Error('MACRO02_LEDGER_DUPLICATE');
  const rows:unknown[]=[];
  for(let offset=0;offset<ids.length;offset+=100){
   assertSelected(uid,selected,empty);const batch=ids.slice(offset,offset+100);
   const raw=await host.rpc(R2_RECEIPTS_RPC,{p_ids:batch,p_fence_id:selected.fenceId});
   if(await host.authenticatedAccount()!==uid)throw Error('MACRO02_ACCOUNT_CHANGED');
   assertSelected(uid,selected,empty);
   if(!record(raw)||raw.account_id!==uid||raw.fence_id!==selected.fenceId||raw.complete!==true||!Array.isArray(raw.rows)||raw.rows.length!==batch.length)throw Error('MACRO02_LEDGER_INCOMPLETE');
   const seen=new Set<string>();for(const row of raw.rows){if(!record(row)||typeof row.operation_id!=='string'||!batch.includes(row.operation_id)||seen.has(row.operation_id))throw Error('MACRO02_LEDGER_SCOPE');seen.add(row.operation_id);rows.push(row);}
  }
  assertSelected(uid,selected,empty);
  return {account_id:uid,fence_id:selected.fenceId,complete:true as const,rows};
 }
 return {invalidate,prepareWrite,readLedger};
}
