import {intentFromQueue,type PendingItem} from './atomic-envelope';
import {countMacro02Pending} from './authority-session';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export const MACRO02_CLINICAL_BACKUP_TABLES=['doseLogs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations'] as const;
/** Exact historical outbox evidence. Never import these rows into the live queue.
 * An old backup without this section is readable, but cannot prove completeness. */
export function inspectClinicalBackupEvidence(value:unknown,uid:string,expected:readonly PendingItem[]){
 if(!record(value)||value.user_id!==uid)throw Error('MACRO02_BACKUP_ACCOUNT');
 const raw=value.macro02_clinical_outbox;
 if(raw===undefined)return {complete:false,legacy:0,premium:expected.length,unclassified:0,dependency:0,allowsMutation:false as const};
 if(!record(raw)||raw.version!==1||raw.user_id!==uid||raw.mode!=='evidence_only_no_replay'||!Array.isArray(raw.rows))throw Error('MACRO02_BACKUP_OUTBOX');
 const seen=new Set<string>(),ids=new Set<string>(),rows:PendingItem[]=[];
 for(const row of raw.rows){
  if(!record(row)||typeof row.table!=='string'||!(MACRO02_CLINICAL_BACKUP_TABLES as readonly string[]).includes(row.table)||typeof row.chave!=='string'||!row.chave||seen.has(row.chave)||typeof row.id!=='string'||!row.id||ids.has(row.id)||!['add','update','delete'].includes(String(row.operation))||!record(row.payload)||row.payload.user_id!==uid)throw Error('MACRO02_BACKUP_OUTBOX_SCOPE');
  seen.add(row.chave);ids.add(row.id);rows.push({table:row.table,chave:row.chave,operation:String(row.operation),payload:row.payload});
 }
 const premium=rows.filter(q=>q.payload.macro02_atomic!==undefined);
 // Exact payload (including operation IDs) must be the same as the already validated section.
 if(premium.length!==expected.length||expected.some(q=>!premium.some(r=>r.chave===q.chave&&r.table===q.table&&r.operation===q.operation&&JSON.stringify(r.payload)===JSON.stringify(q.payload)&&!!intentFromQueue(r))))throw Error('MACRO02_BACKUP_OUTBOX_DIVERGENCE');
 const c=countMacro02Pending(rows,uid);
 return {complete:true,...c,dependency:rows.length-c.legacy-c.premium-c.unclassified,allowsMutation:false as const};
}
