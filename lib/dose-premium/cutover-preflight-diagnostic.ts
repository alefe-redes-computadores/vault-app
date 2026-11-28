/** Safe output only: fixed schema/category names and aggregate counts. */
import {CUTOVER_TABLES} from './cutover-recovery';
import {MACRO02_R3_REMOTE_COLUMNS} from './cutover-storage-codec';
export type AuditItem={table:string;field?:string;category:string;count:number};
const names=new Set<string>([...CUTOVER_TABLES,'GLOBAL']);
const fields=new Set([...Object.values(MACRO02_R3_REMOTE_COLUMNS).flatMap(s=>s.split(',')),'synced','isDefault','visual_icon_expanded','UNMAPPED','person_id','medicamento_id','tratamento_id','renovacao_origem_id','renovacao_realizada_id','renovacao_anterior_id','renovacao_atual_id','retirada_id','medico_id','profissional_id','farmacia_id','hospital_id','local_id','cid_id','fornecimento_id','processo_id','fornecimento_ciclo_id','ciclo_id','documento_id','document_id','medico_descontinuacao_id','substituido_por_id','tratamento_ids','cid_ids','medicamento_ids','medico_ids','hospital_ids','local_ids']);
const categories=new Set(['MISSING_REQUIRED','DETACHED_RENEWAL','LOCAL_ONLY','REMOTE_ONLY','DIVERGENT_ROWS','FIELD_DIVERGENCE','UNSYNCED_ROWS','UNOWNED_QUEUE','UNSCOPED_ROWS','EXTERNAL_DEPENDENCY_QUEUE','PENDING_QUEUE','MISSING_DEPENDENCY','REMOTE_LINK_CONFLICT','LOCAL_LINK_CACHE_CONFLICT','REMOTE_READ','REMOTE_CHANGED','LOCAL_CHANGED','AUTH_CHANGED','ROW_FORMAT']);
export class Macro02PreflightError extends Error{
 readonly report:string;
 constructor(items:readonly AuditItem[]){super('MACRO02_PREFLIGHT_BLOCKED');this.report=items.filter(i=>names.has(i.table)&&(!i.field||fields.has(i.field))&&categories.has(i.category)&&Number.isSafeInteger(i.count)&&i.count>0).map(i=>[i.table,i.field,i.category,i.count].filter(v=>v!==undefined).join(' / ')).join(' · ');}
}
export function macro02PreflightDiagnostic(e:unknown):string|null{return e instanceof Macro02PreflightError?'Conferência prévia bloqueada: '+(e.report||'Diagnóstico seguro indisponível.') : null;}
