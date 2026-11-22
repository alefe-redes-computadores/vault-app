"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarCheck2, ChevronRight, FlaskConical, MapPin, Stethoscope } from "lucide-react";
import type { CareFlowEventM2 } from "@/lib/careflow-m2/domain";
import { useCareFlowM2 } from "@/hooks/useCareFlowM2";

type Doctor={id?:string;user_id:string;nome:string};
type Place={id?:string;user_id:string;nome:string};
type Appointment={id?:string;user_id:string;person_id?:string;especialidade:string};
const ownId=(raw:unknown)=>typeof raw==="string"&&raw.trim().length>0?raw.trim():null;
const linkBase="/saude/careflow/exames";
export function CareFlowOrderRelationsR5({order,userId,personId,doctors,places,consultations}:{order:CareFlowEventM2;userId:string;personId:string;doctors:readonly Doctor[];places:readonly Place[];consultations:readonly Appointment[]}){
  if(!userId||!personId||order.user_id!==userId||order.person_id!==personId)return null;
  const doctorId=ownId(order.payload.doctor_id),placeId=ownId(order.payload.location_id),appointmentId=ownId(order.related_id);
  const doctor=doctorId?doctors.find(d=>d.id===doctorId&&d.user_id===userId):undefined;
  const place=placeId?places.find(p=>p.id===placeId&&p.user_id===userId):undefined;
  const appointment=appointmentId?consultations.find(c=>c.id===appointmentId&&c.user_id===userId&&c.person_id===personId):undefined;
  const links=[
    doctor?{label:`Médico: ${doctor.nome}`,href:`/saude/medicos/detalhes?id=${encodeURIComponent(doctor.id!)}`,Icon:Stethoscope,tone:"text-sky-300 border-sky-400/20 bg-sky-400/5"}:null,
    place?{label:`Local: ${place.nome}`,href:`/saude/locais/detalhes?id=${encodeURIComponent(place.id!)}`,Icon:MapPin,tone:"text-emerald-300 border-emerald-400/20 bg-emerald-400/5"}:null,
    appointment?{label:`Consulta vinculada`,href:`/saude/consultas/detalhes?id=${encodeURIComponent(appointment.id!)}`,Icon:CalendarCheck2,tone:"text-emerald-300 border-emerald-400/20 bg-emerald-400/5"}:null,
  ].filter((x):x is NonNullable<typeof x>=>Boolean(x));
  return links.length?<div aria-label="Vínculos confirmados do pedido" className="mt-2 flex flex-wrap gap-1.5">{links.map(({label,href,Icon,tone})=><Link key={href} href={href} className={`inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-semibold ${tone}`}><Icon size={14} className="shrink-0"/><span className="min-w-0 break-words">{label}</span><ChevronRight size={13} className="shrink-0"/></Link>)}</div>:null;
}
/** Doctor links are evidence-based: only CareFlow orders with explicit doctor_id and same account/person. */
export function DoctorCareFlowRelationsR5({doctorId,doctorOwnerId}:{doctorId:string;doctorOwnerId:string}){
  const {events=[],userId,activePersonId}=useCareFlowM2();
  const orders=useMemo(()=>!doctorId||!userId||!activePersonId||doctorOwnerId!==userId?[]:events.filter(e=>e.kind==="exam_order"&&e.user_id===userId&&e.person_id===activePersonId&&e.payload.doctor_id===doctorId).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,5),[events,userId,activePersonId,doctorId,doctorOwnerId]);
  if(!orders.length)return null;
  return <section aria-label="Pedidos CareFlow vinculados a este médico" className="rounded-[20px] border border-sky-400/20 bg-sky-400/[.045] p-3">
    <h2 className="flex items-center gap-2 text-xs font-semibold"><FlaskConical size={17} className="text-sky-300"/>Pedidos CareFlow vinculados</h2>
    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Somente pedidos desta pessoa com vínculo explícito ao médico. Nenhum vínculo é inferido pelo nome.</p>
    <div className="mt-2 space-y-1.5">{orders.map(e=><Link key={e.id} href={`${linkBase}#careflow-pedido-${encodeURIComponent(e.id)}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/50 bg-void/20 px-3 text-left"><span className="min-w-0 flex-1 text-xs font-medium">{String(e.payload.title||"Pedido de exames")}</span><span className="text-[10px] text-ink-muted">{String(e.payload.date||"")}</span><ChevronRight size={15} className="text-sky-300"/></Link>)}</div>
  </section>;
}
