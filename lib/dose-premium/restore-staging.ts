import {MACRO02_CLINICAL_BACKUP_TABLES,inspectClinicalBackupEvidence} from './clinical-backup-evidence';
import {classifyMacro02RecoveryFile,readMacro02RecoveryFile} from './backup-recovery';
import type {PendingItem} from './atomic-envelope';

type Row=Record<string,unknown>;
const record=(x:unknown):x is Row=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=256&&x.trim()===x;
export type StagedClinicalRow={table:string;row_id:string;row:Row};
const keys:Record<string,string>={doseLogs:'dose_logs'};
const samePersonTables=new Set(['medicamentos','renovacoes','retiradas','doseLogs','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations']);
const references:Record<string,string>={medicamento_id:'medicamentos',renovacao_origem_id:'renovacoes',renovacao_realizada_id:'renovacoes',renovacao_anterior_id:'renovacoes',renovacao_atual_id:'renovacoes',retirada_id:'retiradas',medico_id:'medicos',profissional_id:'medicos',farmacia_id:'farmacias',hospital_id:'hospitais',local_id:'locais',tratamento_id:'tratamentos',cid_id:'cids',fornecimento_id:'fornecimentos',processo_id:'fornecimentos',fornecimento_ciclo_id:'fornecimento_ciclos',ciclo_id:'fornecimento_ciclos',documento_id:'documents',document_id:'documents'};
/** Import evidence without silently repairing or dropping original historical rows.
 * Missing historical dependencies are recorded, not synthesized. No returned
 * object is a replay or live-restore permit. Unrelated credential tables are
 * never copied. A separate verified remote-snapshot protocol is still required. */
export function prepareMacro02RecoveryStage(value:unknown,uid:string,ledger:unknown,fence:string){
 if(!id(uid)||!record(value))throw Error('MACRO02_STAGE_ACCOUNT');
 const verified=readMacro02RecoveryFile(value,uid);
 const evidence=inspectClinicalBackupEvidence(value,uid,verified.pending);
 const classified=classifyMacro02RecoveryFile(value,uid,ledger,fence);
 if(!evidence.complete||!record(value.macro02_clinical_outbox)||!Array.isArray(value.macro02_clinical_outbox.rows))throw Error('MACRO02_STAGE_OUTBOX_MISSING');
 const rows:StagedClinicalRow[]=[];const indexes=new Map<string,Map<string,Row>>();
 for(const table of MACRO02_CLINICAL_BACKUP_TABLES){
  const raw=value[keys[table]??table];if(!Array.isArray(raw))throw Error('MACRO02_STAGE_TABLE_MISSING:'+table);
  const map=new Map<string,Row>();indexes.set(table,map);
  for(const row of raw){if(!record(row)||row.user_id!==uid||!id(row.id)||map.has(row.id))throw Error('MACRO02_STAGE_ROW_SCOPE:'+table);map.set(row.id,row);rows.push({table,row_id:row.id,row});}
 }
 // Relational links lack user_id. Their scope comes only from the two
 // validated account-owned endpoints, never from an inferred default person.
 const links=value.medicamento_tratamentos;
 if(!Array.isArray(links))throw Error('MACRO02_STAGE_TABLE_MISSING:medicamento_tratamentos');
 const linkKeys=new Set<string>();
 for(const row of links){
  if(!record(row)||!id(row.medicamento_id)||!id(row.tratamento_id)||!indexes.get('medicamentos')!.has(row.medicamento_id)||!indexes.get('tratamentos')!.has(row.tratamento_id))throw Error('MACRO02_STAGE_LINK_SCOPE');
  const key=id(row.id)?row.id:JSON.stringify([row.medicamento_id,row.tratamento_id]);if(linkKeys.has(key))throw Error('MACRO02_STAGE_DUPLICATE_LINK');linkKeys.add(key);
  if(row.user_id!=null&&row.user_id!==uid)throw Error('MACRO02_STAGE_LINK_SCOPE');
  const m=indexes.get('medicamentos')!.get(row.medicamento_id)!,t=indexes.get('tratamentos')!.get(row.tratamento_id)!;
  if(m.person_id!=null&&t.person_id!=null&&m.person_id!==t.person_id)throw Error('MACRO02_STAGE_LINK_SCOPE');
  rows.push({table:'medicamento_tratamentos',row_id:key,row});
 }
 const issues:{table:string;row_id:string;dependency:string;reference:string}[]=[];
 for(const item of rows){const {table,row_id,row}=item;
  if(table!=='persons'&&row.person_id!=null){if(!id(row.person_id))throw Error('MACRO02_STAGE_PERSON_INVALID');if(!indexes.get('persons')!.has(row.person_id))issues.push({table,row_id,dependency:'persons',reference:row.person_id});}
  for(const [field,target] of Object.entries(references)){
   const ref=row[field];if(ref==null||ref==='')continue;if(!id(ref))throw Error('MACRO02_STAGE_REFERENCE_INVALID:'+field);
   const linked=indexes.get(target)?.get(ref);if(!linked){issues.push({table,row_id,dependency:target,reference:ref});continue;}
   if(samePersonTables.has(target)&&samePersonTables.has(table)&&row.person_id!=null&&linked.person_id!=null&&row.person_id!==linked.person_id)throw Error('MACRO02_STAGE_CROSS_PERSON_REFERENCE:'+field);
  }
 }
 const queue=value.macro02_clinical_outbox.rows as Row[];
 // Validation above compares original Premium envelopes and rejects duplicate
 // or cross-account keys. Legacy payloads are kept exactly, never re-enqueued.
 const pending:readonly PendingItem[]=verified.pending;
 return {account_id:uid,rows,queue,pending,ledger,issues,outboxScopeComplete:evidence.scopeComplete,omittedUnowned:evidence.omittedUnowned,confirmed:classified.confirmed,needsReview:classified.pendingNeedsRemoteState.length,allowsReplay:false as const,allowsLiveRestore:false as const};
}
export type Macro02RecoveryStage=ReturnType<typeof prepareMacro02RecoveryStage>;
