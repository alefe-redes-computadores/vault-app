/** A9: evidence is never promoted to clinical diagnosis automatically. */
export type A9Source = 'self_report'|'professional_document';
export type A9Kind = 'entry'|'amendment'|'void';
export type A9ProcedureState = 'planned'|'performed'|'not_performed'|'void';
export type A9SensitivityType = 'allergy'|'intolerance'|'reaction';
export type A9Certainty = 'suspected'|'documented_by_professional';
export type A9Severity = 'unknown'|'mild'|'moderate'|'severe';
export type A9RelatedType = 'medication'|'vaccination_event'|'procedure_event';
export interface A9Base {id:string;user_id:string;person_id:string;kind:A9Kind;source:A9Source;note:string|null;corrects_event_id:string|null;created_at:string;updated_at:string;deleted_at:null;synced?:boolean;}
export interface A9Procedure extends A9Base {title:string;category:'ambulatory'|'dressing'|'other';effective_status:A9ProcedureState;planned_on:string|null;performed_on:string|null;professional_id:string|null;location_id:string|null;consultation_id:string|null;rehab_session_id:string|null;}
export interface A9Sensitivity extends A9Base {sensitivity_type:A9SensitivityType;agent_label:string;certainty:A9Certainty;severity:A9Severity;reported_on:string;related_type:A9RelatedType|null;related_id:string|null;professional_id:string|null;}
export const A9_TABLES=['procedure_events_a9','sensitivity_events_a9'] as const;
export type A9Table=typeof A9_TABLES[number];
export const A9_SOURCE_LABEL:Record<A9Source,string>={self_report:'Relato próprio',professional_document:'Documento profissional apresentado'};
export const A9_PROCEDURE_LABEL:Record<A9ProcedureState,string>={planned:'Planejado',performed:'Realizado — informado',not_performed:'Não realizado — informado',void:'Registro cancelado'};
export const A9_SENSITIVITY_LABEL:Record<A9SensitivityType,string>={allergy:'Alergia declarada',intolerance:'Intolerância declarada',reaction:'Reação relatada'};
export const A9_SEVERITY_LABEL:Record<A9Severity,string>={unknown:'Não informada',mild:'Leve (declarada)',moderate:'Moderada (declarada)',severe:'Intensa (declarada)'};
export function validDayA9(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;}
export function datePtA9(v:unknown):string{return validDayA9(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'Data não informada';}
export function ptToDayA9(v:string):string|null{const raw=v.trim();const d=raw.replace(/\D/g,'');if(validDayA9(raw))return raw;if(d.length!==8)return null;const out=d.slice(4,8)+'-'+d.slice(2,4)+'-'+d.slice(0,2);return validDayA9(out)?out:null;}
/** All filters are scoped by account AND person before calculating superseded facts. */
export function currentFactsA9<T extends A9Base>(rows:readonly T[],uid:string,pid:string):T[]{const owned=rows.filter(e=>e.user_id===uid&&e.person_id===pid&&!e.deleted_at);const corrected=new Set(owned.filter(e=>e.corrects_event_id).map(e=>e.corrects_event_id));return owned.filter(e=>!corrected.has(e.id)).sort((a,b)=>b.created_at.localeCompare(a.created_at));}
export function activeFactsA9<T extends A9Base>(rows:readonly T[],uid:string,pid:string):T[]{return currentFactsA9(rows,uid,pid).filter(e=>e.kind!=='void');}
