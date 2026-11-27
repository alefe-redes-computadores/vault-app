import {validateRawCutoverEvidence} from './cutover-fence-read';
import {CUTOVER_TABLES,cutoverCanonical,cutoverLocalIdentity,inspectMacro02Cutover,planMacro02FencedRecovery,type CutoverLocal,type CutoverRows,type FencedSnapshotWire} from './cutover-recovery';

type Row=Record<string,unknown>;
const fail=(reason:string):never=>{throw Error('MACRO02_PROJECTION_'+reason);};
const clone=<T>(x:T):T=>JSON.parse(cutoverCanonical(x)) as T;
const pair=(r:Row)=>JSON.stringify([r.medicamento_id,r.tratamento_id]);
const canonicalIds=(value:unknown):string[]=>{
 if(!Array.isArray(value)||value.some(v=>typeof v!=='string'||!v||v.trim()!==v)||new Set(value).size!==value.length)return fail('INVALID_LINK_LIST');
 return [...value].sort();
};
const sameIds=(a:unknown,b:readonly string[])=>cutoverCanonical(canonicalIds(a))===cutoverCanonical(b);

/** Projection for the certified LAB protocol only. Never call the live recovery
 * writer with this result. The PostgreSQL evidence remains separate and intact.
 * The standard pull stores medication links in tratamento_ids, not in the old
 * Dexie join store. Existing physical join rows are checked by pair and kept
 * exactly; no synthetic primary key, no cache hydration and no deletion.
 * All other clinical fields retain exact values, including null vs missing.
 * This deliberately does NOT use A0's fallback to local values: a fallback
 * cannot turn an unproven remote fact into authoritative recovery evidence. */
function project(raw:unknown,local:CutoverLocal,epoch:string){
 const uid=local.account_id;
 // Validate local scope, queue shape and original exact identity first.
 const originalLocalIdentity=cutoverLocalIdentity(local);
 const evidence=validateRawCutoverEvidence(raw,uid,epoch);
 const rows=Object.fromEntries(CUTOVER_TABLES.map(table=>[table,evidence.rows[table].map(row=>clone(row))]));
 const byMedication=new Map<string,string[]>(),remotePairs=new Set<string>();
 for(const row of rows.medicamento_tratamentos){
  const key=pair(row);remotePairs.add(key);
  const mid=String(row.medicamento_id),tid=String(row.tratamento_id);
  const ids=byMedication.get(mid)??[];ids.push(tid);byMedication.set(mid,ids);
 }
 const localMeds=new Map(local.rows.medicamentos.map(r=>[r.id,r]));
 const issues=new Set<string>();
 for(const table of CUTOVER_TABLES){
  if(table==='medicamento_tratamentos')continue;
  rows[table]=rows[table].map(row=>{
   // Same transport projection as ordinary pull; synced is a local marker,
   // never an ACK for any pending operation or a grant for clinical writing.
   const next:Row={...row,synced:true};
   if(table==='persons'){
    if(typeof row.is_default!=='boolean'||Object.prototype.hasOwnProperty.call(row,'isDefault'))return fail('PERSON_DEFAULT_SHAPE');
    delete next.is_default;next.isDefault=row.is_default;
   }
   if(table==='medicamentos'){
    const ids=(byMedication.get(String(row.id))??[]).sort();
    // A contradictory remote denormalized list must be reviewed, not erased.
    if(row.tratamento_ids!==undefined&&row.tratamento_ids!==null&&!sameIds(row.tratamento_ids,ids))issues.add('REMOTE_LINK_CONFLICT');
    const existing=localMeds.get(row.id);
    // A different ordering of the same set is not a different clinical link.
    // Retain the exact local order only after verifying the same relation set.
    next.tratamento_ids=existing&&Array.isArray(existing.tratamento_ids)&&sameIds(existing.tratamento_ids,ids)?[...existing.tratamento_ids]:ids;
   }
   return next;
  });
 }
 const cached:Row[]=[];
 for(const row of local.rows.medicamento_tratamentos){
  if(!remotePairs.has(pair(row))){issues.add('LOCAL_LINK_CACHE_CONFLICT');continue;}
  if(typeof row.id!=='string'||!row.id)return fail('LOCAL_LINK_ID_REQUIRED');
  // Do not adopt a remote join UUID as the historical local cache UUID.
  cached.push(clone(row));
 }
 rows.medicamento_tratamentos=cached;
 const expected={account_id:uid,fence_id:evidence.fence_id,epoch};
 const wire:FencedSnapshotWire={version:1,...expected,complete:true,rows:rows as unknown as CutoverRows};
 const inspected=inspectMacro02Cutover(local,wire,expected);
 const inspection={...inspected,blockers:[...inspected.blockers,...issues].sort(),localMatchesFence:inspected.localMatchesFence&&issues.size===0};
 if(cutoverLocalIdentity(local)!==originalLocalIdentity)return fail('LOCAL_CHANGED');
 return {evidence,wire,expected,inspection,issues:[...issues].sort(),remoteLinkCount:remotePairs.size,localLinkCacheCount:cached.length,allowsActivation:false as const,allowsReplay:false as const,allowsAck:false as const,allowsLiveRestore:false as const};
}

/** Public read-only projection: raw evidence is retained but the internal
 * recovery wire is deliberately not exposed as an operational snapshot. */
export function projectMacro02CutoverLab(raw:unknown,local:CutoverLocal,epoch:string){
 const {wire:_wire,expected:_expected,...result}=project(raw,local,epoch);
 return result;
}

/** Rehearse only with an independently captured, exact backup. Cache rows
 * absent from live local state are not materialized from remote IDs. Any
 * difference in historical backup representation remains a blocker. */
export function planMacro02ProjectedRecoveryLab(raw:unknown,local:CutoverLocal,backup:CutoverLocal,epoch:string){
 const projection=project(raw,local,epoch);
 if(projection.issues.length)return fail('EVIDENCE_CONFLICT');
 const plan=planMacro02FencedRecovery(local,backup,projection.wire,projection.expected);
 return {plan,allowsActivation:false as const,allowsReplay:false as const,allowsAck:false as const,allowsLiveRestore:false as const};
}

/** Read-only orchestration of the existing lab fence and Dexie capture. Read
 * twice across the asynchronous boundary so cancellation, epoch replacement or
 * changed local state is never presented as stable evidence. This is not a
 * lease: no caller may use the result to authorize a subsequent write. */
export async function inspectMacro02ProjectedCutoverLab(host:{
 assertSession():void;
 readRemote():Promise<unknown>;
 readLocal():Promise<CutoverLocal>;
},uid:string,epoch:string){
 const guard=()=>host.assertSession();
 guard();const first=validateRawCutoverEvidence(await host.readRemote(),uid,epoch);guard();
 const before=await host.readLocal();guard();
 if(before.account_id!==uid)return fail('LOCAL_ACCOUNT');
 const identity=cutoverLocalIdentity(before);
 const next=validateRawCutoverEvidence(await host.readRemote(),uid,epoch);guard();
 if(cutoverCanonical(first)!==cutoverCanonical(next))return fail('REMOTE_CHANGED');
 const after=await host.readLocal();guard();
 if(after.account_id!==uid||cutoverLocalIdentity(after)!==identity)return fail('LOCAL_CHANGED');
 const result=projectMacro02CutoverLab(next,after,epoch);guard();return result;
}
