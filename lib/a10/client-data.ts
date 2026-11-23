/** A10: read-only, scoped Dexie snapshot. No fallback to other person's data. */
import {db} from '@/lib/db';
import {A10_AUTHORITIES,type A10Authority,type A10Datasets,type A10Row} from './longitudinal';
export type A10Snapshot={scope:string;verified:boolean;data:A10Datasets;error:string};
export async function loadScopedA10(uid:string,pid:string):Promise<A10Snapshot>{
 const scope=uid+':'+pid;
 if(!uid||!pid)return {scope,verified:false,data:{},error:'Selecione uma conta e uma pessoa.'};
 try{
  const person=await db.persons.get(pid);
  if(!person||person.user_id!==uid)return {scope,verified:false,data:{},error:'Pessoa não pertence à conta atual.'};
   const loaders:Record<A10Authority,()=>Promise<unknown>>={
    consultas:()=>db.consultas.where('user_id').equals(uid).toArray(),
    cirurgias:()=>db.cirurgias.where('user_id').equals(uid).toArray(),
    a1_treatment_phases:()=>db.a1_treatment_phases.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    hospitalizations_a5:()=>db.hospitalizations_a5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    hospitalization_events_a5:()=>db.hospitalization_events_a5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    surgery_journey_events_a7:()=>db.surgery_journey_events_a7.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    surgical_intents_a7m5:()=>db.surgical_intents_a7m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    rehab_programs_m5:()=>db.rehab_programs_m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    rehab_sessions_m5:()=>db.rehab_sessions_m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    rehab_milestones_m5:()=>db.rehab_milestones_m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    vaccination_courses_a8:()=>db.vaccination_courses_a8.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    vaccination_events_a8:()=>db.vaccination_events_a8.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    procedure_events_a9:()=>db.procedure_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    sensitivity_events_a9:()=>db.sensitivity_events_a9.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    exam_orders:()=>db.exam_orders.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    exam_order_items:()=>db.exam_order_items.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    careflow_events_m2:()=>db.careflow_events_m2.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    registros_saude:()=>db.registros_saude.where('user_id').equals(uid).toArray(),
    doseLogs:()=>db.doseLogs.where('user_id').equals(uid).toArray(),
    medicamentos:()=>db.medicamentos.where('user_id').equals(uid).toArray(),
    tratamentos:()=>db.tratamentos.where('user_id').equals(uid).toArray(),
    hospitalization_relations_a5:()=>db.hospitalization_relations_a5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    rehab_origin_links_m5:()=>db.rehab_origin_links_m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    surgery_evidence_links_a7m5:()=>db.surgery_evidence_links_a7m5.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    clinical_asset_links:()=>db.clinical_asset_links.where('[user_id+person_id]').equals([uid,pid]).toArray(),
    clinical_assets:()=>db.clinical_assets.where('[user_id+person_id]').equals([uid,pid]).toArray(),
   };
   const values=await Promise.all(A10_AUTHORITIES.map(key=>loaders[key]()));
   const data={} as A10Datasets;
   A10_AUTHORITIES.forEach((key,i)=>{data[key]=values[i] as A10Row[];});
   return {scope,verified:true,data,error:''};
 }catch(e){return {scope,verified:false,data:{},error:e instanceof Error?e.message:'Não foi possível consultar os fatos locais.'};}
}
