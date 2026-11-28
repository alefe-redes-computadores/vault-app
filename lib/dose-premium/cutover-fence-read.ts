import {CUTOVER_TABLES,cutoverCanonical,type CutoverTable,type CutoverRows} from './cutover-recovery';
// Raw PG evidence is NOT a local Dexie image or a clinical grant. Do not call
// planMacro02FencedRecovery on this object: the projection layer is separate.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
type Row=Record<string,unknown>;
const record=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const fail=(s:string):never=>{throw Error('M02_FENCE_LAB_'+s);};
export type RawCutoverEvidence=Readonly<{format:'macro02-raw-pg-lab-v1';account_id:string;epoch:string;fence_id:string;complete:true;rows:CutoverRows;allows_activation:false;allows_replay:false}>;
export function validateRawCutoverEvidence(raw:unknown,uid:string,epoch:string):RawCutoverEvidence{
 if(!uuid(uid)||!uuid(epoch)||!record(raw)||raw.format!=='macro02-raw-pg-lab-v1'||raw.account_id!==uid||raw.epoch!==epoch||raw.fence_id!==`m02-cutover-lab:${uid}:${epoch}`||raw.complete!==true||raw.allows_activation!==false||raw.allows_replay!==false||!record(raw.rows))return fail('SCOPE');
 if(Object.keys(raw).sort().join(',')!=='account_id,allows_activation,allows_replay,complete,epoch,fence_id,format,rows'||Object.keys(raw.rows).length!==CUTOVER_TABLES.length)return fail('SHAPE');
 const rows=validateMacro02ScopedRows(raw.rows,uid);
 // The existing strict server envelope remains independent of the preflight.
 return JSON.parse(cutoverCanonical({...raw,rows})) as RawCutoverEvidence;
}
/** Validate only the scoped rows; this never proves a fence or grants authority. */
export function validateMacro02ScopedRows(raw:unknown,uid:string):CutoverRows{
 if(!uuid(uid)||!record(raw)||Object.keys(raw).length!==CUTOVER_TABLES.length)return fail('SHAPE');
 const indexed=new Map<CutoverTable,Map<string,Row>>();
 for(const table of CUTOVER_TABLES){const rows=raw[table];if(!Array.isArray(rows))return fail('TABLE');const byId=new Map<string,Row>();for(const row of rows){if(!record(row)||!uuid(row.id)||byId.has(row.id))return fail('ROW');if(table!=='medicamento_tratamentos'&&row.user_id!==uid)return fail('ACCOUNT');if(table==='medicamento_tratamentos'&&(!uuid(row.medicamento_id)||!uuid(row.tratamento_id)||Object.keys(row).sort().join(',')!=='id,medicamento_id,tratamento_id'))return fail('JOIN');cutoverCanonical(row);byId.set(row.id,row);}indexed.set(table,byId);}
 const pairs=new Set<string>();for(const row of indexed.get('medicamento_tratamentos')!.values()){
  const m=indexed.get('medicamentos')!.get(String(row.medicamento_id)),t=indexed.get('tratamentos')!.get(String(row.tratamento_id)),pair=`${row.medicamento_id}:${row.tratamento_id}`;
  if(!m||!t||m.user_id!==uid||t.user_id!==uid||!uuid(m.person_id)||m.person_id!==t.person_id||pairs.has(pair))return fail('JOIN_SCOPE');pairs.add(pair);
 }
 // Copy, rather than return a caller-owned mutable object. No field is dropped.
 return JSON.parse(cutoverCanonical(raw)) as CutoverRows;
}
/** The session-generation guard belongs to the authenticated host. This read
 * does not renew a lease, permit a write, ACK a queue or prove all devices. */
export async function readAuthenticatedRawCutoverLab(host:{authenticatedAccount:()=>Promise<string|null>;assertSession:()=>void;readSnapshot:(epoch:string)=>Promise<unknown>},uid:string,epoch:string){
 if(!uuid(uid)||!uuid(epoch))return fail('IDENTITY');host.assertSession();
 if(await host.authenticatedAccount()!==uid)return fail('AUTH');host.assertSession();
 const raw=await host.readSnapshot(epoch);host.assertSession();
 if(await host.authenticatedAccount()!==uid)return fail('AUTH_CHANGED');host.assertSession();
 const evidence=validateRawCutoverEvidence(raw,uid,epoch);host.assertSession();return evidence;
}
