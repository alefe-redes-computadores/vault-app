/** VAULT A7/M6: canonical authored surgical facts. Never infer medical readiness or outcome. */
export type A7Source='self_report'|'professional_document'|'verified_import';
export type A7Topic='indication'|'assessment'|'preparation'|'procedure_performed'|'findings'|'intercurrence'|'wound_care'|'postoperative_guidance'|'pain_report'|'follow_up'|'other';
export const A7_TOPIC_LABEL:Record<A7Topic,string>={indication:'Indicação informada',assessment:'Avaliação registrada',preparation:'Preparo documentado',procedure_performed:'Ato documentado',findings:'Achados informados',intercurrence:'Intercorrência relatada',wound_care:'Curativo ou cuidado registrado',postoperative_guidance:'Orientação documentada',pain_report:'Dor ou sintoma informado',follow_up:'Revisão ou retorno',other:'Outro fato registrado'};
export const A7_TOPICS_BY_STAGE:Record<'pre'|'procedure'|'post'|'return',readonly A7Topic[]>={
 pre:['indication','assessment','preparation','other'],procedure:['procedure_performed','findings','intercurrence','other'],
 post:['wound_care','postoperative_guidance','pain_report','other'],return:['follow_up','assessment','other']};
export type A7Stage='pre'|'procedure'|'post'|'return';
export type A7EventKind='preparation_note'|'procedure_note'|'recovery_note'|'return_note'|'correction';
export interface A7Base {id:string;user_id:string;person_id:string;cirurgia_id:string;created_at:string;updated_at:string;deleted_at:string|null;synced?:boolean;}
export interface A7Event extends A7Base {
 stage:A7Stage;kind:A7EventKind;source:A7Source;occurred_on:string|null;topic?:A7Topic|null;
 title:string;description:string;source_professional_id:string|null;corrects_event_id:string|null;
}
export interface A7Team extends A7Base {
 professional_id:string;role:string;source:A7Source;note:string|null;
}
export const A7_TABLES=['surgery_journey_events_a7','surgery_team_a7'] as const;
export type A7Table=typeof A7_TABLES[number];
export const A7_SOURCE_LABEL:Record<A7Source,string>={self_report:'Relato pessoal',professional_document:'Documento profissional',verified_import:'Importação verificada'};
export const A7_STAGE_LABEL:Record<A7Stage,string>={pre:'Preparação pré-operatória',procedure:'Procedimento',post:'Acompanhamento pós-operatório',return:'Retorno'};
export const A7_EVENT_LABEL:Record<A7EventKind,string>={preparation_note:'Preparação informada',procedure_note:'Registro do procedimento',recovery_note:'Evolução relatada',return_note:'Acompanhamento de retorno',correction:'Retificação do histórico'};
export const A7_STAGE_FOR_KIND:Record<A7EventKind,A7Stage>={preparation_note:'pre',procedure_note:'procedure',recovery_note:'post',return_note:'return',correction:'post'};
export function validUuidA7(v:unknown):v is string{return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);}
export function validDayA7(v:unknown):v is string{
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const d=new Date(`${v}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
}
export function displayDayA7(v:string|null|undefined){return validDayA7(v)?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`:'Data do fato não informada';}
