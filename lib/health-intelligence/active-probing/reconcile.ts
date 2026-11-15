import type { DoseLog, Medicamento, RegistroSaude } from "@/lib/types";
import { activeProbeIdempotencyKey } from "./core";
import type { ActiveProbe, ActiveProbeEvent, ActiveProbeEventType } from "./types";
import { TEMPORARY_COURSE_PREFIX } from "@/lib/health-supply/temporary-course";

const DAY=86400000;
const dateTime=(date:string,time="12:00")=>Date.parse(`${date}T${time}:00`);
function build(event:ActiveProbeEvent, checkpoint:string, question:string, due:number, expiresInDays=14):ActiveProbe{
 const key=activeProbeIdempotencyKey(event,checkpoint), now=new Date().toISOString();
 return {id:key,schema_version:1,user_id:event.user_id,person_id:event.person_id,medication_id:event.medication_id,acquisition_id:event.acquisition_id,event_date:event.event_date,trigger_id:event.event_id,trigger_type:event.event_type,question_key:question,question_version:1,due_at:new Date(due).toISOString(),expires_at:new Date(due+expiresInDays*DAY).toISOString(),status:"scheduled",idempotency_key:key,sync_state:"local_pending",consent_version:1,created_at:now,updated_at:now};
}
export function reconcileSos(logs:DoseLog[],meds:Medicamento[],nowMs=Date.now()){
 const names=new Map(meds.filter(m=>m.id).map(m=>[m.id!,m.nome]));
 return logs.filter(l=>l.id&&l.person_id&&l.dose_kind==="sos"&&l.tomado_em).flatMap(l=>{
  const eventMs=Date.parse(l.tomado_em!); if(!Number.isFinite(eventMs)||nowMs>eventMs+15*DAY)return[];
  const e:ActiveProbeEvent={schema_version:1,event_id:`sos:${l.id}`,event_type:"confirmed_sos_use",user_id:l.user_id,person_id:l.person_id!,medication_id:l.medicamento_id,source_entity_type:"doseLogs",source_entity_id:l.id!,event_date:l.data,confirmed_at:l.tomado_em!,evidence_refs:[{type:"doseLogs",id:l.id!}],source:"persisted_record"};
  return [build(e,"d1",`confirmed-sos-d1:${names.get(l.medicamento_id)||"Medicamento"}`,eventMs+DAY,7)];
 });
}
export function reconcileEndedCourses(logs:DoseLog[],meds:Medicamento[],nowMs=Date.now()){
 const names=new Map(meds.filter(m=>m.id).map(m=>[m.id!,m.nome])), groups=new Map<string,DoseLog[]>();
 for(const l of logs)if(l.person_id&&l.dose_kind==="planned"&&l.motivo?.startsWith(TEMPORARY_COURSE_PREFIX)){const key=`${l.person_id}:${l.medicamento_id}:${l.motivo}`;groups.set(key,[...(groups.get(key)||[]),l]);}
 return [...groups.values()].flatMap(rows=>{const settled=rows.filter(r=>r.tomado_em||r.ignorado_em);if(!settled.length||settled.length!==rows.length)return[];const end=Math.max(...rows.map(r=>dateTime(r.data,r.horario)));if(!Number.isFinite(end)||end>nowMs||nowMs>end+15*DAY)return[];const first=rows[0];const e:ActiveProbeEvent={schema_version:1,event_id:`course:${first.medicamento_id}:${first.motivo}`,event_type:"temporary_course_ended",user_id:first.user_id,person_id:first.person_id!,medication_id:first.medicamento_id,source_entity_type:"doseLogs",source_entity_id:first.id||first.medicamento_id,event_date:new Date(end).toISOString().slice(0,10),confirmed_at:new Date(end).toISOString(),evidence_refs:settled.slice(0,20).filter(r=>r.id).map(r=>({type:"doseLogs",id:r.id!})),source:"derived_eligible_window"};return[build(e,"d1",`temporary-course-ended-d1:${names.get(first.medicamento_id)||"Medicamento"}`,end+DAY,7)];});
}
export function reconcileAxis(records:RegistroSaude[],nowMs=Date.now()){
 const axes=["dor","energia","humor","apetite"],out:ActiveProbe[]=[];
 for(const axis of axes){const rows=records.filter(r=>(r.registro_chave||r.tipo||r.nome).toLocaleLowerCase("pt-BR").includes(axis)&&typeof r.valor_numerico==="number");const recent=rows.filter(r=>{const t=dateTime(r.data,r.horario);return t>=nowMs-7*DAY&&t<=nowMs}),prior=rows.filter(r=>{const t=dateTime(r.data,r.horario);return t>=nowMs-14*DAY&&t<nowMs-7*DAY});if(recent.length<3||prior.length<3)continue;const avg=(x:RegistroSaude[])=>x.reduce((s,r)=>s+(r.valor_numerico||0),0)/x.length;if(Math.abs(avg(recent)-avg(prior))<2)continue;const last=recent.sort((a,b)=>b.data.localeCompare(a.data))[0];if(!last.person_id||!last.id)continue;const e:ActiveProbeEvent={schema_version:1,event_id:`axis:${axis}:${last.data}`,event_type:"axis_shift_eligible",user_id:last.user_id,person_id:last.person_id,source_entity_type:"registros_saude",source_entity_id:last.id,event_date:last.data,confirmed_at:new Date(dateTime(last.data,last.horario)).toISOString(),evidence_refs:recent.concat(prior).slice(0,14).filter(r=>r.id).map(r=>({type:"registros_saude",id:r.id!})),source:"derived_eligible_window"};out.push(build(e,"context",`axis-shift-context:${axis}`,dateTime(last.data,last.horario),7));}
 return out;
}
export function manufacturerProbes(event:ActiveProbeEvent,manufacturer:string){if(event.event_type!=="manufacturer_lot_started"||!event.acquisition_id)return[];const at=Date.parse(event.confirmed_at);return[build(event,"d3",`manufacturer-d3:${manufacturer}`,at+3*DAY,7),build(event,"d10",`manufacturer-d10:${manufacturer}`,at+10*DAY,7)];}
export const probePriority:Record<ActiveProbeEventType,number>={temporary_course_ended:0,confirmed_sos_use:1,manufacturer_lot_started:2,axis_shift_eligible:3};
