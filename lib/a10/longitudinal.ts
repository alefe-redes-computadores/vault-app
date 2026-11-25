/** A10.0/A10.1 — read-only clinical timeline. No inferred diagnosis, causality, procedure or medication act. */
export const A10_AUTHORITIES = [
  'consultas','cirurgias','a1_treatment_phases','hospitalizations_a5','hospitalization_events_a5',
  'surgery_journey_events_a7','surgical_intents_a7m5','rehab_programs_m5','rehab_sessions_m5',
  'rehab_milestones_m5','vaccination_courses_a8','vaccination_events_a8','procedure_events_a9',
  'sensitivity_events_a9','exam_orders','exam_order_items','careflow_events_m2','registros_saude',
  'doseLogs','medicamentos','tratamentos','hospitalization_relations_a5','rehab_origin_links_m5',
  'surgery_evidence_links_a7m5','clinical_asset_links','clinical_assets',
] as const;
export type A10Authority = typeof A10_AUTHORITIES[number];
export type A10Domain = 'consultations'|'surgery'|'treatment'|'hospitalization'|'rehabilitation'|'vaccination'|'procedure'|'sensitivity'|'exams'|'health'|'doses';
export type A10Row = Record<string, unknown>;
export type A10Datasets = Partial<Record<A10Authority, readonly A10Row[]>>;
export interface A10Fact {
  key:string; id:string; authority:A10Authority; domain:A10Domain;
  title:string; detail:string; status:string; origin:string;
  day:string|null; displayedDate:string; dateKind:'factual'|'planned'|'reported'|'registration';
  sortKey:string; source:string; personId:string; userId:string;
  href:string; originHref:string; revision:'current'|'historical'|'void'|'deleted';
  sync:'synced'|'pending'|'unknown'; relationId:string|null; explicitRelations:readonly string[]; relationTargets:readonly {authority:A10Authority;id:string}[];
}
export type A10Projection = {facts:A10Fact[]; totalVisible:number; excludedUnscoped:number; excludedWithoutIdentity:number; omittedSuperseded:number};
export type A10Filter = {domain?:A10Domain|'all';query?:string;from?:string;to?:string;includeHistory?:boolean};
const tidy=(x:unknown,max=220)=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const get=(r:A10Row,k:string)=>tidy(r[k]);
const value=(r:A10Row,k:string)=>r[k];
const q=(x:string)=>encodeURIComponent(x);
const normalize=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function typedRelationsA10(table:A10Authority,r:A10Row):{authority:A10Authority;id:string}[] {
 const edges:readonly [string,A10Authority][]=(
  table==='hospitalization_events_a5'?[['hospitalization_id','hospitalizations_a5']]:
  table==='surgery_journey_events_a7'?[['cirurgia_id','cirurgias']]:
  table==='surgical_intents_a7m5'?[['linked_surgery_id','cirurgias'],['source_consultation_id','consultas']]:
  table==='rehab_milestones_m5'?[['session_id','rehab_sessions_m5']]:
  table==='procedure_events_a9'?[['consultation_id','consultas'],['rehab_session_id','rehab_sessions_m5']]:
  table==='exam_order_items'?[['order_id','exam_orders']]:
  table==='careflow_events_m2'?[['parent_id','careflow_events_m2']]:[]);
 const result=edges.flatMap(([field,authority])=>{
  const id=typeof r[field]==='string'?r[field] as string:'';
  return id&&id.length<=200?[{authority,id}]:[];
 });
 if(table==='sensitivity_events_a9'){
  const id=typeof r.related_id==='string'?r.related_id:'';
  const typ=String(r.related_type||'');
  const known:Record<string,A10Authority>={procedure_event:'procedure_events_a9',vaccination_event:'vaccination_events_a8',medication:'medicamentos'};
  if(id&&id.length<=200&&known[typ])result.push({authority:known[typ],id});
 }
 return result;
}
const dayOf=(value:unknown):string|null=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const d=value.slice(0,10),n=new Date(d+'T12:00:00Z');
 return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===d?d:null;
};
export const civilDayA10=dayOf;
export const dateBR_A10=(v:string|null)=>v?`${v.slice(8,10)}/${v.slice(5,7)}/${v.slice(0,4)}`:'Data não informada';
const firstDay=(r:A10Row,...fields:string[]):string|null=>{
 for(const f of fields){const d=dayOf(value(r,f));if(d)return d;}
 return null;
};
const names=(rows:readonly A10Row[]|undefined,uid:string,pid:string,name:string)=>{
 const map=new Map<string,string>();
 for(const row of rows||[]){
  if(get(row,'user_id')!==uid||get(row,'person_id')!==pid||value(row,'deleted_at'))continue;
  const key=get(row,'id'),text=get(row,name);if(key&&text)map.set(key,text);
 }
 return map;
};
const sourceOf=(r:A10Row)=>{const raw=get(r,'source')||get(r,'origem')||get(r,'reason_source');return ({self_report:'Relato pessoal',self_reported:'Relato pessoal',professional_document:'Documento profissional informado',professional_reported:'Relato profissional informado',verified_import:'Importação identificada',relato_pessoal:'Relato pessoal',orientacao_profissional:'Orientação profissional referida',documento_revisado:'Documento revisado',health_connect:'Health Connect / dispositivo conectado',manual:'Registro manual',scheduled:'Programação informada',prescribed:'Prescrição referida',patient_reported:'Relato pessoal'} as Record<string,string>)[raw]||'Fonte não especificada';};
/** Data civil de compromisso com fuso explícito; não exibir dia UTC como se fosse local. */
export function localScheduledDayA10(instant:unknown,timeZone:unknown):string|null {
 if(typeof instant!=='string'||typeof timeZone!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(instant))return null;
 if(!/(Z|[+-]\d{2}:\d{2})$/.test(instant)||!Number.isFinite(Date.parse(instant)))return null;
 try {const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
 const map=Object.fromEntries(parts.filter(x=>['year','month','day'].includes(x.type)).map(x=>[x.type,x.value]));
 const day=`${map.year}-${map.month}-${map.day}`;return civilDayA10(day);}
 catch{return null;}
}
const small=(text:string)=>text.length>240?text.slice(0,240)+'…':text;
const revisionRef:Partial<Record<A10Authority,string>>={
 'surgery_journey_events_a7':'corrects_event_id','surgical_intents_a7m5':'corrects_intent_id',
 'hospitalization_events_a5':'corrects_event_id','vaccination_events_a8':'corrects_event_id',
 'procedure_events_a9':'corrects_event_id','sensitivity_events_a9':'corrects_event_id',
};
const metadata:Partial<Record<A10Authority,{domain:A10Domain;route:string}>>={
 consultas:{domain:'consultations',route:'/saude/consultas'},
 cirurgias:{domain:'surgery',route:'/saude/cirurgias'},
 a1_treatment_phases:{domain:'treatment',route:'/saude/tratamentos'},
 hospitalizations_a5:{domain:'hospitalization',route:'/saude/internacoes'},
 hospitalization_events_a5:{domain:'hospitalization',route:'/saude/internacoes'},
 surgery_journey_events_a7:{domain:'surgery',route:'/saude/cirurgias'},
 surgical_intents_a7m5:{domain:'surgery',route:'/saude/cirurgias/encaminhamentos'},
 rehab_sessions_m5:{domain:'rehabilitation',route:'/saude/reabilitacao'},
 rehab_milestones_m5:{domain:'rehabilitation',route:'/saude/reabilitacao'},
 vaccination_events_a8:{domain:'vaccination',route:'/saude/vacinas'},
 procedure_events_a9:{domain:'procedure',route:'/saude/procedimentos'},
 sensitivity_events_a9:{domain:'sensitivity',route:'/saude/reacoes'},
 exam_orders:{domain:'exams',route:'/saude/exames'},
 exam_order_items:{domain:'exams',route:'/saude/exames'},
 careflow_events_m2:{domain:'health',route:'/saude/careflow'},
 registros_saude:{domain:'health',route:'/saude/registros'},
 doseLogs:{domain:'doses',route:'/hoje'},
};
const labels:Record<A10Domain,string>={
 consultations:'Consultas',surgery:'Jornada cirúrgica',treatment:'Tratamentos',
 hospitalization:'Internações',rehabilitation:'Reabilitação',vaccination:'Vacinação',
 procedure:'Procedimentos',sensitivity:'Alergias e relatos',exams:'Exames',
 health:'Registros de saúde',doses:'Doses registradas',
};
export const A10_DOMAIN_LABELS=labels;
function describe(table:A10Authority,r:A10Row,ctx:{meds:Map<string,string>;vaccines:Map<string,string>;rehab:Map<string,string>;timeZone:string}):{
 title:string;detail:string;status:string;date:string|null;planned:boolean;origin:string;relationId:string|null;href?:string;
}|null{
 const id=get(r,'id'),status=get(r,'status'),note=get(r,'note')||get(r,'observacoes');
 if(table==='consultas')return {title:get(r,'especialidade')||'Consulta registrada',detail:get(r,'motivo')||get(r,'medico')||'',status:status||'Sem estado confirmado',date:firstDay(r,'data'),planned:status==='agendada',origin:'Cadastro de consulta',relationId:get(r,'medico_id')||null,href:'/saude/consultas/detalhes?id='+q(id)};
 if(table==='cirurgias')return {title:get(r,'procedimento')||'Cirurgia cadastrada',detail:note,status:status||'Estado não informado',date:firstDay(r,'data'),planned:status==='agendada',origin:'Cadastro cirúrgico',relationId:get(r,'medico_id')||null,href:'/saude/cirurgias/detalhes?id='+q(id)};
 if(table==='a1_treatment_phases')return {title:get(r,'titulo')||'Fase de tratamento',detail:get(r,'observacoes'),status:({'inicio':'Início informado','ajuste':'Ajuste informado','pausa':'Pausa informada','retomada':'Retomada informada','conclusao':'Conclusão informada'} as Record<string,string>)[get(r,'tipo')]||'Fase registrada',date:firstDay(r,'data_efetiva'),planned:false,origin:'Fase A1/A4',relationId:get(r,'tratamento_id')||null,href:'/saude/tratamentos/detalhes?id='+q(get(r,'tratamento_id'))};
 if(table==='hospitalizations_a5')return {title:get(r,'reason')||'Episódio de internação',detail:get(r,'facility_name_snapshot')||note,status:({'planned':'Planejada','admitted':'Admissão informada','on_leave':'Ausência informada','discharged':'Saída informada','cancelled':'Cancelada'} as Record<string,string>)[status]||'Episódio cadastrado',date:status==='discharged'?firstDay(r,'discharged_on','admitted_on'):status==='planned'?firstDay(r,'planned_admission_on'):firstDay(r,'admitted_on','planned_admission_on'),planned:status==='planned',origin:'Internação A5',relationId:get(r,'hospital_id')||null};
 if(table==='hospitalization_events_a5')return {title:get(r,'summary')||'Evolução de internação',detail:get(r,'kind')||'',status:'Fato registrado',date:firstDay(r,'occurred_on')||localScheduledDayA10(value(r,'occurred_at'),get(r,'timezone_name')||ctx.timeZone),planned:false,origin:'Evento de internação A5',relationId:get(r,'hospitalization_id')||null};
 if(table==='surgery_journey_events_a7')return {title:get(r,'title')||'Fato da jornada cirúrgica',detail:get(r,'description'),status:get(r,'stage')==='pre'?'Etapa pré-operatória':get(r,'stage')==='procedure'?'Registro de procedimento':get(r,'stage')==='post'?'Pós-operatório informado':'Retorno informado',date:firstDay(r,'occurred_on'),planned:false,origin:'Evento cirúrgico A7',relationId:get(r,'cirurgia_id')||null};
 if(table==='surgical_intents_a7m5')return {title:get(r,'title')||'Encaminhamento informado',detail:note,status:({'requested':'Encaminhamento informado','under_review':'Em avaliação informada','scheduled':'Vinculado a cirurgia cadastrada','withdrawn':'Encerrado'} as Record<string,string>)[status]||'Intenção documentada',date:localScheduledDayA10(value(r,'created_at'),ctx.timeZone),planned:false,origin:'Intenção A7/M5 — data do cadastro; não comprova cirurgia',relationId:get(r,'linked_surgery_id')||null};
 if(table==='rehab_sessions_m5')return {title:ctx.rehab.get(get(r,'program_id'))||'Sessão de reabilitação',detail:get(r,'notes')||'',status:({'scheduled':'Agendada','confirmed':'Confirmada — informada','performed':'Realizada — informada','cancelled':'Cancelada','missed':'Falta registrada'} as Record<string,string>)[status]||'Sessão cadastrada',date:localScheduledDayA10(value(r,'scheduled_at'),value(r,'timezone')),planned:status==='scheduled'||status==='confirmed',origin:'Sessão M5 — data de agenda; realização/cancelamento/falta são estados declarados, não datas efetivas comprovadas',relationId:get(r,'program_id')||null,href:'/saude/reabilitacao/detalhes?id='+q(get(r,'program_id'))};
 if(table==='rehab_milestones_m5')return {title:({'reassessment':'Reavaliação registrada','reported_progress':'Evolução relatada','clinical_clearance':'Liberação documentada','exam_referral':'Pedido de exame informado','functional_discharge':'Alta funcional relatada'} as Record<string,string>)[get(r,'kind')]||'Marco de reabilitação',detail:get(r,'notes'),status:'Registro informado, sem inferência de melhora',date:localScheduledDayA10(value(r,'recorded_at'),ctx.timeZone),planned:false,origin:'Marco M5',relationId:get(r,'program_id')||null,href:'/saude/reabilitacao/detalhes?id='+q(get(r,'program_id'))};
 if(table==='vaccination_events_a8'){
  const kind=get(r,'effective_kind');return {title:ctx.vaccines.get(get(r,'course_id'))||'Vacina não identificada',detail:kind==='plan'?'Planejamento declarado':get(r,'note')||'Registro de aplicação declarado',status:kind==='plan'?'Planejada':kind==='dose'?'Aplicação declarada':'Retificação documental',date:kind==='plan'?firstDay(r,'planned_on'):firstDay(r,'administered_on'),planned:kind==='plan',origin:'Vacinação A8',relationId:get(r,'course_id')||null,href:'/saude/vacinas?registro='+q(id)};
 }
 if(table==='procedure_events_a9'){const state=get(r,'effective_status');return {title:get(r,'title')||'Procedimento informado',detail:get(r,'note'),status:({'planned':'Planejado','performed':'Realizado — informado','not_performed':'Não realizado — informado','void':'Cancelamento documental'} as Record<string,string>)[state]||'Procedimento cadastrado',date:state==='planned'?firstDay(r,'planned_on'):firstDay(r,'performed_on'),planned:state==='planned',origin:'Procedimento A9',relationId:get(r,'consultation_id')||get(r,'rehab_session_id')||null,href:'/saude/procedimentos?id='+q(id)};}
 if(table==='sensitivity_events_a9')return {title:get(r,'agent_label')||'Agente não informado',detail:get(r,'note')||'Relação temporal não comprova causa.',status:({'allergy':'Alergia declarada','intolerance':'Intolerância declarada','reaction':'Reação relatada'} as Record<string,string>)[get(r,'sensitivity_type')]||'Relato de sensibilidade',date:firstDay(r,'reported_on'),planned:false,origin:'Relato A9 — causalidade não verificada',relationId:get(r,'related_id')||null,href:'/saude/reacoes?id='+q(id)};
 if(table==='exam_orders')return {title:get(r,'title')||'Pedido de exames',detail:get(r,'note'),status:get(r,'order_kind')==='medical_request'?'Pedido médico documentado':'Pedido registrado',date:firstDay(r,'requested_on'),planned:false,origin:'Exames M1',relationId:get(r,'doctor_id')||null};
 if(table==='exam_order_items')return {title:get(r,'name')||'Item de exame',detail:get(r,'result_summary')||get(r,'note'),status:({'pending':'Pendente','collected':'Coleta registrada','result_received':'Resultado recebido — informado','cancelled':'Cancelado'} as Record<string,string>)[status]||'Item cadastrado',date:status==='result_received'?firstDay(r,'result_received_at')||localScheduledDayA10(value(r,'result_received_at'),ctx.timeZone):status==='collected'?firstDay(r,'collected_at')||localScheduledDayA10(value(r,'collected_at'),ctx.timeZone):null,planned:false,origin:'Item M1',relationId:get(r,'order_id')||null};
 if(table==='careflow_events_m2'){
  const kind=get(r,'kind'),payload=value(r,'payload');const obj=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload as A10Row:{};
  if(kind==='monitor_reading'||kind==='monitor_note')return null; // Links, not independent factual readings.
  const title=({'exam_order':'Pedido de exames informado','exam_item':'Item de exame','exam_status':'Situação de exame','exam_result':'Resultado informado','monitor_plan':'Plano de acompanhamento de pressão'} as Record<string,string>)[kind];
  if(!title)return null;
  return {title,detail:get(obj,'title')||get(obj,'name')||get(obj,'result')||'',status:kind==='monitor_plan'?'Plano informado — não comprova medição':'Registro informado',date:kind==='monitor_plan'?firstDay(obj,'start'):firstDay(obj,'date'),planned:kind==='monitor_plan',origin:'CareFlow M2',relationId:get(r,'parent_id')||get(r,'related_id')||null,href:kind==='monitor_plan'?'/saude/careflow/pressao':'/saude/careflow/exames'};
 }
 if(table==='registros_saude')return {title:get(r,'nome')||get(r,'tipo')||'Registro de saúde',detail:get(r,'valor_medicao')||get(r,'motivo')||'',status:get(r,'categoria')||'Relato registrado',date:firstDay(r,'data'),planned:false,origin:'Registro de saúde canônico',relationId:null,href:'/saude/careflow/fato?tipo=registro&id='+q(id)};
 if(table==='doseLogs'){
  const med=ctx.meds.get(get(r,'medicamento_id'))||'Medicamento não identificado nesta pessoa';
  const rawKind=get(r,'dose_kind')||get(r,'doseKind')||get(r,'tipo_dose');
  const plannedKind=['planned','scheduled','prevista','planejada'].includes(rawKind);
  const isSOS=['sos','extra','avulsa'].includes(rawKind);
  const hadTaken=Boolean(value(r,'tomado_em')),hadIgnored=Boolean(value(r,'ignorado_em'));
  const contradicted=plannedKind&&(hadTaken||hadIgnored);
  const taken=hadTaken&&!plannedKind,ignored=hadIgnored&&!plannedKind;
  const recordedClock=get(r,'horario')||get(r,'hora');
  const clock=/^([01]\d|2[0-3]):[0-5]\d$/.test(recordedClock)?' · Horário informado: '+recordedClock:'';
  const effectiveStatus=contradicted?'Registro contraditório — conferir origem':taken?'Tomada registrada':ignored?'Ignorada — informada':plannedKind?'Dose prevista — tomada não confirmada':isSOS?'Registro SOS/extra sem tomada confirmada':'Registro sem confirmação de tomada';
  const eventOrigin=contradicted?'Registro de dose — estado contraditório':taken?'Registro de dose — tomada informada':ignored?'Registro de dose — ignorada informada':plannedKind?'Registro de dose — previsão documentada':'Registro de dose — sem confirmação de tomada';
  return {title:med,detail:(get(r,'motivo')||'')+clock,status:effectiveStatus,date:firstDay(r,'data'),planned:plannedKind&&!taken&&!ignored,origin:eventOrigin,relationId:get(r,'medicamento_id')||null,href:'/saude/careflow/fato?tipo=dose&id='+q(id)};
 }
 return null;
}
/** Pure, deterministic, profile-scoped. Never derive one clinical fact from another. */
export function projectLongitudinalA10(data:A10Datasets,userId:string,personId:string,includeHistory=false,timeZone='UTC'):A10Projection{
 if(!userId||!personId)return {facts:[],totalVisible:0,excludedUnscoped:0,excludedWithoutIdentity:0,omittedSuperseded:0};
 const input=(key:A10Authority)=>data[key]||[];
 const ctx={meds:names(input('medicamentos'),userId,personId,'nome'),vaccines:names(input('vaccination_courses_a8'),userId,personId,'vaccine_name'),rehab:names(input('rehab_programs_m5'),userId,personId,'title'),timeZone};
 for(const med of input('medicamentos')){if(get(med,'user_id')===userId&&get(med,'person_id')===personId&&!med.deleted_at){const id=get(med,'id'),dose=get(med,'dosagem');if(id&&dose&&ctx.meds.has(id))ctx.meds.set(id,`${ctx.meds.get(id)} · ${dose}`);}}
 const facts:A10Fact[]=[];let excludedUnscoped=0,excludedWithoutIdentity=0,omittedSuperseded=0;
 const seen=new Set<string>();
 for(const table of A10_AUTHORITIES){
  const meta=metadata[table];if(!meta)continue;
  const scoped=input(table).filter(row=>{
   if(get(row,'user_id')!==userId||get(row,'person_id')!==personId){excludedUnscoped++;return false;}
   return true;
  });
  const replacedId=new Set(scoped.filter(r=>!r.deleted_at).map(r=>get(r,revisionRef[table]||'__none')).filter(Boolean));
  for(const row of scoped){
   const id=get(row,'id');if(!id){excludedWithoutIdentity++;continue;}
   const key=table+':'+id;if(seen.has(key))continue;seen.add(key);
   const deleted=Boolean(value(row,'deleted_at'));
   const isVoid=get(row,'kind')==='void'||(table==='procedure_events_a9'&&get(row,'effective_status')==='void')||(table==='vaccination_events_a8'&&get(row,'effective_kind')==='void');
   const historical=replacedId.has(id);
   if(!includeHistory&&(deleted||isVoid||historical)){if(historical)omittedSuperseded++;continue;}
   const item=describe(table,row,ctx);if(!item)continue;
   const created=firstDay(row,'created_at')||localScheduledDayA10(value(row,'created_at'),timeZone);const date=item.date;
   const datum=date||created;
   const revision:A10Fact['revision']=deleted?'deleted':isVoid?'void':historical?'historical':'current';
   facts.push({key,id,authority:table,domain:meta.domain,title:small(item.title),detail:small(item.detail),status:item.status,origin:item.origin,
    day:date,displayedDate:datum?dateBR_A10(datum):'Data não informada',dateKind:date?(item.planned?'planned':table==='sensitivity_events_a9'?'reported':table==='surgical_intents_a7m5'?'registration':table==='rehab_sessions_m5'?'reported':'factual'):'registration',
    sortKey:datum||'0000-00-00',source:sourceOf(row),personId,userId,
    href:`/saude/linha-clinica/detalhe?origem=${encodeURIComponent(table)}&id=${q(id)}`,originHref:item.href||meta.route,revision,
    sync:value(row,'synced')===true?'synced':value(row,'synced')===false?'pending':'unknown',relationId:item.relationId,explicitRelations:typedRelationsA10(table,row).map(x=>x.id),relationTargets:typedRelationsA10(table,row)});
  }
 }
 facts.sort((a,b)=>b.sortKey.localeCompare(a.sortKey)||a.authority.localeCompare(b.authority)||a.id.localeCompare(b.id));
 return {facts,totalVisible:facts.length,excludedUnscoped,excludedWithoutIdentity,omittedSuperseded};
}
export function filterLongitudinalA10(facts:readonly A10Fact[],f:A10Filter):A10Fact[]{
 const query=normalize((f.query||'').trim());
 return facts.filter(x=>(!f.domain||f.domain==='all'||x.domain===f.domain)&&(!query||normalize(x.title+' '+x.detail+' '+x.status+' '+x.origin+' '+x.source+' '+x.id+' '+x.explicitRelations.join(' ')).includes(query))&&(!f.from||x.sortKey>=f.from)&&(!f.to||x.sortKey<=f.to));
}
