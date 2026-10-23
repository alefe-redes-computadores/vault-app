import type { Medico,Farmacia,LocalSaude,Hospital,Tratamento } from "@/lib/types";
export type RelationMetadata={detail:string;color?:string};
export function buildRelationMetadata(kind:"doctor"|"place"|"pharmacy"|"hospital",uid:string,pid:string|null,rows:{doctors:Medico[];pharmacies:Farmacia[];places:LocalSaude[];hospitals:Hospital[];treatments:Tratamento[]}){
 const output:Record<string,RelationMetadata>={};
 const treatments=rows.treatments.filter(t=>t.user_id===uid&&t.person_id===pid&&t.status==="ativo");
 // Um profissional/local global pode não ter person_id; se tiver, não atravessa perfis.
 const scoped=(row:{user_id:string;person_id?:string|null})=>row.user_id===uid&&(!row.person_id||row.person_id===pid);
 const doctors=rows.doctors.filter(d=>scoped(d)&&d.id),places=rows.places.filter(scoped),hospitals=rows.hospitals.filter(scoped);
 const linkedTreatments=(entityId:string,forward?:string[])=>treatments.filter(t=>t.id&&(forward?.includes(t.id)||(
  kind==="doctor"?t.medico_ids?.includes(entityId):kind==="hospital"?t.hospital_ids?.includes(entityId):kind==="place"?t.local_ids?.includes(entityId):false
 )));
 const linkedDoctors=(entityId:string,forward?:string[])=>doctors.filter(d=>d.id&&(forward?.includes(d.id)||(
  kind==="hospital"?d.hospital_ids?.includes(entityId):kind==="place"?d.local_ids?.includes(entityId):false
 )));
 if(kind==="doctor")for(const doctor of doctors){
  const linked=linkedTreatments(doctor.id!,doctor.tratamento_ids);
  const units=[...places.filter(p=>p.id&&(doctor.local_ids?.includes(p.id)||p.medico_ids?.includes(doctor.id!))),...hospitals.filter(h=>h.id&&(doctor.hospital_ids?.includes(h.id)||h.medico_ids?.includes(doctor.id!)))].map(p=>p.nome);
  const color=linked.find(t=>/^#[0-9a-f]{6}$/i.test(t.cor||""))?.cor;
  output[doctor.id!]={detail:[doctor.especialidade,doctor.crm?`CRM ${doctor.crm}`:null,...units.slice(0,2),...linked.slice(0,2).map(t=>`Tratamento: ${t.nome}`)].filter(Boolean).join(" · ")||"Sem especialidade ou vínculos informados",color};
 }
 if(kind==="pharmacy")for(const pharmacy of rows.pharmacies.filter(p=>scoped(p)&&p.id))output[pharmacy.id!]={detail:[pharmacy.endereco,pharmacy.telefone].filter(Boolean).join(" · ")||"Endereço não informado"};
 if(kind==="place")for(const place of places.filter(p=>p.id)){
  const linked=linkedTreatments(place.id!,place.tratamento_ids),professionals=linkedDoctors(place.id!,place.medico_ids);
  output[place.id!]={detail:[place.tipo?.replaceAll("_"," "),place.endereco,...professionals.slice(0,2).map(d=>d.nome),...linked.slice(0,2).map(t=>`Tratamento: ${t.nome}`)].filter(Boolean).join(" · ")||"Endereço e vínculos não informados",color:linked.find(t=>/^#[0-9a-f]{6}$/i.test(t.cor||""))?.cor};
 }
 if(kind==="hospital")for(const hospital of hospitals.filter(h=>h.id)){
  const linked=linkedTreatments(hospital.id!,hospital.tratamento_ids),professionals=linkedDoctors(hospital.id!,hospital.medico_ids);
  output[hospital.id!]={detail:[hospital.endereco,hospital.telefone,...professionals.slice(0,2).map(d=>d.nome),...linked.slice(0,2).map(t=>`Tratamento: ${t.nome}`)].filter(Boolean).join(" · ")||"Endereço e vínculos não informados",color:linked.find(t=>/^#[0-9a-f]{6}$/i.test(t.cor||""))?.cor};
 }
 return output;
}
