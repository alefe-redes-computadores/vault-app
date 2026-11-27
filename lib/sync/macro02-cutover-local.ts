import {db} from '@/lib/db';
import {CUTOVER_TABLES} from '@/lib/dose-premium/cutover-recovery';
import {captureMacro02LocalCutover} from '@/lib/dose-premium/cutover-local-snapshot';
/** Read-only adapter for the actual Vault database. Not called by the dormant
 * release. The authenticated cutover coordinator must supply a synchronous
 * session guard; no network inside the IndexedDB transaction. */
export function readMacro02CutoverLocal(uid:string,assertSession:()=>void){
 const tables=[...CUTOVER_TABLES,'syncQueue' as const].map(name=>db.table(name));
 return captureMacro02LocalCutover({transaction:run=>db.transaction('r',tables,run),readTable:table=>db.table(table).toArray(),assertSession},uid);
}
