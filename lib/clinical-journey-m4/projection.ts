/** M4: pure verified clinical relations. Does not write or infer medical facts. */
export type ScopedM4 = {id?:string; user_id:string; person_id?:string|null; deleted_at?:string|null};
export type SurgeryM4=ScopedM4&{procedimento:string;data:string;status:string;tratamento_ids?:string[];document_id?:string;medico_id?:string;hospital_id?:string};
export type ConsultationM4=ScopedM4&{especialidade:string;medico:string;data:string;status:string;tratamento_ids?:string[];document_id?:string};
export type TreatmentM4=ScopedM4&{nome:string;status:string};
export type DocumentM4=ScopedM4&{title:string;entidade_tipo?:string;entidade_id?:string};
export type OrderM4=ScopedM4&{title:string;requested_on:string|null};
export type OrderItemM4=ScopedM4&{order_id:string;name:string;status:string;result_received_at?:string|null};
export type SessionM4=ScopedM4&{order_id:string;scheduled_at:string;status:string;laboratory_name?:string|null};
export type ConsultationOrderLinkM4=ScopedM4&{consultation_id:string;order_id:string;role:string};
export type AssetM4=ScopedM4&{filename:string;upload_status:string};
export type AssetLinkM4=ScopedM4&{asset_id:string;entity_type:string;entity_id:string;role:string};
export type JourneyRowM4={key:string;label:string;detail:string;href:string;date:string;kind:'surgery'|'consultation'|'treatment'|'document'|'exam'|'session'|'asset';status?:string};
export type ClinicalJourneyInputM4={userId:string;personId:string;surgeryId?:string;consultationId?:string;
 surgeries:readonly SurgeryM4[];consultations:readonly ConsultationM4[];treatments:readonly TreatmentM4[];documents:readonly DocumentM4[];
 orders:readonly OrderM4[];orderItems:readonly OrderItemM4[];sessions:readonly SessionM4[];
 consultationOrderLinks:readonly ConsultationOrderLinkM4[];assets:readonly AssetM4[];assetLinks:readonly AssetLinkM4[]};
export type ClinicalJourneyM4={surgery:JourneyRowM4|null;consultation:JourneyRowM4|null;surgeryRelations:JourneyRowM4[];
 consultationRelations:JourneyRowM4[];contextCandidates:JourneyRowM4[];warnings:string[];
 counts:{confirmed:number;contextCandidates:number;results:number;files:number}};
const text=(s:unknown,n=130)=>typeof s==='string'?s.trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n):'';
const date=(s:unknown)=>{const d=text(s,32).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:'';};
const href=(kind:JourneyRowM4['kind'],id:string)=>{
 if(kind==='asset')return '/saude/documentos'; // M3 Acervo is the viewer authority; no invented deep link.
 const path:Record<JourneyRowM4['kind'],string>={surgery:'/saude/cirurgias/detalhes',consultation:'/saude/consultas/detalhes',
  treatment:'/saude/tratamentos/detalhes',document:'/saude/documentos/detalhes',exam:'/saude/exames/pedidos',
  session:'/saude/exames/pedidos',asset:'/saude/documentos'};
 return `${path[kind]}?id=${encodeURIComponent(id)}`;
};
const scoped=<T extends ScopedM4>(rows:readonly T[],userId:string,personId:string)=>rows.filter(r=>
  Boolean(r.id)&&r.user_id===userId&&r.person_id===personId&&!r.deleted_at);
const row=(kind:JourneyRowM4['kind'],id:string,label:string,detail:string,dt='',status='',identity?:string):JourneyRowM4=>({
 key:`${kind}:${identity||id}`,kind,label:text(label,170),detail:text(detail,240),date:date(dt),status:text(status,80),href:href(kind,id)});
const unique=(rows:JourneyRowM4[])=>[...new Map(rows.map(r=>[r.key,r])).values()];
const byDate=(rows:JourneyRowM4[])=>[...rows].sort((a,b)=>b.date.localeCompare(a.date)||a.label.localeCompare(b.label,'pt-BR'));
/** Preserves explicit-source authority. Shared treatments are contextual candidates, NEVER direct surgery-consultation links. */
export function projectClinicalJourneyM4(input:ClinicalJourneyInputM4):ClinicalJourneyM4{
 const {userId,personId}=input;
 if(!userId||!personId)throw Error('M4: conta e pessoa obrigatórias.');
 const surgeries=scoped(input.surgeries,userId,personId),consultations=scoped(input.consultations,userId,personId);
 const treatments=scoped(input.treatments,userId,personId),documents=scoped(input.documents,userId,personId);
 const orders=scoped(input.orders,userId,personId),items=scoped(input.orderItems,userId,personId);
 const sessions=scoped(input.sessions,userId,personId),links=scoped(input.consultationOrderLinks,userId,personId);
 const assets=scoped(input.assets,userId,personId),assetLinks=scoped(input.assetLinks,userId,personId);
 const surgery=surgeries.find(s=>s.id===input.surgeryId);
 const consultation=consultations.find(c=>c.id===input.consultationId);
 const surgeryRow=surgery?row('surgery',surgery.id!,surgery.procedimento,'Situação informada em Cirurgias',surgery.data,surgery.status):null;
 const consultationRow=consultation?row('consultation',consultation.id!,consultation.especialidade||consultation.medico||'Consulta médica','Situação informada em Consultas',consultation.data,consultation.status):null;
 const surgeryTreatmentIds=new Set(surgery?.tratamento_ids||[]);
 const surgeryTreatments=surgery? treatments.filter(t=>surgeryTreatmentIds.has(t.id!)):[];
 const surgeryRelations:JourneyRowM4[]=[];
 for(const t of surgeryTreatments)surgeryRelations.push(row('treatment',t.id!,t.nome,'Vínculo direto registrado em Cirurgias','',t.status));
 for(const d of documents.filter(d=>surgery&&(d.id===surgery.document_id||(d.entidade_tipo==='cirurgia'&&d.entidade_id===surgery.id))))
  surgeryRelations.push(row('document',d.id!,d.title,'Documento com vínculo explícito à cirurgia'));
 const contextCandidates:JourneyRowM4[]=[];
 if(surgeryTreatmentIds.size)for(const c of consultations){
  const intersection=(c.tratamento_ids||[]).filter(id=>surgeryTreatmentIds.has(id)&&surgeryTreatments.some(t=>t.id===id));
  if(intersection.length)contextCandidates.push(row('consultation',c.id!,c.especialidade||c.medico||'Consulta',
   'Tratamento em comum: contexto para conferência, NÃO é vínculo cirúrgico confirmado',c.data,c.status));
 }
 const consultationRelations:JourneyRowM4[]=[];
 if(consultation){
  for(const t of treatments.filter(t=>(consultation.tratamento_ids||[]).includes(t.id!)))
   consultationRelations.push(row('treatment',t.id!,t.nome,'Tratamento vinculado diretamente à consulta','',t.status));
  for(const d of documents.filter(d=>d.id===consultation.document_id||(d.entidade_tipo==='consulta'&&d.entidade_id===consultation.id)))
   consultationRelations.push(row('document',d.id!,d.title,'Documento vinculado explicitamente à consulta'));
  const linkedOrderIds=new Set(links.filter(l=>l.consultation_id===consultation.id&&l.role!=='').map(l=>l.order_id));
  const matched=orders.filter(o=>linkedOrderIds.has(o.id!));
  const orderIds=new Set(matched.map(o=>o.id!));
  const itemIds=new Set(items.filter(i=>orderIds.has(i.order_id)).map(i=>i.id!));
  const sessionIds=new Set(sessions.filter(s=>orderIds.has(s.order_id)).map(s=>s.id!));
  for(const o of matched)consultationRelations.push(row('exam',o.id!,o.title,'Pedido vinculado por consulta e ID canônico',o.requested_on||''));
  for(const i of items.filter(i=>orderIds.has(i.order_id))){
   consultationRelations.push(row('exam',i.order_id,`Exame: ${i.name}`,
    i.result_received_at?'Resultado recebido no cadastro':'Resultado não comprovado no cadastro','',i.status,`item-${i.id}`));
  }
  for(const s of sessions.filter(s=>orderIds.has(s.order_id))){
   consultationRelations.push(row('session',s.order_id,s.laboratory_name||'Sessão de exames',
    'Agendamento registrado; conferir o horário civil no pedido original','',s.status,`session-${s.id}`));
  }
  const validTargets=new Set<string>([
   `consultation:${consultation.id}`,...matched.map(o=>`exam_order:${o.id}`),
   ...[...itemIds].map(id=>`exam_order_item:${id}`),...[...sessionIds].map(id=>`exam_session:${id}`)]);
  const assetIds=new Set(assetLinks.filter(l=>validTargets.has(`${l.entity_type}:${l.entity_id}`)).map(l=>l.asset_id));
  for(const asset of assets.filter(a=>assetIds.has(a.id!))){
   consultationRelations.push(row('asset',asset.id!,asset.filename,
    asset.upload_status==='synced'?'Arquivo clínico privado sincronizado':'Arquivo clínico privado com sincronização pendente',
    '',asset.upload_status));
  }
 }
 const confirmed=unique([...surgeryRelations,...consultationRelations]);
 const warnings:string[]=[];
 if(surgeryRow&&consultationRow)warnings.push('A cirurgia e a consulta foram selecionadas separadamente. Isso NÃO comprova vínculo entre elas.');
 if(surgeryRow&&!surgeryRelations.length)warnings.push('Cirurgia sem tratamentos ou documentos diretamente vinculados.');
 if(consultationRow&&!consultationRelations.length)warnings.push('Consulta sem vínculos adicionais verificados neste resumo.');
 warnings.push('Não presumir avaliação pré-operatória, alta, fisioterapia, liberação clínica ou resultado com base em datas próximas.');
 const results=items.filter(i=>consultation&&links.some(l=>l.consultation_id===consultation.id&&
  orders.some(o=>o.id===l.order_id&&o.id===i.order_id))&&Boolean(i.result_received_at)).length;
 return {surgery:surgeryRow,consultation:consultationRow,surgeryRelations:byDate(unique(surgeryRelations)),
  consultationRelations:byDate(unique(consultationRelations)),contextCandidates:byDate(unique(contextCandidates)),
  warnings,counts:{confirmed:confirmed.length,contextCandidates:unique(contextCandidates).length,results,
  files:consultationRelations.filter(r=>r.kind==='asset').length}};
}
