import {TABLES} from './model';
import type {Scope} from './model';
import {requireScope,fail} from './validation';
/** Only invoked by the existing, explicitly confirmed person deletion transaction.
 * Normal Vital row deletion remains a tombstone; no new delete action or remote writer. */
export const VITAL_PERSON_STORES=[...TABLES,'vital_drafts','vital_sync_ack'] as const;
export interface RemovalCollection {delete():PromiseLike<number>;}
export interface RemovalTable {where(index:string):{equals(key:readonly string[]):RemovalCollection};}
export function isVitalPersonQueueRow(row:{table:string;payload:Record<string,unknown>},scope:Scope){return TABLES.includes(row.table as typeof TABLES[number])&&row.payload.user_id===scope.user_id&&row.payload.person_id===scope.person_id;}
export async function removeVitalForOwnedPerson(scope:Scope,ports:{person:()=>PromiseLike<{user_id?:string}|undefined>;table:(name:string)=>RemovalTable;removeQueue:(s:Scope)=>PromiseLike<unknown>}){const s=requireScope(scope);if((await ports.person())?.user_id!==s.user_id)fail('Pessoa fora da conta; exclusão bloqueada.');for(const name of VITAL_PERSON_STORES)await ports.table(name).where('[user_id+person_id]').equals([s.user_id,s.person_id]).delete();await ports.removeQueue(s);}
