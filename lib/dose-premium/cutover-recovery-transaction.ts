import {cutoverLocalIdentity,planMacro02FencedRecovery,type CutoverLocal,type CutoverTable} from './cutover-recovery';
type Row=Record<string,unknown>;
type Expected={account_id:string;fence_id:string;epoch:string};
/** Lab transaction contract only. Do not invoke from the dormant app. The host
 * must hold the server's authenticated write fence AND local write quiescence.
 * A read-only snapshot, R2 grant, JSON file or absence of receipt is insufficient.
 * No queue operations, updates, deletes, stock arithmetic or sync are exposed. */
export async function rehearseMacro02AddOnlyRecovery(host:{
 transaction<T>(run:()=>Promise<T>):Promise<T>;
 readLocal():Promise<CutoverLocal>;
 add(table:CutoverTable,row:Row):Promise<void>;
 assertFenceAndSession():void;
},input:{before:CutoverLocal;backup:CutoverLocal;wire:unknown;expected:Expected}){
 const guard=()=>host.assertFenceAndSession();
 guard();const plan=planMacro02FencedRecovery(input.before,input.backup,input.wire,input.expected);
 return host.transaction(async()=>{
  guard();if(cutoverLocalIdentity(await host.readLocal())!==plan.expectedBefore)throw Error('MACRO02_CUTOVER_LOCAL_CHANGED');
  guard();
  // The adapter must implement add (never put/upsert). Global primary-key
  // collision, foreign account or concurrent insert fails the whole transaction.
  for(const item of plan.adds){guard();await host.add(item.table,item.row);}
  guard();if(cutoverLocalIdentity(await host.readLocal())!==plan.expectedAfter)throw Error('MACRO02_CUTOVER_POSTIMAGE_MISMATCH');
  guard();return {added:plan.adds.length,verified:true as const,allowsActivation:false as const,allowsReplay:false as const};
 });
}
