/** Macro02 transition contract. The server fence remains a mandatory prerequisite.
 * An account capability is issued by an authenticated server only after its
 * cutover fence has been established. No cached boolean or RPC failure is proof.
 * The transport/session adapter is responsible for authenticating the response;
 * this module checks scope, protocol, monotonic freshness and pending writers.
 */
export type Macro02Writer = 'legacy' | 'premium';
export type AuthorityContext = Readonly<{
  accountId: string;
  sessionEpoch: string; // volatile epoch: rotate on logout/account switch/restart
  clientProtocol: number;
}>;
export type CapabilityWire = Readonly<{
  version: 1;
  account_id: string;
  writer: Macro02Writer;
  epoch: string; // server cutover generation, never client-generated
  fence_id: string; // identifies a server-enforced capability interval
  issued_at_ms: number;
  expires_at_ms: number;
  minimum_protocol: number;
}>;
export type AuthorityEvidence = Readonly<{
  wire: CapabilityWire;
  accountId: string;
  sessionEpoch: string;
  receivedMono: number;
  deadlineMono: number;
}>;
export type PendingAuthority = Readonly<{legacy: number; premium: number; unclassified: number}>;
export type Decision = Readonly<{kind:'allow';writer:Macro02Writer;epoch:string;fenceId:string;deadlineMono:number;sessionEpoch:string} | {kind:'hold';reason:'unknown'|'scope'|'expired'|'client'|'pending-conflict'|'invalid-clock'}>;
const maxLeaseMs=5*60*1000;
const issuedEvidence=new WeakSet<AuthorityEvidence>();
const isString=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=256&&v.trim()===v;
const isTick=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const isInt=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const sameScope=(ctx:AuthorityContext,e:AuthorityEvidence)=>ctx.accountId===e.accountId&&ctx.sessionEpoch===e.sessionEpoch;
/** Do not deserialize an evidence object from storage. Only this parser, called
 * after a successful authenticated RPC in the current session, may issue one.
 * Subtract the entire request RTT; no trust in the device wall clock. */
export function acceptMacro02Capability(raw:unknown,ctx:AuthorityContext,startedMono:number,receivedMono:number):AuthorityEvidence {
  if(!isString(ctx.accountId)||!isString(ctx.sessionEpoch)||!isInt(ctx.clientProtocol)||ctx.clientProtocol===0||!isTick(startedMono)||!isTick(receivedMono)||receivedMono<startedMono)throw Error('MACRO02_CAPABILITY_CONTEXT');
  if(!isRecord(raw)||raw.version!==1||raw.account_id!==ctx.accountId||(raw.writer!=='legacy'&&raw.writer!=='premium')||!isString(raw.epoch)||!isString(raw.fence_id)||!isInt(raw.issued_at_ms)||!isInt(raw.expires_at_ms)||!isInt(raw.minimum_protocol)||raw.minimum_protocol===0)throw Error('MACRO02_CAPABILITY_INVALID');
  const ttl=raw.expires_at_ms-raw.issued_at_ms,remaining=ttl-(receivedMono-startedMono);
  if(ttl<=0||ttl>maxLeaseMs||remaining<=0)throw Error('MACRO02_CAPABILITY_EXPIRED');
  if(ctx.clientProtocol<raw.minimum_protocol)throw Error('MACRO02_CLIENT_INCOMPATIBLE');
  const wire=Object.freeze({version:1,account_id:ctx.accountId,writer:raw.writer as Macro02Writer,epoch:raw.epoch,fence_id:raw.fence_id,issued_at_ms:raw.issued_at_ms,expires_at_ms:raw.expires_at_ms,minimum_protocol:raw.minimum_protocol} as const);
  const evidence=Object.freeze({wire,accountId:ctx.accountId,sessionEpoch:ctx.sessionEpoch,receivedMono,deadlineMono:receivedMono+remaining});
  issuedEvidence.add(evidence);
  return evidence;
}
/** Choose before local transaction or creating any queue intent; re-check in
 * the transaction immediately before mutations and again before commit. A hold
 * is not a clinical fact and may only preserve an explicitly labelled draft.
 * The caller counts pending clinical intentions for the account (not UI state).
 */
export function selectMacro02Writer(ctx:AuthorityContext,e:AuthorityEvidence|null,nowMono:number,pending:PendingAuthority):Decision{
  if(!e||!issuedEvidence.has(e))return {kind:'hold',reason:'unknown'};
  if(!sameScope(ctx,e)||e.wire.account_id!==ctx.accountId)return {kind:'hold',reason:'scope'};
  if(!isTick(nowMono)||nowMono<e.receivedMono)return {kind:'hold',reason:'invalid-clock'};
  if(nowMono>=e.deadlineMono)return {kind:'hold',reason:'expired'};
  if(!isInt(ctx.clientProtocol)||ctx.clientProtocol<e.wire.minimum_protocol)return {kind:'hold',reason:'client'};
  if(![pending.legacy,pending.premium,pending.unclassified].every(isInt)||pending.unclassified!==0||(e.wire.writer==='legacy'?pending.premium!==0:pending.legacy!==0))return {kind:'hold',reason:'pending-conflict'};
  return {kind:'allow',writer:e.wire.writer,epoch:e.wire.epoch,fenceId:e.wire.fence_id,deadlineMono:e.deadlineMono,sessionEpoch:e.sessionEpoch};
}
/** Validate that the same grant still permits this transaction, not another
 * account, epoch or writer. A replacement grant requires a new reviewed intent. */
export function assertSameMacro02Authority(selected:Decision,ctx:AuthorityContext,e:AuthorityEvidence|null,nowMono:number,pending:PendingAuthority):void{
  const current=selectMacro02Writer(ctx,e,nowMono,pending);
  if(selected.kind!=='allow'||current.kind!=='allow'||selected.writer!==current.writer||selected.epoch!==current.epoch||selected.fenceId!==current.fenceId||selected.deadlineMono!==current.deadlineMono||selected.sessionEpoch!==current.sessionEpoch)throw Error('MACRO02_AUTHORITY_CHANGED');
}
/** Existing intents stay tied to their originating writer. Changing capability,
 * timeout, RPC rejection or lost ACK can defer an intent, never migrate it. */
export function selectExistingIntentDispatch(origin:Macro02Writer,decision:Decision):'send-original'|'retain' {
  return decision.kind==='allow'&&decision.writer===origin?'send-original':'retain';
}

export type AuthoritySnapshot=Readonly<{context:AuthorityContext;evidence:AuthorityEvidence|null;nowMono:number;pending:PendingAuthority}>;
/** Transaction adapter contract. The host must implement an actual rollback-
 * capable transaction covering all local facts and outbox writes. Snapshot
 * inside the callback may only read the same local transaction/session; never
 * call network or trigger dispatch from either writer. Dispatch follows commit.
 * This function never retries or falls back after a writer throws. */
export async function runWithMacro02Authority<T>(host:{
  snapshot:()=>Promise<AuthoritySnapshot>;
  transaction:(run:()=>Promise<T>)=>Promise<T>;
  writeLegacy:()=>Promise<T>;
  writePremium:()=>Promise<T>;
}):Promise<T>{
  const first=await host.snapshot(),selected=selectMacro02Writer(first.context,first.evidence,first.nowMono,first.pending);
  if(selected.kind!=='allow')throw Error('MACRO02_AUTHORITY_HOLD:'+selected.reason);
  return host.transaction(async()=>{
    const before=await host.snapshot();assertSameMacro02Authority(selected,before.context,before.evidence,before.nowMono,before.pending);
    const result=selected.writer==='legacy'?await host.writeLegacy():await host.writePremium();
    const after=await host.snapshot();assertSameMacro02Authority(selected,after.context,after.evidence,after.nowMono,after.pending);
    return result;
  });
}
