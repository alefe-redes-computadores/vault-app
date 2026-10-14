import type { Medico,Farmacia,LocalSaude,Hospital,Tratamento } from "@/lib/types";
export type RelationMetadata={detail:string;color?:string};
export function buildRelationMetadata(kind:"doctor"|"place"|"pharmacy",uid:string,pid:string|null,rows:{doctors:Medico[];pharmacies:Farmacia[];places:LocalSaude[];hospitals:Hospital[];treatments:Tratamento[]}){
 const output:Record<string,RelationMetadata>={};
 const treatments=rows.treatments.filter(t=>t.user_id===uid&&t.person_id===pid&&t.status==="ativo");
 const places=rows.places.filter(p=>p.user_id===uid),hospitals=rows.hospitals.filter(h=>h.user_id===uid);
 if(kind==="doctor")for(const doctor of rows.doctors.filter(d=>d.user_id===uid&&d.id)){
  const linked=treatments.filter(t=>t.id&&(doctor.tratamento_ids?.includes(t.id)||t.medico_ids?.includes(doctor.id!)));
  const units=[...places.filter(p=>p.id&&doctor.local_ids?.includes(p.id)),...hospitals.filter(h=>h.id&&doctor.hospital_ids?.includes(h.id))].map(p=>p.nome);
  const color=linked.find(t=>/^#[0-9a-f]{6}$/i.test(t.cor||""))?.cor;
  output[doctor.id!]={detail:[doctor.especialidade,doctor.crm?`CRM ${doctor.crm}`:null,...units.slice(0,2),...linked.slice(0,2).map(t=>`Tratamento: ${t.nome}`)].filter(Boolean).join(" · ")||"Sem especialidade ou vínculos informados",color};
 }
 if(kind==="pharmacy")for(const pharmacy of rows.pharmacies.filter(p=>p.user_id===uid&&p.id))output[pharmacy.id!]={detail:[pharmacy.endereco,pharmacy.telefone].filter(Boolean).join(" · ")||"Endereço não informado"};
 if(kind==="place")for(const place of places.filter(p=>p.id))output[place.id!]={detail:place.endereco||"Endereço não informado"};
 return output;
}
