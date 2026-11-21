/** VAULT A5 Internações 360 — exact mirror of six canonical Supabase tables.
 * Clinical facts are declared, not inferred from elapsed time or prescriptions. */
export type A5Source = 'self_report' | 'professional_document' | 'verified_import';
export type A5Status = 'planned' | 'admitted' | 'on_leave' | 'discharged' | 'cancelled';
export type A5AdmissionKind = 'elective' | 'urgent' | 'transfer' | 'unknown';
export type A5Unit = 'unspecified' | 'emergency' | 'ward' | 'icu' | 'stepdown' | 'surgical' | 'rehabilitation' | 'other';
export type A5EventKind = 'admission' | 'transfer_internal' | 'transfer_external' | 'procedure_note' | 'clinical_update' | 'care_note' | 'complication_report' | 'discharge' | 'correction' | 'other';
export type A5Entity = 'cirurgia' | 'consulta' | 'exam_order' | 'tratamento' | 'rehab_program' | 'medicamento';
export type A5RelationRole = 'origin' | 'during' | 'followup' | 'related' | 'discharge_plan' | 'rehab_referral' | 'medication_history';
export type A5Disposition = 'home' | 'transfer' | 'other_facility' | 'against_advice' | 'death' | 'other' | 'unknown';
export type A5Reconciliation = 'not_reported' | 'pending' | 'patient_reported' | 'documented' | 'not_applicable';
export interface A5Base { id:string; user_id:string; person_id:string; created_at:string; updated_at:string; deleted_at:string|null; synced?:boolean; }
export interface A5Episode extends A5Base {
  reason:string|null; reason_source:A5Source; admission_kind:A5AdmissionKind; status:A5Status;
  planned_admission_on:string|null; planned_admission_at:string|null;
  admitted_on:string|null; admitted_at:string|null;
  discharged_on:string|null; discharged_at:string|null; timezone_name:string|null;
  hospital_id:string|null; local_id:string|null; facility_name_snapshot:string|null;
  previous_hospitalization_id:string|null; note:string|null;
}
export interface A5Stay extends A5Base {
  hospitalization_id:string; hospital_id:string|null; local_id:string|null; unit_type:A5Unit;
  ward_label:string|null; room_label:string|null; bed_label:string|null;
  entered_on:string|null; entered_at:string|null; left_on:string|null; left_at:string|null;
  timezone_name:string|null; source:A5Source; note:string|null;
}
export interface A5Team extends A5Base {
  hospitalization_id:string; professional_id:string; stay_id:string|null; role:string;
  started_on:string|null; ended_on:string|null; source:A5Source; note:string|null;
}
export interface A5Event extends A5Base {
  hospitalization_id:string; stay_id:string|null; kind:A5EventKind; summary:string;
  occurred_on:string|null; occurred_at:string|null; timezone_name:string|null;
  source:A5Source; source_professional_id:string|null; corrects_event_id:string|null;
}
export interface A5Relation extends A5Base {
  hospitalization_id:string; entity_type:A5Entity; entity_id:string;
  relation_role:A5RelationRole; source:A5Source; note:string|null;
}
export interface A5Discharge extends A5Base {
  hospitalization_id:string; disposition:A5Disposition; source:A5Source; summary:string|null;
  instructions:string|null; warning_signs:string|null; followup_plan:string|null;
  medication_reconciliation_status:A5Reconciliation; reviewed_on:string|null; note:string|null;
}
export const A5_TABLES = [
  'hospitalizations_a5','hospitalization_stays_a5','hospitalization_team_a5',
  'hospitalization_events_a5','hospitalization_relations_a5','hospitalization_discharge_a5',
] as const;
export type A5Table = typeof A5_TABLES[number];
export const A5_STATUS_LABEL:Record<A5Status,string>={
 planned:'Planejada',admitted:'Internada',on_leave:'Ausência temporária',discharged:'Saída registrada',cancelled:'Cancelada',
};
export const A5_SOURCE_LABEL:Record<A5Source,string>={
 self_report:'Relato pessoal',professional_document:'Documento profissional',verified_import:'Importação verificada',
};
export const A5_UNIT_LABEL:Record<A5Unit,string>={
 unspecified:'Setor não informado',emergency:'Observação e urgência',ward:'Enfermaria',icu:'UTI',stepdown:'Cuidados intermediários',
 surgical:'Centro cirúrgico',rehabilitation:'Reabilitação',other:'Outro setor',
};
export const A5_EVENT_LABEL:Record<A5EventKind,string>={
 admission:'Admissão documentada',transfer_internal:'Mudança de setor',transfer_external:'Transferência externa',
 procedure_note:'Procedimento informado',clinical_update:'Evolução documentada',care_note:'Nota de cuidado',
 complication_report:'Intercorrência informada',discharge:'Saída documentada',correction:'Correção de relato',other:'Outro fato',
};
export const A5_ENTITY_LABEL:Record<A5Entity,string>={
 cirurgia:'Cirurgia',consulta:'Consulta',exam_order:'Pedido de exames',tratamento:'Tratamento',rehab_program:'Reabilitação',medicamento:'Medicamento',
};
export const A5_DISPOSITION_LABEL:Record<A5Disposition,string>={
 home:'Domicílio',transfer:'Transferência',other_facility:'Outra instituição',against_advice:'Por decisão própria',
 death:'Óbito informado',other:'Outro destino',unknown:'Não informado',
};
export const A5_RECON_LABEL:Record<A5Reconciliation,string>={
 not_reported:'Não informado',pending:'Revisão pendente',patient_reported:'Informado pela pessoa',
 documented:'Documentado',not_applicable:'Não se aplica',
};
export const isUuidA5=(v:unknown):v is string=>typeof v==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
export function isCivilDayA5(v:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const day=new Date(v+'T12:00:00Z');return Number.isFinite(day.valueOf())&&day.toISOString().slice(0,10)===v;
}
export const displayDayA5=(v:string|null|undefined):string=>v&&isCivilDayA5(v)?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`:'Não informada';
export const activeA5=(r:{deleted_at:string|null}):boolean=>!r.deleted_at;
