/** M121 — comparação factual desde consulta registrada; não interpreta evolução clínica. */
import type { HealthInsightContext } from "@/lib/health-insights";
export type ConsultationBaselineM121 = {id: string; date: string; label: string};
export type ConsultationChangesM121 = {
 state: "unavailable" | "no_baseline" | "ready";
 baselines: ConsultationBaselineM121[];
 selected: ConsultationBaselineM121 | null;
 counts: {confirmedDoses:number;ignoredDoses:number;healthRecords:number;documentsRegistered:number;consultationsRecorded:number};
 sample: readonly {date:string;title:string;source:string}[];
 limitation: string;
};
const day = (v:string):boolean => {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const [y,m,d]=v.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d));
 return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;
};
export function buildConsultationChangesM121(ctx:HealthInsightContext|null,owner:string,person:string,today:string,selectedId:string|null):ConsultationChangesM121 {
 const base={state:"unavailable" as const,baselines:[],selected:null,counts:{confirmedDoses:0,ignoredDoses:0,healthRecords:0,documentsRegistered:0,consultationsRecorded:0},sample:[],limitation:"Dados da pessoa ainda não confirmados."};
 if(!owner||!person||!day(today)||!ctx||ctx.userId!==owner||ctx.personId!==person)return base;
 const scoped=<T extends {user_id?:string;person_id?:string}>(v:T)=>v.user_id===owner&&v.person_id===person;
 const baselines=ctx.consultas.filter(c=>scoped(c)&&c.id&&c.status==="realizada"&&day(c.data)&&c.data<=today)
  .map(c=>({id:c.id!,date:c.data,label:c.especialidade||"Consulta registrada"}))
  .sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,18);
 const chosen=(selectedId?baselines.find(b=>b.id===selectedId):null) ?? baselines[0] ?? null;
 if(!chosen)return {...base,state:"no_baseline",baselines,limitation:"Sem consulta realizada válida para comparação. Não foi inferida uma data inicial."};
 const inPeriod=(d:string)=>day(d)&&d>=chosen.date&&d<=today;
 const doses=ctx.doseLogs.filter(d=>scoped(d)&&inPeriod(d.data));
 const registros=ctx.registrosSaude.filter(r=>scoped(r)&&inPeriod(r.data));
 const docs=ctx.documentos.filter(d=>scoped(d)&&d.category_id==="saude"&&inPeriod((d.created_at||"").slice(0,10)));
 const consultations=ctx.consultas.filter(c=>scoped(c)&&c.id!==chosen.id&&inPeriod(c.data));
 const sample=[...registros.map(r=>({date:r.data,title:r.nome||"Registro de saúde",source:"registro de saúde"})),...consultations.map(c=>({date:c.data,title:c.especialidade||"Consulta",source:"consulta registrada"})),...docs.map(d=>({date:(d.created_at||"").slice(0,10),title:d.title||"Documento",source:"data de cadastro"}))]
   .sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title)).slice(0,6);
 return {state:"ready",baselines,selected:chosen,counts:{
   confirmedDoses:doses.filter(d=>Boolean(d.tomado_em)).length,
   ignoredDoses:doses.filter(d=>!d.tomado_em&&Boolean(d.ignorado_em)).length,
   healthRecords:registros.length,documentsRegistered:docs.length,consultationsRecorded:consultations.length},sample,
  limitation:"A janela inclui o dia da consulta selecionada. Documento usa data de cadastro, não data clínica. Ausência de lançamento não comprova ausência de sintomas ou tomada. Alteração de dose, causalidade e melhora não são inferidas. Diário privado excluído."};
}
