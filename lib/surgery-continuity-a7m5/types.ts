/** A7/M5 continuity: user-declared links. Never infer a surgery from a consultation. */
export type ContinuitySource = 'self_report' | 'professional_document';
export type SurgicalIntentStatus = 'requested' | 'under_review' | 'scheduled' | 'withdrawn';
export type LinkAction = 'link' | 'unlink';
export type SurgicalStage = 'pre' | 'procedure' | 'post' | 'return';
export type EvidenceTarget = 'procedure_event_a9' | 'exam_order' | 'medication' | 'health_record';
export interface ContinuityBase {
  id:string; user_id:string; person_id:string;
  created_at:string; updated_at:string; deleted_at:null; synced?:boolean;
}
/** Intention is NOT an operation or appointment. No surgery date or outcome is fabricated. */
export interface SurgicalIntentA7M5 extends ContinuityBase {
  title:string; status:SurgicalIntentStatus; source:ContinuitySource;
  source_consultation_id:string|null; source_professional_id:string|null;
  linked_surgery_id:string|null; note:string|null; corrects_intent_id:string|null;
}
/** A relation record is not an independent clinical event. Its target remains authoritative. */
export interface SurgeryEvidenceLinkA7M5 extends ContinuityBase {
  surgery_id:string; target_type:EvidenceTarget; target_id:string;
  stage:SurgicalStage; source:ContinuitySource; note:string|null;
  action:LinkAction; corrects_link_id:string|null;
}
export const CONTINUITY_TABLES_A7M5 = ['surgical_intents_a7m5','surgery_evidence_links_a7m5'] as const;
export type ContinuityTableA7M5 = typeof CONTINUITY_TABLES_A7M5[number];
export const STATUS_LABEL_A7M5:Record<SurgicalIntentStatus,string>={
  requested:'Encaminhamento informado',under_review:'Em avaliação — informado',
  scheduled:'Vinculado ao cadastro cirúrgico',withdrawn:'Encaminhamento encerrado'};
export const STAGE_LABEL_A7M5:Record<SurgicalStage,string>={
  pre:'Preparação',procedure:'Procedimento',post:'Pós-procedimento',return:'Retornos'};
export const TARGET_LABEL_A7M5:Record<EvidenceTarget,string>={
  procedure_event_a9:'Procedimento ou curativo A9',exam_order:'Pedido de exame',
  medication:'Medicamento registrado',health_record:'Registro clínico ou sintoma'};
export const validUuidContinuity=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(v);
export const cleanContinuity=(v:unknown,n:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
/** Active tip = the last fact in an explicit revision chain; historical rows remain untouched. */
export function currentIntentsA7M5(records:readonly SurgicalIntentA7M5[],uid:string,pid:string){
  const owned=records.filter(x=>x.user_id===uid&&x.person_id===pid&&!x.deleted_at);
  const superseded=new Set(owned.map(x=>x.corrects_intent_id).filter(Boolean));
  return owned.filter(x=>!superseded.has(x.id)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
export function activeEvidenceA7M5(records:readonly SurgeryEvidenceLinkA7M5[],uid:string,pid:string,sid:string){
  const owned=records.filter(x=>x.user_id===uid&&x.person_id===pid&&x.surgery_id===sid&&!x.deleted_at);
  const superseded=new Set(owned.map(x=>x.corrects_link_id).filter(Boolean));
  return owned.filter(x=>!superseded.has(x.id)&&x.action==='link');
}
