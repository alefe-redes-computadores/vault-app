/** IA 2.0 P4: projection only. No records, alarms, treatment decisions or stock mutations. */
import { parseTemporaryCourseNote, temporaryCourseEnd } from "@/lib/health-supply/temporary-course";
import type { Medicamento, Consulta } from "@/lib/types";
import type { CareFlowEventM2 } from "@/lib/careflow-m2/domain";

export type HomeVivaInputP4 = {
  userId: string;
  personId: string;
  today: string;
  medications: readonly Medicamento[];
  consultations: readonly Consulta[];
  events: readonly CareFlowEventM2[];
};
export type HomeVivaFrontP4 = {
  id: "temporary" | "monitor" | "consultation" | "routine";
  label: string;
  title: string;
  description: string;
  detail: string;
  href: string;
  tone: "emerald" | "sky" | "violet";
};
const validDay = (day: unknown): day is string => {
  if(typeof day!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const d=new Date(`${day}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10)===day;
};
const offsetDay=(day:string,offset:number)=>{
  const d=new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate()+offset);
  return d.toISOString().slice(0,10);
};
const localDate=(day:string)=>`${day.slice(8,10)}/${day.slice(5,7)}`;
const concise=(s:unknown,max=55)=>String(s||"").trim().slice(0,max);
const own=(x:{user_id?:string;person_id?:string},input:HomeVivaInputP4)=>x.user_id===input.userId&&x.person_id===input.personId;

/** A plan is an entered plan, never evidence of dose taking or of a notification being delivered. */
export function buildHomeVivaFrontsP4(input:HomeVivaInputP4):HomeVivaFrontP4[]{
  const routine:HomeVivaFrontP4={id:"routine",label:"Sua rotina",title:"Tudo em um só lugar",description:"Acesse horários, registros e suas áreas de saúde.",detail:"Nenhuma tarefa nova é criada aqui.",href:"/hoje",tone:"violet"};
  if(!input.userId||!input.personId||!validDay(input.today))return [routine];
  const fronts:HomeVivaFrontP4[]=[];
  const temporary=input.medications.filter(m=>own(m,input)&&m.tipo_uso==="temporario"&&m.status!=="descontinuado").flatMap(m=>{
    const parsed=parseTemporaryCourseNote(String(m.observacoes||""));
    if(!parsed||!validDay(parsed.start))return [];
    try {const end=temporaryCourseEnd({...parsed,times:parsed.intervalHours?[]:[parsed.firstPlannedAt?.slice(11)||"00:00"]});
      if(parsed.start>input.today||end<input.today)return [];
      return [{id:m.id||"",name:concise(m.nome,42),end}];
    }catch{return [] as {id:string;name:string;end:string}[];}
  }).sort((a,b)=>a.end.localeCompare(b.end)||a.name.localeCompare(b.name));
  if(temporary.length){
    const first=temporary[0];
    fronts.push({id:"temporary",label:"Tratamento por período",title:first.name||"Tratamento temporário",
      description:temporary.length>1?`${temporary.length} períodos registrados; confira o mais próximo do término.`:`Período informado até ${localDate(first.end)}.`,
    detail:"Horários planejados não confirmam tomadas.",href:first.id?`/saude/medicamentos/detalhes?id=${encodeURIComponent(first.id)}`:"/saude/medicamentos",tone:"emerald"});
  }
  const monitor=input.events.filter(e=>own(e,input)&&e.kind==="monitor_plan"&&validDay(e.payload.start)&&validDay(e.payload.end)&&String(e.payload.start)<=input.today&&String(e.payload.end)>=input.today)
    .sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if(monitor.length)fronts.push({id:"monitor",label:"Acompanhamento",title:"Plano de pressão ativo",
    description:`Período registrado até ${localDate(String(monitor[0].payload.end))}.`,detail:"Conferir medidas sem presumir que foram realizadas.",href:"/saude/registros?foco=pressao",tone:"sky"});
  const since=offsetDay(input.today,-3);
  const recent=input.consultations.filter(c=>own(c,input)&&c.status==="realizada"&&validDay(c.data)&&c.data<=input.today&&c.data>=since)
    .sort((a,b)=>b.data.localeCompare(a.data)||String(b.horario||"").localeCompare(String(a.horario||"")));
  if(recent.length)fronts.push({id:"consultation",label:"Após a consulta",title:"Consulta registrada recentemente",
    description:`Consulta de ${localDate(recent[0].data)}. Registros e próximos passos ficam disponíveis para conferir.`,
    detail:"O VAULT não presume receita, exame ou recomendação do profissional.",href:recent[0].id?`/saude/consultas/detalhes?id=${encodeURIComponent(recent[0].id)}`:"/saude/consultas",tone:"sky"});
  return fronts.length?fronts:[routine];
}
