/** M3 P1 — read model local, nunca muta os registros CareFlow M2. */
import type { CareFlowEventM2, CareFlowKindM2 } from '@/lib/careflow-m2/domain';
import { isIsoDateM2 } from '@/lib/careflow-m2/domain';
export const CAREFLOW_KINDS_M3:readonly CareFlowKindM2[]=['exam_order','exam_item','exam_status','exam_result','monitor_plan','monitor_reading','monitor_note'];
const label:Record<CareFlowKindM2,string>={
  exam_order:'Pedido de exames',exam_item:'Exame selecionado',exam_status:'Situação de exame',exam_result:'Resultado informado',
  monitor_plan:'Plano de acompanhamento',monitor_reading:'Aferição vinculada',monitor_note:'Observação vinculada'
};
export type CareFlowTimelineRowM3={id:string;kind:CareFlowKindM2;date:string;dateSource:'evento'|'cadastro';title:string;details:string;parentId:string|null;relatedId:string|null};
const safe=(x:unknown,max=140)=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const human=(s:string)=>s.replace(/\bhealth_connect\b/g,'Health Connect / dispositivo conectado').replace(/\bhealth_record\b/g,'Registro de saúde').replace(/\bconsultation\b/g,'Consulta médica').replace(/\bscheduled\b/g,'Programada');
export function buildCareFlowTimelineM3(events:readonly CareFlowEventM2[],ownerId:string,personId:string,registros:readonly {id?:string;user_id?:string;person_id?:string;nome:string;data:string;horario?:string;intensidade?:number|null;observacoes?:string|null}[]=[]):CareFlowTimelineRowM3[]{
  if(!ownerId||!personId)return [];
  return events.filter(e=>e.user_id===ownerId&&e.person_id===personId&&CAREFLOW_KINDS_M3.includes(e.kind))
    .map(e=>{
      const proposed=safe(e.payload.date,10)||safe(e.payload.start,10);
      const withDate=isIsoDateM2(proposed);
      const linked=e.kind==='monitor_note'&&e.related_id&&e.payload.link==='consultation_to_existing_symptom'
        ? registros.find(r=>r.id===e.related_id&&r.user_id===ownerId&&r.person_id===personId):undefined;
      const date=linked&&isIsoDateM2(linked.data)?linked.data:withDate?proposed:safe(e.created_at,10);
      const title=linked?`Sintoma · ${safe(linked.nome,100)}`:safe(e.payload.title)||safe(e.payload.name)|| (e.kind==='monitor_note'&&e.payload.link==='consultation_to_existing_symptom'?'Vínculo de sintoma a revisar':label[e.kind]);
      const details=[safe(e.payload.result),safe(e.payload.state),safe(e.payload.note),safe(e.payload.source)].map(human)
        .filter(Boolean).join(' · ')+(linked?` · ${linked.intensidade==null?'Intensidade não informada':`Intensidade ${linked.intensidade}/10`}${linked.horario?` · ${linked.horario}`:''}${linked.observacoes?` · ${safe(linked.observacoes,140)}`:''}`:'');
      return {id:e.id,kind:e.kind,date,dateSource:(Boolean(linked&&isIsoDateM2(linked.data))||withDate)?'evento' as const:'cadastro' as const,
        title,details,parentId:e.parent_id,relatedId:e.related_id};
    }).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export async function makeCareFlowTimelinePdfM3(personName:string,rows:readonly CareFlowTimelineRowM3[]):Promise<Blob>{
  const {default:jsPDF}=await import('jspdf');
  const pdf=new jsPDF({format:'a4',unit:'mm',compress:true});let y=18;
  const clean=(s:string)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  function line(s:string,bold=false){
    pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(bold?11:9);
    for(const part of pdf.splitTextToSize(clean(s),174) as string[]){if(y>275){pdf.addPage();y=18;}pdf.text(part,18,y);y+=bold?6:5;}
    y+=1;
  }
  line('VAULT · CAREFLOW 360 | LINHA DO TEMPO LOCAL',true);
  line(`Pessoa: ${personName} · ${rows.length} evento(s) selecionado(s)`);
  line('Dados declarados ou vinculados no aplicativo. Não representam diagnóstico nem confirmação de uso.');
  if(rows.length===0)line('Sem registros selecionados para a linha do tempo.');
  for(const row of rows.slice(0,500)){
    line(`${/^\d{4}-\d{2}-\d{2}$/.test(row.date)?row.date.split('-').reverse().join('/'):row.date} (${row.dateSource==='evento'?'data informada':'data do cadastro'}) · ${row.title}`,true);
    line(`${label[row.kind]}${row.details?' · '+row.details:''}`);
  }
  line('Ausência de registro não prova ausência de evento. Compartilhamento somente após ação da pessoa.');
  return pdf.output('blob');
}
