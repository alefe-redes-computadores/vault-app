import {cutoverCanonical,type CutoverLocal,type CutoverTable} from './cutover-recovery';
import {exactMacro02LocalIdentity,exportMacro02ExactRecoveryImage,readMacro02ExactRecoveryImage,normalizeMacro02LocalForComparison,normalizeMacro02RemoteForComparison,materializeExactMacro02Adds} from './cutover-storage-codec';
import {validateRawCutoverEvidence} from './cutover-fence-read';
import {planMacro02ProjectedRecoveryLab,projectMacro02CutoverLab} from './cutover-projection-lab';

// R3 recovery is NOT the R2 receipt reader, an ordinary pull, or a local flag.
// The authenticated server must hold a non-expiring preparation claim until
// an explicit, independently reviewed completion/abandonment. No timeout
// can silently turn a frozen account back into a writable legacy account.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const uuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const fail=(s:string):never=>{throw Error('M02_OPERATIONAL_RECOVERY_'+s);};
type Scope=Readonly<{uid:string;epoch:string;operationId:string}>;
type Claim=Readonly<{format:'macro02-recovery-claim-r3';account_id:string;epoch:string;operation_id:string;state:'held';fence_id:string;server_snapshot_sha256:string;snapshot:unknown;allows_activation:false;allows_replay:false}>;
export type RecoveryReceipt=Readonly<{format:'macro02-recovery-receipt-r3';account_id:string;epoch:string;operation_id:string;fence_id:string;state:'local_verified';source_sha256:string;local_sha256:string;remote_sha256:string;server_snapshot_sha256:string;added:number;allows_activation:false;allows_replay:false}>;

function validateClaim(raw:unknown,s:Scope):Claim {
 if(!uuid(s.uid)||!uuid(s.epoch)||!uuid(s.operationId)||!record(raw)||raw.format!=='macro02-recovery-claim-r3'||raw.account_id!==s.uid||raw.epoch!==s.epoch||raw.operation_id!==s.operationId||raw.state!=='held'||raw.fence_id!==`m02-cutover-r3:${s.uid}:${s.epoch}`||raw.allows_activation!==false||raw.allows_replay!==false||typeof raw.server_snapshot_sha256!=='string'||!HASH.test(raw.server_snapshot_sha256)||!record(raw.snapshot))return fail('CLAIM_SCOPE');
 if(Object.keys(raw).sort().join(',')!=='account_id,allows_activation,allows_replay,epoch,fence_id,format,operation_id,server_snapshot_sha256,snapshot,state')return fail('CLAIM_SHAPE');
 // Preserve the real server envelope. The already-certified projection
 // consumes a separately validated, non-authorizing internal representation.
 const snapshot=raw.snapshot;
 if(snapshot.format!=='macro02-raw-pg-r3'||snapshot.fence_id!==raw.fence_id)return fail('SNAPSHOT_SCOPE');
 validateRawCutoverEvidence({...snapshot,format:'macro02-raw-pg-lab-v1',fence_id:`m02-cutover-lab:${s.uid}:${s.epoch}`},s.uid,s.epoch);
 return JSON.parse(cutoverCanonical(raw)) as Claim;
}
function projectionInput(c:Claim){
 return {...c.snapshot as Record<string,unknown>,format:'macro02-raw-pg-lab-v1',fence_id:`m02-cutover-lab:${c.account_id}:${c.epoch}`};
}
export type RecoveryHost={
 authenticatedAccount:()=>Promise<string|null>;
 assertSession:()=>void;
 acquire:(scope:Scope)=>Promise<unknown>;
 reread:(scope:Scope)=>Promise<unknown>;
 finalize:(receipt:RecoveryReceipt)=>Promise<unknown>;
 sha256:(text:string)=>Promise<string>;
 readLocal:()=>Promise<CutoverLocal>;
 transaction:<T>(fn:()=>Promise<T>)=>Promise<T>;
 add:(table:CutoverTable,row:Record<string,unknown>)=>Promise<void>;
};
/** Add-only recovery under a server-held, account-specific freeze. Input
 * backup must be an independently retained complete exact local image.
 * The server receipt is deliberately NOT activation or a sync ACK.
 * If a post-commit RPC fails, leave the claim held; retry the same operation
 * with the same backup. Do not auto-cancel, replay, or undo clinical facts. */
export async function recoverMacro02Operational(host:RecoveryHost,input:{scope:Scope;backup:CutoverLocal;sourceSha256:string}){
 const {scope,sourceSha256}=input;const guard=host.assertSession;
 if(!HASH.test(sourceSha256)||input.backup.account_id!==scope.uid)return fail('BACKUP_SCOPE');
 const backup=readMacro02ExactRecoveryImage(JSON.parse(exportMacro02ExactRecoveryImage(input.backup)),scope.uid);
 // Bind the independent source bytes at the adapter boundary; the supplied
 // SHA is evidence, not proof of provenance or authority by itself.
 const assertAccount=async()=>{guard();if(await host.authenticatedAccount()!==scope.uid)return fail('AUTH');guard();};
 await assertAccount();
 const claim=validateClaim(await host.acquire(scope),scope);await assertAccount();
 const before=await host.readLocal();guard();if(before.account_id!==scope.uid)return fail('LOCAL_SCOPE');
 const raw=normalizeMacro02RemoteForComparison(projectionInput(claim));
 const comparison=planMacro02ProjectedRecoveryLab(raw,normalizeMacro02LocalForComparison(before),normalizeMacro02LocalForComparison(backup),scope.epoch).plan;
 const planned=materializeExactMacro02Adds(before,backup,comparison.adds);
 // Re-read immediately before opening the IndexedDB transaction. Server
 // contract forbids cancellation/activation while this exact claim is held.
 const confirmed=validateClaim(await host.reread(scope),scope);await assertAccount();
 if(cutoverCanonical(claim)!==cutoverCanonical(confirmed))return fail('CLAIM_CHANGED');
 const verified=await host.transaction(async()=>{
  guard();if(exactMacro02LocalIdentity(await host.readLocal())!==planned.expectedBefore)return fail('LOCAL_CHANGED');
  for(const item of planned.adds){guard();await host.add(item.table,item.row);}
  guard();const actual=await host.readLocal();
  if(exactMacro02LocalIdentity(actual)!==planned.expectedAfter)return fail('POSTIMAGE');
  if(!projectMacro02CutoverLab(raw,normalizeMacro02LocalForComparison(actual),scope.epoch).inspection.localMatchesFence)return fail('POSTIMAGE_PROJECTION');
  guard();return planned.expectedAfter;
 });
 await assertAccount();
 const stillHeld=validateClaim(await host.reread(scope),scope);await assertAccount();
 if(cutoverCanonical(claim)!==cutoverCanonical(stillHeld))return fail('CLAIM_CHANGED_AFTER_COMMIT');
 if(exactMacro02LocalIdentity(await host.readLocal())!==verified)return fail('LOCAL_CHANGED_AFTER_COMMIT');
 guard();const local_sha256=await host.sha256(verified),remote_sha256=await host.sha256(cutoverCanonical(claim.snapshot));
 if(!HASH.test(local_sha256)||!HASH.test(remote_sha256))return fail('HASH');
 const receipt:RecoveryReceipt={format:'macro02-recovery-receipt-r3',account_id:scope.uid,epoch:scope.epoch,operation_id:scope.operationId,fence_id:claim.fence_id,state:'local_verified',source_sha256:sourceSha256,local_sha256,remote_sha256,server_snapshot_sha256:claim.server_snapshot_sha256,added:planned.adds.length,allows_activation:false,allows_replay:false};
 await assertAccount();
 const response=await host.finalize(receipt);await assertAccount();
 if(!record(response)||response.format!=='macro02-recovery-completion-r3'||response.account_id!==scope.uid||response.epoch!==scope.epoch||response.operation_id!==scope.operationId||response.state!=='local_verified'||response.local_sha256!==local_sha256||response.remote_sha256!==remote_sha256||response.server_snapshot_sha256!==claim.server_snapshot_sha256||response.source_sha256!==sourceSha256||response.allows_activation!==false||response.allows_replay!==false)return fail('RECEIPT_UNCONFIRMED');
 return {receipt,allowsActivation:false as const,allowsReplay:false as const,allowsAck:false as const};
}
