/** A8 authority: explicit vaccination records, never inferred from schedules or M144 diary. */
export type A8Source='self_report'|'professional_document';
export type A8Kind='plan'|'dose'|'amendment'|'void';
export type A8EffectiveKind='plan'|'dose'|'void';
export interface A8Base { id:string;user_id:string;person_id:string;created_at:string;updated_at:string;deleted_at:string|null;synced?:boolean; }
export interface A8Course extends A8Base {vaccine_name:string;scheme_note:string|null;}
export interface A8Event extends A8Base {
 course_id:string;kind:A8Kind;effective_kind:A8EffectiveKind;
 planned_on:string|null;administered_on:string|null;dose_number:number|null;
 manufacturer:string|null;lot:string|null;source:A8Source;source_professional_id:string|null;source_location_id:string|null;
 note:string|null;corrects_event_id:string|null;
}
export const A8_TABLES=['vaccination_courses_a8','vaccination_events_a8'] as const;
export type A8Table=typeof A8_TABLES[number];
export const A8_SOURCE_LABEL:Record<A8Source,string>={self_report:'Relato próprio',professional_document:'Documento profissional apresentado'};
export function validUuidA8(v:unknown):v is string{return typeof v==='string'&&/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);}
export function validCivilDayA8(v:unknown):v is string {
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return false;
 const d=new Date(v+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;
}
export function datePtA8(v:unknown){return validCivilDayA8(v)?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`:'Data não informada';}
/** Self-reports remain declarations, never official verification or a medical certificate. */
export function currentVaccinationEventsA8(rows:readonly A8Event[],userId:string,personId:string):A8Event[]{
 const owned=rows.filter(e=>e.user_id===userId&&e.person_id===personId&&!e.deleted_at);
 const superseded=new Set(owned.filter(e=>e.corrects_event_id).map(e=>e.corrects_event_id));
 return owned.filter(e=>!superseded.has(e.id)).sort((a,b)=>
  (b.administered_on||b.planned_on||b.created_at).localeCompare(a.administered_on||a.planned_on||a.created_at));
}
export function factualDoseCountA8(rows:readonly A8Event[],uid:string,pid:string):number {
 return currentVaccinationEventsA8(rows,uid,pid).filter(e=>e.effective_kind==='dose').length;
}
export function dosesByCourseA8(rows:readonly A8Event[],uid:string,pid:string,courseId:string){
 return currentVaccinationEventsA8(rows,uid,pid).filter(e=>e.course_id===courseId);
}
/** M144 is historical evidence only; never auto-promote to an applied A8 event. */
export function legacyDiaryVaccinationA8(context:unknown){
 if(typeof context!=='string'||!context.startsWith('VAULT_M144|'))return null;
 try {const parsed=JSON.parse(context.slice('VAULT_M144|'.length));
  return parsed&&parsed.tag==='immunization'&&typeof parsed.title==='string'?{
   title:parsed.title as string,day:validCivilDayA8(parsed.start)?parsed.start as string:null,
   lot:typeof parsed.lot==='string'?parsed.lot as string:null,
  }:null;
 }catch{return null;}
}
