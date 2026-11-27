import {type PendingItem} from './atomic-envelope';
import {recoveryOperationR7} from './active-receipt-recovery-r7';
import {countMacro02Pending} from './authority-session';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
import {MACRO02_CLINICAL_BACKUP_TABLES} from './clinical-backup-tables';
export {MACRO02_CLINICAL_BACKUP_TABLES} from './clinical-backup-tables';
/** Exact historical outbox evidence. Never import these rows into the live queue.
 * An old backup without this section is readable, but cannot prove completeness. */
export function inspectClinicalBackupEvidence(value:unknown,uid:string,expected:readonly PendingItem[]){
 if(!record(value)||value.user_id!==uid)throw Error('MACRO02_BACKUP_ACCOUNT');
 const raw=value.macro02_clinical_outbox;
 if(raw===undefined)return {complete:false,scopeComplete:false,omittedUnowned:null,legacy:0,premium:expected.length,unclassified:0,dependency:0,allowsMutation:false as const};
 if(!record(raw)||raw.version!==1||raw.user_id!==uid||raw.mode!=='evidence_only_no_replay'||!Array.isArray(raw.rows))throw Error('MACRO02_BACKUP_OUTBOX');
 const omitted=raw.omitted_unowned_count;
 if(omitted!==undefined&&(typeof omitted!=='number'||!Number.isSafeInteger(omitted)||omitted<0))throw Error('MACRO02_BACKUP_OUTBOX_SCOPE_COUNT');
 const seen=new Set<string>(),ids=new Set<string>(),rows:PendingItem[]=[];
 for(const row of raw.rows){
  if(!record(row)||typeof row.table!=='string'||!(MACRO02_CLINICAL_BACKUP_TABLES as readonly string[]).includes(row.table)||typeof row.chave!=='string'||!row.chave||seen.has(row.chave)||typeof row.id!=='string'||!row.id||ids.has(row.id)||!['add','update','delete'].includes(String(row.operation))||!record(row.payload)||row.payload.user_id!==uid)throw Error('MACRO02_BACKUP_OUTBOX_SCOPE');
  seen.add(row.chave);ids.add(row.id);rows.push({table:row.table,chave:row.chave,operation:String(row.operation),payload:row.payload});
 }
 const premium=rows.filter(q=>q.payload.macro02_atomic!==undefined||q.payload.macro02_metadata!==undefined||q.payload.macro02_compound!==undefined);
 // Exact payload (including operation IDs) must be the same as the already validated section.
 if(premium.length!==expected.length||expected.some(q=>!premium.some(r=>r.chave===q.chave&&r.table===q.table&&r.operation===q.operation&&JSON.stringify(r.payload)===JSON.stringify(q.payload)&&!!recoveryOperationR7(r,uid))))throw Error('MACRO02_BACKUP_OUTBOX_DIVERGENCE');
 const ordinary=rows.filter(q=>!premium.includes(q));
 const c=premium.some(q=>q.payload.macro02_compound!==undefined||q.payload.macro02_metadata!==undefined)?{...countMacro02Pending(ordinary,uid),premium:premium.length}:countMacro02Pending(rows,uid);
 return {complete:true,scopeComplete:omitted===0,omittedUnowned:omitted===undefined?null:omitted,...c,dependency:rows.length-c.legacy-c.premium-c.unclassified,allowsMutation:false as const};
}
