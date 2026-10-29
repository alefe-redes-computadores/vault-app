import type { HealthInsightContext } from "@/lib/health-insights";

export type DocumentArchivePortfolio={
  total:number;withAttachments:number;withoutAttachments:number;linked:number;unlinked:number;
  prescriptions:number;favorites:number;recent30d:number;futureDated:number;plannedPrescriptions:number;
  note:string;
};
const day=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0,10))?value.slice(0,10):null;
const subtract=(value:string,amount:number)=>{const d=new Date(`${value}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-amount);return d.toISOString().slice(0,10);};

/** One owner-scoped archive projection; explicit relations only, never title matching. */
export function buildDocumentArchivePortfolio(context:HealthInsightContext):DocumentArchivePortfolio{
  const pid=context.personId,uid=context.userId||"",today=context.hoje||"",from30=/^\d{4}-\d{2}-\d{2}$/.test(today)?subtract(today,29):"";
  const docs=context.documentos.filter(row=>row.person_id===pid&&(!uid||row.user_id===uid)&&row.category_id==="saude");
  const ids=new Set(docs.flatMap(row=>row.id?[row.id]:[])),linkedIds=new Set<string>();
  for(const med of context.medicamentos)if(med.person_id===pid&&med.document_id&&ids.has(med.document_id))linkedIds.add(med.document_id);
  for(const event of context.renovacoes)if((event.person_id===pid||(!event.person_id&&event.user_id===uid))&&event.document_id&&ids.has(event.document_id))linkedIds.add(event.document_id);
  for(const link of context.fornecimento?.documentos||[])if(link.person_id===pid&&(!uid||link.user_id===uid)&&ids.has(link.document_id))linkedIds.add(link.document_id);
  for(const doc of docs)if(doc.id&&(doc.entidade_tipo&&doc.entidade_id||Object.keys(doc.metadata||{}).some(key=>["medicamento_id","medication_id","tratamento_id","consulta_id","exame_id","cirurgia_id"].includes(key))))linkedIds.add(doc.id);
  let withAttachments=0,prescriptions=0,favorites=0,recent30d=0,futureDated=0;
  for(const doc of docs){if(doc.attachments?.length)withAttachments++;if(doc.type==="receita")prescriptions++;if(doc.is_favorite)favorites++;const created=day(doc.created_at),clinical=day(doc.metadata?.prescription_date)||day(doc.metadata?.date)||created;if(created&&from30&&created>=from30&&created<=today)recent30d++;if(clinical&&today&&clinical>today)futureDated++;}
  const plannedPrescriptions=context.medicamentos.filter(med=>med.person_id===pid&&med.user_id===uid&&med.lembrete_receita_modo==="data_personalizada"&&Boolean(day(med.lembrete_receita_data))&&med.lembrete_receita_data!>=today).length;
  return {total:docs.length,withAttachments,withoutAttachments:docs.length-withAttachments,linked:linkedIds.size,unlinked:Math.max(0,docs.length-linkedIds.size),prescriptions,favorites,recent30d,futureDated,plannedPrescriptions,note:"Vínculo significa relação explícita no cadastro. Documento futuro continua documento; planejamento de receita não cria arquivo, compra, retirada ou estoque."};
}
