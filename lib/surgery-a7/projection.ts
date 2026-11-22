/**
 * A7/M6 — read-only surgical journey over canonical M4/M5 entities.
 * No clinical writes, no automatic medical conclusions and no date-based linkage.
 * Input always scoped by authenticated user and active person.
 */
import {A7_EVENT_LABEL,A7_SOURCE_LABEL,type A7Event,type A7Team} from './types';
export type ScopedA7 = {id?:string;user_id:string;person_id?:string|null;deleted_at?:string|null};
export type SurgeryA7 = ScopedA7 & {procedimento:string;data:string;horario?:string;status:string;observacoes?:string;medico_id?:string;hospital_id?:string;local_id?:string;tratamento_ids?:string[];document_id?:string};
export type ConsultationA7 = ScopedA7 & {especialidade:string;medico:string;data:string;horario?:string;status:string;observacoes?:string;orientacao_profissional?:string;proximos_passos?:string};
export type LinkA7 = ScopedA7 & {cirurgia_id:string;consulta_id:string;role:string;note?:string|null};
export type TreatmentA7 = ScopedA7 & {nome:string;status:string};
export type DocumentA7 = ScopedA7 & {title:string;entidade_tipo?:string;entidade_id?:string};
export type OrderA7 = ScopedA7 & {title:string;requested_on?:string|null;status?:string};
export type OrderLinkA7 = ScopedA7 & {consultation_id:string;order_id:string;role:string};
export type RehabProgramA7 = ScopedA7 & {title:string;status:string;start_date?:string|null};
export type RehabOriginA7 = ScopedA7 & {program_id:string;origin_type:string;origin_id:string};
export type RehabSessionA7 = ScopedA7 & {program_id:string;scheduled_at:string;status:string};
/** A5's canonical records; read-only in A7. Never infer the relationship from dates. */
export type HospitalizationA7 = ScopedA7 & {
 reason:string;status:string;admission_kind:string;planned_admission_on?:string|null;
 admitted_on?:string|null;discharged_on?:string|null;facility_name_snapshot?:string|null;
 hospital_id?:string|null;local_id?:string|null;note?:string|null;
};
export type HospitalizationRelationA7 = ScopedA7 & {
 hospitalization_id:string;entity_type:string;entity_id:string;relation_role:string;
 source:string;note?:string|null;
};
/** M3 assets belong to their original private-storage authority, never public URLs. */
export type HospitalizationEventA7 = ScopedA7 & {
 hospitalization_id:string;kind:string;summary:string;occurred_on?:string|null;source:string;
};
export type HospitalizationDischargeA7 = ScopedA7 & {
 hospitalization_id:string;disposition:string;summary:string;reviewed_on?:string|null;source:string;
 instructions?:string|null;warning_signs?:string|null;followup_plan?:string|null;
};
export type HospitalizationTeamA7 = ScopedA7 & {
 hospitalization_id:string;professional_id:string;role:string;started_on?:string|null;ended_on?:string|null;
};
export type HospitalizationStayA7 = ScopedA7 & {
 hospitalization_id:string;entered_on?:string|null;left_on?:string|null;ward_label?:string|null;unit_type?:string|null;
};
export type ClinicalAssetA7 = ScopedA7 & {filename:string;upload_status:string};
export type ClinicalAssetLinkA7 = ScopedA7 & {asset_id:string;entity_type:string;entity_id:string;role:string};
export type AccountEntityA7 = {id?:string;user_id:string;nome:string};
export type SurgeryJourneyInputA7 = {
 userId:string;personId:string;surgeryId:string;
 surgeries:readonly SurgeryA7[];consultations:readonly ConsultationA7[];links:readonly LinkA7[];
 treatments:readonly TreatmentA7[];documents:readonly DocumentA7[];
 orders:readonly OrderA7[];orderLinks:readonly OrderLinkA7[];
 rehabPrograms:readonly RehabProgramA7[];rehabOrigins:readonly RehabOriginA7[];rehabSessions:readonly RehabSessionA7[];
 doctors:readonly AccountEntityA7[];hospitals:readonly AccountEntityA7[];
 hospitalizations?:readonly HospitalizationA7[];hospitalizationRelations?:readonly HospitalizationRelationA7[];
 hospitalizationEvents?:readonly HospitalizationEventA7[];hospitalizationDischarges?:readonly HospitalizationDischargeA7[];
 hospitalizationTeam?:readonly HospitalizationTeamA7[];hospitalizationStays?:readonly HospitalizationStayA7[];
 clinicalAssets?:readonly ClinicalAssetA7[];clinicalAssetLinks?:readonly ClinicalAssetLinkA7[];
 surgeryEvents?:readonly A7Event[];surgeryTeam?:readonly A7Team[];
};
export type SurgeryStageA7 = 'pre'|'procedure'|'post'|'return'|'related'|'rehabilitation'|'hospitalization';
export type SurgeryRowA7 = {
 key:string;stage:SurgeryStageA7;kind:'consultation'|'surgery'|'treatment'|'document'|'exam'|'rehabilitation'|'hospitalization'|'asset'|'hospital_event'|'hospital_discharge'|'hospital_team'|'hospital_stay'|'surgical_event'|'surgical_team';
 title:string;detail:string;date:string;time:string;status:string;href:string;
 evidence:string;sourceId:string;
};
export type SurgeryJourneyA7 = {
 id:string;procedure:string;date:string;time:string;status:string;observations:string;
 doctor:{name:string;href:string}|null;hospital:{name:string;href:string}|null;
 stages:Record<SurgeryStageA7,SurgeryRowA7[]>;
 counts:{consultations:number;exams:number;treatments:number;documents:number;rehabilitation:number;hospitalizations:number;privateAssets:number;surgicalEvents:number;surgicalTeam:number};
 caveats:string[];
};
const safe=(x:unknown,max=450):string=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const owned=<T extends ScopedA7>(a:readonly T[],uid:string,pid:string)=>a.filter(x=>Boolean(x.id)&&x.user_id===uid&&x.person_id===pid&&!x.deleted_at);
const unique=<T extends {key:string}>(a:T[]):T[]=>Array.from(new Map(a.map(x=>[x.key,x])).values());
const isoDay=(input:unknown)=>{
 const value=safe(input,32).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';
 const [year,month,day]=value.split('-').map(Number);
 const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()+1===month&&d.getUTCDate()===day?value:'';
};
const validTime=(input:unknown)=>{const raw=safe(input,5);return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw)?raw:'';};
const toSurgeryHref=(id:string)=>`/saude/cirurgias/detalhes?id=${encodeURIComponent(id)}`;
const toConsultationHref=(id:string)=>`/saude/consultas/detalhes?id=${encodeURIComponent(id)}`;
const toOrderHref=(id:string)=>`/saude/exames/pedidos?id=${encodeURIComponent(id)}`;
const toRehabHref=(id:string)=>`/saude/reabilitacao/detalhes?id=${encodeURIComponent(id)}`;
const stageOf=(role:string):SurgeryStageA7=>role==='preoperative'?'pre':role==='postoperative'?'post':role==='return_visit'?'return':'related';
const stageSort=(rows:SurgeryRowA7[])=>rows.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.time.localeCompare(b.time)||a.title.localeCompare(b.title,'pt-BR'));
const row=(stage:SurgeryStageA7,kind:SurgeryRowA7['kind'],id:string,identity:string,title:string,detail:string,date:string,time:string,status:string,href:string,evidence:string):SurgeryRowA7=>({
 key:`${stage}:${kind}:${identity}`,stage,kind,sourceId:id,title:safe(title,180)||'Registro sem título',detail:safe(detail,3500),date:isoDay(date),time:validTime(time),status:safe(status,80),href,evidence:safe(evidence,200)
});
/** Does not infer pre-op approval, recovery, discharge or clinical relationship from timing. */
export function projectSurgeryJourneyA7(input:SurgeryJourneyInputA7):SurgeryJourneyA7|null{
 const {userId:uid,personId:pid,surgeryId:sid}=input;
 if(!uid||!pid||!sid)return null;
 const surgery=owned(input.surgeries,uid,pid).find(x=>x.id===sid);if(!surgery)return null;
 const consultations=new Map(owned(input.consultations,uid,pid).map(x=>[x.id!,x]));
 const orders=new Map(owned(input.orders,uid,pid).map(x=>[x.id!,x]));
 const treatmentIds=new Set(surgery.tratamento_ids||[]);
 const treatments=[...new Map(owned(input.treatments,uid,pid).filter(x=>treatmentIds.has(x.id!)).map(x=>[x.id!,x])).values()];
 const documents=[...new Map(owned(input.documents,uid,pid).filter(x=>x.id===surgery.document_id||(x.entidade_tipo==='cirurgia'&&x.entidade_id===sid)).map(x=>[x.id!,x])).values()];
 const stages:Record<SurgeryStageA7,SurgeryRowA7[]>={pre:[],procedure:[],post:[],return:[],related:[],rehabilitation:[],hospitalization:[]};
 stages.procedure.push(row('procedure','surgery',sid,sid,surgery.procedimento,
  surgery.status==='realizada'?'Procedimento informado como realizado. Isso não comprova alta nem ausência de complicações.':
  surgery.status==='cancelada'?'Cancelamento informado no cadastro original.':'Data e situação informadas no cadastro original.',
  surgery.data,surgery.horario||'',surgery.status,toSurgeryHref(sid),'Fonte: registro original de Cirurgias'));
 // A7 authored observations are immutable historical facts. Corrections remain separate rows.
 const surgicalEvents=owned(input.surgeryEvents||[],uid,pid).filter(e=>e.cirurgia_id===sid);
 for(const e of surgicalEvents){
  if(!['pre','procedure','post','return'].includes(e.stage)||!A7_EVENT_LABEL[e.kind]||!A7_SOURCE_LABEL[e.source])continue;
  const stage=e.stage as SurgeryStageA7;
  stages[stage].push(row(stage,'surgical_event',e.id!,e.id!,e.title,
   [A7_EVENT_LABEL[e.kind],e.description,e.corrects_event_id?'Retificação vinculada ao fato anterior':''].filter(Boolean).join(' · '),
   e.occurred_on||'','','',`/saude/cirurgias/jornada?id=${encodeURIComponent(sid)}#a7-event-${encodeURIComponent(e.id!)}`,
   `Fonte: ${A7_SOURCE_LABEL[e.source]}; registro imutável da própria jornada cirúrgica`));
 }
 const surgicalTeam=owned(input.surgeryTeam||[],uid,pid).filter(t=>t.cirurgia_id===sid);
 for(const t of surgicalTeam){
  const person=input.doctors.find(d=>d.id===t.professional_id&&d.user_id===uid);
  if(!person)continue; // Avoid orphaned or foreign professional identity.
  stages.procedure.push(row('procedure','surgical_team',t.id!,t.id!,person.nome,
   [t.role,t.note||''].filter(Boolean).join(' · '), '', '', '',
   `/saude/medicos/detalhes?id=${encodeURIComponent(t.professional_id)}`,
   `Fonte: ${A7_SOURCE_LABEL[t.source]}; função declarada no procedimento, não inferida pela internação`));
 }
 const links=owned(input.links,uid,pid).filter(x=>x.cirurgia_id===sid&&consultations.has(x.consulta_id));
 const uniqueLinks=unique(links.map(link=>({key:`${link.consulta_id}:${link.role}`,link}))).map(x=>x.link);
 const orderLinks=owned(input.orderLinks,uid,pid);
 const seenOrders=new Set<string>();
 for(const link of uniqueLinks){
  const c=consultations.get(link.consulta_id)!;const stage=stageOf(link.role);
  const roleLabel=link.role==='preoperative'?'Consulta vinculada como pré-operatório':
   link.role==='postoperative'?'Consulta vinculada como pós-operatório':
   link.role==='return_visit'?'Retorno vinculado':'Consulta relacionada';
  stages[stage].push(row(stage,'consultation',c.id!,`${link.id||c.id}:${link.role}`,c.especialidade||c.medico||'Consulta',
    [roleLabel,safe(link.note,500),c.orientacao_profissional?'Orientação informada no atendimento: '+safe(c.orientacao_profissional,1200):'',c.proximos_passos?'Próximos passos declarados: '+safe(c.proximos_passos,1200):'',c.observacoes?'Observações da consulta: '+safe(c.observacoes,1000):''].filter(Boolean).join(' · '),c.data,c.horario||'',c.status,
    toConsultationHref(c.id!),'Vínculo explícito Cirurgia ↔ Consulta (M4)'));
  for(const ol of orderLinks.filter(x=>x.consultation_id===c.id&&orders.has(x.order_id))){
   const order=orders.get(ol.order_id)!;const key=`${stage}:${order.id}`;
   if(seenOrders.has(key))continue;seenOrders.add(key);
   stages[stage].push(row(stage,'exam',order.id!,`${order.id}`,order.title,'Pedido associado à consulta vinculada. O vínculo com a cirurgia é indireto e está identificado.',
    order.requested_on||'','','',toOrderHref(order.id!),'Origem: consulta vinculada + pedido de exame por ID'));
  }
 }
 for(const t of treatments)stages.related.push(row('related','treatment',t.id!,t.id!,t.nome,
  'Tratamento vinculado diretamente ao cadastro da cirurgia; não representa prescrição nova.','','',t.status,
  `/saude/tratamentos/detalhes?id=${encodeURIComponent(t.id!)}`,'Fonte: tratamento_ids da cirurgia'));
 for(const d of documents)stages.related.push(row('related','document',d.id!,d.id!,d.title,
  'Documento associado por identificador explícito.','', '', '',
  `/saude/documentos/detalhes?id=${encodeURIComponent(d.id!)}`,'Fonte: vínculo de documento da cirurgia'));
 // A5 relation is the ONLY way to associate an hospitalization episode with this surgery.
 const episodes=new Map(owned(input.hospitalizations||[],uid,pid).map(x=>[x.id!,x]));
 const hospitalLinks=owned(input.hospitalizationRelations||[],uid,pid).filter(x=>
  x.entity_type==='cirurgia'&&x.entity_id===sid&&episodes.has(x.hospitalization_id));
 const hospitalIDs=new Set(hospitalLinks.map(x=>x.hospitalization_id));
 const roles:Record<string,string>={origin:'Origem registrada',during:'Durante a internação',followup:'Acompanhamento relacionado',
  related:'Relação declarada',discharge_plan:'Plano de alta relacionado',rehab_referral:'Encaminhamento relacionado',medication_history:'Histórico registrado'};
 const statuses:Record<string,string>={planned:'Internação planejada',admitted:'Internação registrada',on_leave:'Saída temporária registrada',
  discharged:'Alta hospitalar registrada',cancelled:'Internação cancelada'};
 for(const id of hospitalIDs){
  const e=episodes.get(id)!;
  const link=hospitalLinks.find(x=>x.hospitalization_id===id)!;
  const date=e.status==='planned'?e.planned_admission_on:e.status==='cancelled'?e.planned_admission_on:
   e.status==='discharged'?e.discharged_on||e.admitted_on:e.admitted_on;
  const label=statuses[e.status]||'Situação registrada em Internações';
  const detail=[roles[link.relation_role]||'Relação explicitamente declarada',
   e.facility_name_snapshot||'',e.reason||'',link.note||'',
   e.status==='discharged'&&e.discharged_on?'Alta documentada no episódio A5; não comprova recuperação cirúrgica.':''].filter(Boolean).join(' · ');
  stages.hospitalization.push(row('hospitalization','hospitalization',id,id,label,detail,date||'', '',e.status,
   `/saude/internacoes/detalhes?id=${encodeURIComponent(id)}`,'Fonte: Internações A5, vínculo explícito por ID; abertura no episódio original'));
  // Sub-events are scoped by account, person AND an owned, explicitly linked episode.
  for(const evt of owned(input.hospitalizationEvents||[],uid,pid).filter(x=>x.hospitalization_id===id)){
   stages.hospitalization.push(row('hospitalization','hospital_event',evt.id!,evt.id!,
    'Registro na internação', [({admission:'Admissão documentada',transfer_internal:'Mudança de setor',transfer_external:'Transferência externa',procedure_note:'Procedimento informado',clinical_update:'Evolução documentada',care_note:'Nota de cuidado',complication_report:'Intercorrência informada',discharge:'Saída documentada',correction:'Correção',other:'Outro fato'} as Record<string,string>)[evt.kind]||'Registro',evt.summary].filter(Boolean).join(' · '),evt.occurred_on||'','','',
    `/saude/internacoes/detalhes?id=${encodeURIComponent(id)}`,'Fonte: ocorrência documentada no episódio hospitalar A5'));
  }
  for(const discharge of owned(input.hospitalizationDischarges||[],uid,pid).filter(x=>x.hospitalization_id===id)){
   stages.hospitalization.push(row('hospitalization','hospital_discharge',discharge.id!,discharge.id!,
    'Informação de alta no episódio', [({home:'Domicílio',transfer:'Transferência',other_facility:'Outra instituição',against_advice:'Por decisão própria',death:'Óbito informado',other:'Outro destino',unknown:'Não informado'} as Record<string,string>)[discharge.disposition]||'Não informado',discharge.summary,discharge.instructions?'Orientações registradas: '+safe(discharge.instructions,800):'',discharge.followup_plan?'Plano de retorno informado: '+safe(discharge.followup_plan,800):'',discharge.warning_signs?'Sinais de atenção documentados: '+safe(discharge.warning_signs,500):''].filter(Boolean).join(' · '),
    discharge.reviewed_on||'','','', `/saude/internacoes/detalhes?id=${encodeURIComponent(id)}`,
    'Fonte: informação documentada na A5; não presume recuperação cirúrgica'));
  }
  for(const team of owned(input.hospitalizationTeam||[],uid,pid).filter(x=>x.hospitalization_id===id)){
   const professional=input.doctors.find(x=>x.id===team.professional_id&&x.user_id===uid);
   stages.hospitalization.push(row('hospitalization','hospital_team',team.id!,team.id!,
    'Equipe da internação', [professional?.nome||'Profissional não identificado nesta visualização',team.role].filter(Boolean).join(' · '),
    team.started_on||'','','', `/saude/internacoes/detalhes?id=${encodeURIComponent(id)}`,
    'Equipe relacionada à internação; não comprova participação na equipe cirúrgica'));
  }
  for(const stay of owned(input.hospitalizationStays||[],uid,pid).filter(x=>x.hospitalization_id===id)){
   stages.hospitalization.push(row('hospitalization','hospital_stay',stay.id!,stay.id!,
    'Permanência hospitalar registrada', [stay.ward_label,({unspecified:'Setor não informado',emergency:'Urgência',ward:'Enfermaria',icu:'UTI',stepdown:'Cuidados intermediários',surgical:'Centro cirúrgico',rehabilitation:'Reabilitação',other:'Outro setor'} as Record<string,string>)[stay.unit_type||'unspecified']||'Setor não informado',stay.left_on?'Saída documentada no registro':''].filter(Boolean).join(' · '),
    stay.entered_on||'','','', `/saude/internacoes/detalhes?id=${encodeURIComponent(id)}`,
    'Fonte: unidade/permanência documentada no episódio A5'));
  }
 }
 // Private M3 assets cannot attach directly to surgery in the current verified storage policy.
 // Include them ONLY through an explicitly linked consultation or A5 episode/event/discharge.
 const assetMap=new Map(owned(input.clinicalAssets||[],uid,pid).map(x=>[x.id!,x]));
 const validAssetTargets=new Map<string,{label:string;href:string}>();
 for(const link of uniqueLinks){
  const c=consultations.get(link.consulta_id);if(!c)continue;
  validAssetTargets.set(`consultation:${c.id}`,{label:'Consulta vinculada à cirurgia',href:toConsultationHref(c.id!)});
 }
 for(const episodeId of hospitalIDs){
  if(!episodes.has(episodeId))continue;
  const href=`/saude/internacoes/detalhes?id=${encodeURIComponent(episodeId)}`;
  validAssetTargets.set(`hospitalization:${episodeId}`,{label:'Internação vinculada à cirurgia',href});
  for(const evt of owned(input.hospitalizationEvents||[],uid,pid).filter(e=>e.hospitalization_id===episodeId))
   validAssetTargets.set(`hospitalization_event:${evt.id}`,{label:'Registro da internação vinculada',href});
  for(const discharge of owned(input.hospitalizationDischarges||[],uid,pid).filter(e=>e.hospitalization_id===episodeId))
   validAssetTargets.set(`hospitalization_discharge:${discharge.id}`,{label:'Documento de saída da internação vinculada',href});
 }
 const permittedAssets=new Map<string,{label:string;href:string}>();
 for(const link of owned(input.clinicalAssetLinks||[],uid,pid)){
  if(!assetMap.has(link.asset_id))continue;
  const target=validAssetTargets.get(`${link.entity_type}:${link.entity_id}`);
  if(target)permittedAssets.set(link.asset_id,target);
 }
 for(const [id,target] of permittedAssets){
  const asset=assetMap.get(id)!;
  stages.related.push(row('related','asset',id,id,asset.filename,
   [target.label,asset.upload_status==='synced'?'Arquivo clínico privado sincronizado':'Arquivo clínico privado com sincronização ainda não confirmada'].join(' · '),
   '', '', asset.upload_status,target.href,'Fonte: vínculo explícito de arquivo privado M3 por consulta ou internação documentada'));
 }
 const programs=new Map(owned(input.rehabPrograms,uid,pid).map(x=>[x.id!,x]));
 const origins=owned(input.rehabOrigins,uid,pid).filter(x=>x.origin_type==='cirurgia'&&x.origin_id===sid&&programs.has(x.program_id));
 const linkedPrograms=new Set(origins.map(x=>x.program_id));
 const sessions=owned(input.rehabSessions,uid,pid).filter(x=>linkedPrograms.has(x.program_id));
 for(const id of linkedPrograms){
  const program=programs.get(id)!;
  const total=sessions.filter(x=>x.program_id===id&&x.status==='performed').length;
  stages.rehabilitation.push(row('rehabilitation','rehabilitation',id,id,program.title,
   `${total===1?'1 sessão registrada como realizada':`${total} sessões registradas como realizadas`}. Nenhuma recuperação é presumida.`,
   program.start_date||'','',''+program.status,toRehabHref(id),'Vínculo explícito de origem Cirurgia → Reabilitação (M5)'));
 }
 for(const stage of Object.keys(stages) as SurgeryStageA7[])stages[stage]=stageSort(unique(stages[stage]));
 const doctor=input.doctors.find(x=>x.id===surgery.medico_id&&x.user_id===uid);
 const hospital=input.hospitals.find(x=>x.id===surgery.hospital_id&&x.user_id===uid);
 const caveats=[
  'A classificação pré/pós-operatória exige um vínculo explícito com o procedimento, não apenas datas próximas.',
  'Cirurgia registrada como realizada não comprova alta hospitalar, reabilitação concluída nem liberação médica.',
  'Ausência de exame, documento ou retorno nesta visão não comprova ausência no prontuário.',
  'Internação planejada não equivale a admissão. Alta hospitalar registrada não equivale a recuperação cirúrgica.'
 ];
 if(!uniqueLinks.length)caveats.unshift('Nenhuma consulta está vinculada diretamente a esta cirurgia; use os vínculos M4 para organizar a jornada.');
 return {id:sid,procedure:safe(surgery.procedimento,180)||'Cirurgia registrada',date:isoDay(surgery.data),time:validTime(surgery.horario),
  status:safe(surgery.status,60),observations:safe(surgery.observacoes,5000),
  doctor:doctor?.id?{name:safe(doctor.nome,150),href:`/saude/medicos/detalhes?id=${encodeURIComponent(doctor.id)}`}:null,
  hospital:hospital?.id?{name:safe(hospital.nome,150),href:`/saude/hospitais/detalhes?id=${encodeURIComponent(hospital.id)}`}:null,
  stages,counts:{consultations:uniqueLinks.length,exams:new Set([...seenOrders].map(x=>x.slice(x.indexOf(':')+1))).size,treatments:treatments.length,documents:documents.length,rehabilitation:linkedPrograms.size,hospitalizations:hospitalIDs.size,privateAssets:permittedAssets.size,surgicalEvents:surgicalEvents.length,surgicalTeam:surgicalTeam.filter(t=>input.doctors.some(d=>d.id===t.professional_id&&d.user_id===uid)).length},caveats};
}
