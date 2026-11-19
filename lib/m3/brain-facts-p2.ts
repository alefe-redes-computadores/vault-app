/** M3 P2 + CareFlow P0 R1: projecao factual de leitura, sem escrita ou inferencia clinica. */
export type BrainFactKindP2='consulta'|'cirurgia'|'exame'|'dose_tomada'|'dose_ignorada'|'dose_registrada'|'medicao'|'registro'|'careflow';
export type BrainFactP2={key:string;sourceId:string;kind:BrainFactKindP2;title:string;date:string;time:string;provenance:string;href:string;detail:string;intensity?:number};
export type BrainInputP2={
 userId:string;personId:string;
 consultas:readonly {id?:string;user_id?:string;person_id?:string;data:string;status:string;motivo?:string}[];
 cirurgias:readonly {id?:string;user_id?:string;person_id?:string;data:string;status:string;procedimento?:string}[];
 exames:readonly {id?:string;user_id?:string;person_id?:string;data:string;nome:string}[];
 doses:readonly {id?:string;user_id?:string;person_id?:string;medicamento_id?:string|null;data:string;horario?:string;tomado_em?:string;ignorado_em?:string}[];
 medicamentos?:readonly {id?:string;user_id?:string;person_id?:string|null;nome:string;dosagem?:string|null}[];
 registros:readonly {id?:string;user_id?:string;person_id?:string;data:string;nome:string;horario?:string;tipo?:string;intensidade?:number;valor_numerico?:number;valor_medicao?:string;unidade_medida?:string;source?:string|null}[];
 careflow:readonly {id:string;user_id:string;person_id:string;created_at:string;kind:string;related_id?:string|null;parent_id?:string|null;payload:Record<string,unknown>}[];
};
const trim=(v:unknown,n=90)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const day=(s:unknown)=>{
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(s))return '';
 const value=s.slice(0,10),[y,m,d]=value.split('-').map(Number),utc=new Date(Date.UTC(y,m-1,d));
 return utc.getUTCFullYear()===y&&utc.getUTCMonth()===m-1&&utc.getUTCDate()===d?value:'';
};
const time=(s:unknown)=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d/.test(s)?s.slice(0,5):'';
const numberText=(n:number)=>String(n).replace('.',',');
const sourceText=(s:unknown)=>s==='health_connect'?'Health Connect / dispositivo conectado':s==='scheduled'?'Programada':s==='manual'?'Registro manual':s==='sos'?'SOS / Extra':trim(s,80)||'Registro informado';
export function buildBrainFactsP2(input:BrainInputP2,max=80):BrainFactP2[]{
 if(!input.userId||!input.personId)return [];
 const owner=(x:{user_id?:string;person_id?:string|null})=>x.user_id===input.userId&&x.person_id===input.personId;
 const meds=new Map((input.medicamentos||[]).filter(m=>owner(m)&&m.id).map(m=>[m.id!,m] as const));
 const rows:BrainFactP2[]=[];
 const append=(kind:BrainFactKindP2,id:string|undefined,date:string,title:string,detail:string,href:string,provenance:string,hour='',intensity?:number)=>{
  if(!id||!day(date))return;
  rows.push({key:`${kind}:${id}`,sourceId:id,kind,title:trim(title,140),date:day(date),time:time(hour),detail:trim(detail,260),href,provenance,intensity});
 };
 for(const c of input.consultas.filter(owner))append('consulta',c.id,c.data,'Consulta · '+trim(c.motivo||'Compromisso'),`Situação registrada: ${trim(c.status)}`,`/saude/consultas/detalhes?id=${encodeURIComponent(c.id||'')}`,'Consulta cadastrada');
 for(const c of input.cirurgias.filter(owner))append('cirurgia',c.id,c.data,'Cirurgia · '+trim(c.procedimento||'Procedimento'),`Situação registrada: ${trim(c.status)}`,`/saude/cirurgias/detalhes?id=${encodeURIComponent(c.id||'')}`,'Cirurgia cadastrada');
 for(const e of input.exames.filter(owner))append('exame',e.id,e.data,'Exame · '+trim(e.nome),'Agendamento ou registro; não comprova resultado',`/saude/exames/detalhes?id=${encodeURIComponent(e.id||'')}`,'Exame cadastrado');
 for(const d of input.doses.filter(owner)){
  const status:BrainFactKindP2=d.tomado_em?'dose_tomada':d.ignorado_em?'dose_ignorada':'dose_registrada';
  const med=d.medicamento_id?meds.get(d.medicamento_id):undefined;
  const name=med?`${trim(med.nome,100)}${trim(med.dosagem,45)?' · '+trim(med.dosagem,45):''}`:'Medicamento não identificado neste perfil';
  const label=status==='dose_tomada'?'tomada registrada':status==='dose_ignorada'?'ignorada registrada':'registro sem confirmação';
  append(status,d.id,d.data,`${name} — ${label}`,`Horário previsto: ${time(d.horario)||'não informado'}. Estado factual: ${label}.`,
   `/saude/careflow/fato?tipo=dose&id=${encodeURIComponent(d.id||'')}`,'Registro de dose',d.horario||'');
 }
 for(const r of input.registros.filter(owner)){
  const n=typeof r.valor_numerico==='number'&&Number.isFinite(r.valor_numerico)?numberText(r.valor_numerico):'';
  const measurement=/^(pressao_arterial|glicemia|peso|temperatura|frequencia_cardiaca|saturacao|pressao|oximetria|batimentos)$/i.test(r.tipo||'')||Boolean(n&&r.unidade_medida);
  const value=n||trim(r.valor_medicao,45);const unit=trim(r.unidade_medida,35);
  const label=trim(r.nome||r.tipo||'Registro de saúde');
  const detail=value?`${value}${unit?' '+unit:''}`:'Valor não informado';
  append(measurement?'medicao':'registro',r.id,r.data,label,detail,
   `/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(r.id||'')}`,r.source?'Registro · '+sourceText(r.source):'Registro informado',r.horario||'',r.intensidade);
 }
 for(const e of input.careflow.filter(owner)){
  const labels:Record<string,string>={exam_order:'Pedido de exames',exam_item:'Exame solicitado',exam_status:'Situação de exame',exam_result:'Resultado de exame',monitor_plan:'Plano de acompanhamento',monitor_reading:'Medição vinculada',monitor_note:'Observação vinculada'};
  const related=e.kind==='monitor_note'&&e.related_id?input.registros.find(r=>r.id===e.related_id&&owner(r)):undefined;
  const contextual=e.kind==='monitor_note'&&e.payload?.link==='consultation_to_existing_symptom';
  const title=related?`Sintoma · ${trim(related.nome||related.tipo||'Relato pessoal')}`:contextual?'Vínculo de sintoma para conferir':trim(e.payload?.title||e.payload?.name||labels[e.kind]||'Evento de acompanhamento');
  const date=related?.data||day(e.payload?.date)||day(e.payload?.start)||e.created_at;
  const detail=related?`${typeof related.intensidade==='number'?`Intensidade ${related.intensidade}/10 · `:''}${trim(e.payload?.note||'Ligado à consulta registrada')}`:trim(e.payload?.note||e.payload?.state||'Registro de acompanhamento');
  // Nunca abrir uma lista genérica fingindo ser o fato. Resolve o pedido pelo parent_id próprio.
  const item=e.kind==='exam_item'?e:(e.parent_id?input.careflow.find(p=>p.id===e.parent_id&&owner(p)&&p.kind==='exam_item'):undefined);
  const parent=e.kind==='exam_order'?e:(item?.parent_id?input.careflow.find(p=>p.id===item.parent_id&&owner(p)&&p.kind==='exam_order'):undefined);
  const orderId=parent?.id;
  const href=related?.id?`/saude/careflow/sintomas#careflow-sintoma-${encodeURIComponent(related.id)}`:
    item&&parent?`/saude/careflow/exames#careflow-exame-${encodeURIComponent(item.id)}`:
    orderId?`/saude/careflow/exames#careflow-pedido-${encodeURIComponent(orderId)}`:
    e.kind==='monitor_plan'||e.kind==='monitor_reading'?'/saude/careflow/pressao':'/saude/careflow/dossie';
  append('careflow',e.id,date,title,detail,href,related?'Sintoma relacionado à consulta':contextual?'Vínculo a revisar':'Acompanhamento da pessoa',trim(e.payload?.time||'',8),related?.intensidade);
 }
 const seen=new Set<string>();
 return rows.filter(r=>!seen.has(r.key)&&Boolean(seen.add(r.key)))
   .sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)||a.key.localeCompare(b.key))
   .slice(0,Math.max(0,Math.min(10000,max)));
}
