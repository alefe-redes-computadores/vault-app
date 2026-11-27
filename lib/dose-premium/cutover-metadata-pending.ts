import {parseMacro02MetadataIntent,type MetadataTable} from './cutover-metadata-intent';
import {residualMetadataQueueKey} from './cutover-metadata-batch';
import type {PendingItem} from './atomic-envelope';

/** A metadata envelope can represent many rows, including local deletions.
 * Protect every row (and affected medication) rather than only the queue anchor.
 * A malformed envelope is never treated as empty evidence. */
export function metadataPendingProtection(queue:readonly PendingItem[],uid:string){
 const byTable=new Map<string,Set<string>>();let ambiguous=false;
 function add(table:string,id:unknown){if(typeof id!=='string'||!id){ambiguous=true;return;}let s=byTable.get(table);if(!s){s=new Set();byTable.set(table,s);}s.add(id);}
 for(const q of queue){const p=q.payload;if(!p||p.macro02_metadata===undefined)continue;
  try{
   const intent=parseMacro02MetadataIntent(p.macro02_metadata);
   const c=intent.changes[0],r=(c.after??c.before)!;
   if(q.operation!=='update'||q.chave!==residualMetadataQueueKey(intent)||q.table!==c.table||p.user_id!==intent.account_id||p.person_id!==r.person_id||p.id!==r.id||p.macro02_atomic!==undefined)throw Error('M02_METADATA_QUEUE_SCOPE');
   if(intent.account_id!==uid)continue;
   for(const change of intent.changes){const row=(change.after??change.before)!;add(change.table,row.id);
    if(change.table!=='medicamentos'){for(const r of [change.before,change.after])if(r)add('medicamentos',r.medicamento_id);}
    if(change.receipt)add('renovacoes',change.receipt.id);
   }
  }catch{if(p.user_id===uid||typeof p.user_id!=='string')ambiguous=true;else {
    // A malformed foreign-looking envelope may have a forged outer owner.
    // Do not ignore it unless both scopes agree and its intent parses.
    try{if(parseMacro02MetadataIntent(p.macro02_metadata).account_id!==p.user_id)ambiguous=true;}catch{ambiguous=true;}
   }}
 }
 return {ambiguous,has:(table:MetadataTable,id:string)=>ambiguous||!!byTable.get(table)?.has(id)};
}
