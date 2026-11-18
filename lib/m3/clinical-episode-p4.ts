/** CI360 P6 P4-A — episodio clinico factual e leitura somente.
 * Nenhum campo escrito, resultado, dose, adesao ou nexo causal inferido.
 * ID explicito da consulta + titular + pessoa, com descendencia CareFlow comprovada.
 */
import type { HealthInsightContext } from '@/lib/health-insights';
import type { Consulta, RegistroSaude } from '@/lib/types';
import type { CareFlowEventM2 } from '@/lib/careflow-m2/domain';
import { validClinicalDay } from '@/lib/clinical-report-360';
import type { MedicalDossierP3, MedicalRowP3, MedicalModeP3 } from '@/lib/m3/medical-dossier-p3';

export type EpisodeActionP4 = { id:string; label:string; explanation:string; href:string; sourceId:string };
export type EpisodeSnapshotP4 = {
  consultation:Consulta; rows:MedicalRowP3[]; report:MedicalDossierP3;
  stats:{symptoms:number; examOrders:number; examItems:number; results:number; linkedMedications:number};
  nextAction:EpisodeActionP4|null; gaps:string[];
};
const text=(v:unknown,max=500):string=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const day=(v:unknown):string=>{const s=text(v,30).slice(0,10);return validClinicalDay(s)?s:'';};
const own=(r:{user_id?:string;person_id?:string},userId:string,personId:string)=>r.user_id===userId&&r.person_id===personId;
const dateOf=(e:CareFlowEventM2):string=>day(e.payload.date)||day(e.payload.start)||day(e.created_at);
const str=(v:unknown)=>text(v,180);
const href=(base:string)=>base;
export type EpisodeInputP4={
  context:HealthInsightContext; careflow:readonly CareFlowEventM2[];
  userId:string; personId:string; consultationId:string; personName:string;
  today:string; mode:MedicalModeP3; generatedAt?:string;
};
export function buildClinicalEpisodeP4(input:EpisodeInputP4):EpisodeSnapshotP4{
  const {context,userId,personId,consultationId,today,mode}=input;
  if(!userId||!personId||context.userId!==userId||context.personId!==personId)throw Error('Conta ou pessoa divergente: acesso bloqueado.');
  if(!validClinicalDay(today)||!['summary','detailed'].includes(mode))throw Error('Período ou formato inválido.');
  const consultation=context.consultas.find(x=>x.id===consultationId&&own(x,userId,personId));
  if(!consultation)throw Error('Consulta não encontrada nesta pessoa.');
  const start=day(consultation.data);
  if(!start||start>today)throw Error('A consulta está no futuro ou a data registrada é inválida.');
  const within=(d:string)=>Boolean(d)&&d>=start&&d<=today;
  const events=input.careflow.filter(e=>e.id&&own(e,userId,personId));
  const records=new Map(context.registrosSaude.filter(r=>r.id&&own(r,userId,personId)).map(r=>[r.id!,r] as const));
  const meds=new Map(context.medicamentos.filter(m=>m.id&&own(m,userId,personId)).map(m=>[m.id!,m] as const));
  const directMedicationIds=new Set((consultation.medicamento_ids||[]).filter(id=>meds.has(id)));
  const eventById=new Map(events.map(e=>[e.id,e] as const));
  // Semente: exam_order relacionado diretamente a consulta, ou monitor_note cujo
  // parent_id seja a consulta. Os filhos SOMENTE entram por id de pai ja confirmado.
  const includedIds=new Set<string>();
  for(const e of events)if((e.kind==='exam_order'&&e.related_id===consultation.id)||
    (e.kind==='monitor_note'&&e.parent_id===consultation.id&&e.related_id&&records.has(e.related_id)))includedIds.add(e.id);
  const children=new Map<string,CareFlowEventM2[]>();
  for(const e of events)if(e.parent_id){const list=children.get(e.parent_id)||[];list.push(e);children.set(e.parent_id,list);}
  const queue=[...includedIds];
  for(let i=0;i<queue.length;i++){
    const parent=eventById.get(queue[i]);
    if(!parent||parent.kind==='monitor_note')continue;
    for(const child of children.get(parent.id)||[]){
      const allowed=(parent.kind==='exam_order'&&child.kind==='exam_item')||
        (parent.kind==='exam_item'&&(child.kind==='exam_status'||child.kind==='exam_result'));
      if(allowed&&!includedIds.has(child.id)){includedIds.add(child.id);queue.push(child.id);}
    }
  }
  const selected=events.filter(e=>includedIds.has(e.id)&&within(dateOf(e)));
  const rowList:MedicalRowP3[]=[];const seenKeys=new Set<string>();
  const add=(r:Omit<MedicalRowP3,'key'>)=>{
    if(!r.sourceId||!within(r.date))return;
    const key=`${r.section}:${r.source}:${r.sourceId}`;if(seenKeys.has(key))return;seenKeys.add(key);
    rowList.push({...r,key,title:text(r.title,160)||'Registro',detail:text(r.detail,1200),relations:[...new Set(r.relations)].slice(0,20)});
  };
  const consultationHref=`/saude/consultas/detalhes?id=${encodeURIComponent(consultation.id!)}`;
  add({section:'consultations',date:start,time:text(consultation.horario,5)||null,source:'consultation',sourceId:consultation.id!,
    title:`Consulta · ${text(consultation.especialidade,100)||'Atendimento'}`,provenance:'declarado',registeredAt:consultation.created_at||null,
    detail:[`Situação cadastrada: ${consultation.status}`,
      consultation.medico?`Profissional cadastrado: ${text(consultation.medico,110)}`:'',
      consultation.percepcao_paciente?`Relato da pessoa: ${text(consultation.percepcao_paciente,360)}`:'',
      consultation.orientacao_profissional?`Orientação profissional relatada: ${text(consultation.orientacao_profissional,360)}`:'',
      consultation.proximos_passos?`Próximos passos informados: ${text(consultation.proximos_passos,360)}`:''].filter(Boolean).join(' · '),
    relations:[],href:consultationHref});
  let symptomCount=0,examOrders=0,examItems=0,results=0;const seenSymptoms=new Set<string>();
  for(const e of selected){
    const d=dateOf(e);const declaredDay=day(e.payload.date)||day(e.payload.start);const evKind=e.kind;
    if(evKind==='monitor_note'&&e.related_id){
      const rec=records.get(e.related_id);
      if(!rec||rec.categoria!=='sintoma'||!within(day(rec.data))||seenSymptoms.has(rec.id!))continue;
      seenSymptoms.add(rec.id!);symptomCount++;
      add({section:'symptoms',date:day(rec.data),time:text(rec.horario,5)||null,
        title:text(rec.nome,120)||'Sintoma informado',detail:[
          'Relato da pessoa; não representa diagnóstico.',
          typeof rec.intensidade==='number'&&Number.isFinite(rec.intensidade)?`Intensidade informada: ${rec.intensidade}/10`:'',
          rec.observacoes?text(rec.observacoes,600):'',
          'Relacionado explicitamente à consulta no CareFlow.'
        ].filter(Boolean).join(' · '),source:'health_record',sourceId:rec.id!,registeredAt:rec.created_at||null,
        provenance:'declarado',relations:[`Consulta: ${start}`],href:'/saude/careflow/sintomas'});
      continue;
    }
    if(evKind==='exam_order')examOrders++;
    if(evKind==='exam_item')examItems++;
    if(evKind==='exam_result')results++;
    if(!evKind.startsWith('exam_'))continue;
    const title=evKind==='exam_order'?text(e.payload.title)||'Pedido de exames':
      evKind==='exam_item'?text(e.payload.name)||'Item solicitado':
      evKind==='exam_result'?'Resultado declarado':'Situação informada';
    const parent=eventById.get(e.parent_id||'');
    add({section:'careflow',date:d,time:null,title,source:'careflow_'+evKind,sourceId:e.id,registeredAt:e.created_at,
      provenance:'declarado',detail:[declaredDay?'Data clínica informada':'Data do cadastro; data clínica do evento não informada',evKind==='exam_item'?'Solicitado; coleta/resultado não presumidos.':'',
        evKind==='exam_result'?`Valor informado: ${text(e.payload.result,350)||'não informado'}${text(e.payload.unit,70)?' · Unidade: '+text(e.payload.unit,70):''}`:'',
        evKind==='exam_status'?`Estado registrado: ${text(e.payload.state)||'não informado'}`:'',
        evKind==='exam_order'?'Pedido vinculado explicitamente à consulta.':''].filter(Boolean).join(' · '),
      relations:parent?[`Origem: ${text(parent.payload.title)||text(parent.payload.name)||'Evento relacionado'}`]:[`Consulta: ${start}`],
      href:'/saude/careflow/exames'});
  }
  for(const medId of directMedicationIds){
    const med=meds.get(medId)!;
    add({section:'medications',date:today,time:null,title:text(med.nome,130)||'Medicamento',source:'medication_current_snapshot',sourceId:medId,
      registeredAt:null,provenance:'declarado',detail:
      `Cadastro atual, não comprovante de administração ou prescrição na data da consulta. ${text(med.dosagem,60)||'Dose não informada'} · ${text(med.tipo_uso,45)||'Uso não informado'}.`,
      relations:['Vínculo direto com a consulta por ID'],href:`/saude/medicamentos/detalhes?id=${encodeURIComponent(medId)}`});
  }
  const sorted=rowList.sort((a,b)=>b.date.localeCompare(a.date)||(b.time||'').localeCompare(a.time||'')||a.key.localeCompare(b.key));
  const count=sorted.length;const rows=mode==='summary'?sorted.slice(0,30):sorted;
  const gaps:string[]=[];
  if(!examOrders)gaps.push('Não há pedido de exames explicitamente vinculado a esta consulta no CareFlow. Isso não prova que não houve pedido.');
  if(!symptomCount)gaps.push('Nenhum relato de sintoma está vinculado por ID a esta consulta; isso não prova ausência de sintomas.');
  if(!directMedicationIds.size)gaps.push('Não há medicamentos vinculados diretamente à consulta. Isso não equivale a ausência de prescrição.');
  if(consultation.status==='agendada')gaps.push('A consulta segue cadastrada como agendada; confirme o estado no registro original antes de compartilhar.');
  const nextAction=selectEpisodeActionP4({consultation,events:selected,records,userId,personId,today});
  const report:MedicalDossierP3={version:3,mode,personName:text(input.personName,150)||'Pessoa ativa',start,end:today,
    sections:['consultations','careflow','symptoms','medications'],rows,omittedBySummary:Math.max(0,count-rows.length),availableCount:count,
    generatedAt:input.generatedAt||new Date().toISOString(),limitations:[
      `Escopo: episódio da consulta ${consultation.id}. Somente relações explicitamente confirmadas por ID.`,
      'Dados declarados não são diagnóstico, prescrição, conclusão de exame ou confirmação de dose.',
      'Medicamentos vinculados são fotografia do cadastro atual; não representam sua situação no passado.',
      'Registros sem vínculo explícito não entram automaticamente neste episódio.',...gaps]};
  return {consultation,rows,report,stats:{symptoms:symptomCount,examOrders,examItems,results,linkedMedications:directMedicationIds.size},nextAction,gaps};
}

export function selectEpisodeActionP4(input:{consultation:Consulta;events:readonly CareFlowEventM2[];
  records:ReadonlyMap<string,RegistroSaude>;userId:string;personId:string;today:string}):EpisodeActionP4|null{
  const {consultation,events,records,userId,personId,today}=input;
  if(!consultation.id||!own(consultation,userId,personId)||!validClinicalDay(today)||!validClinicalDay(consultation.data)||
     consultation.data>today)return null;
  const daysSince=(Date.parse(today+'T12:00:00Z')-Date.parse(consultation.data+'T12:00:00Z'))/86400000;
  if(daysSince>30)return null; // episodio antigo continua consultavel, sem pergunta descontextualizada
  // Um check-in sugerido somente se ja existe relato REAL, vinculado a consulta,
  // com data clinica na janela recente. Nao cria evento por si so.
  const linked=events.filter(e=>e.kind==='monitor_note'&&e.parent_id===consultation.id&&e.related_id)
    .map(e=>records.get(e.related_id!)).filter((r):r is RegistroSaude=>Boolean(r&&r.categoria==='sintoma'&&own(r,userId,personId)&&validClinicalDay(r.data)&&r.data>=consultation.data&&r.data<=today))
    .sort((a,b)=>b.data.localeCompare(a.data)||b.horario.localeCompare(a.horario));
  const last=linked[0];
  if(last){
    return {id:`symptom:${consultation.id}:${last.id}`,sourceId:last.id!,label:'Como evoluiu o sintoma registrado?',
      explanation:`Relato “${text(last.nome,70)}” vinculado a esta consulta em ${last.data}. Responder é opcional; não significa piora.`,
      href:'/saude/careflow/sintomas'};
  }
  if(events.some(e=>e.kind==='exam_order'&&e.related_id===consultation.id))return {
    id:`exam:${consultation.id}`,sourceId:consultation.id,label:'Conferir o andamento dos exames',
    explanation:'Existe um pedido explicitamente vinculado a esta consulta. Ausência de resultado no VAULT não prova atraso.',
    href:'/saude/careflow/exames'};
  if(consultation.proximos_passos?.trim())return {id:`next:${consultation.id}`,sourceId:consultation.id,
    label:'Revisar os próximos passos registrados',explanation:'A consulta contém orientações declaradas. Confirme quais já foram realizadas.',
    href:`/saude/consultas/detalhes?id=${encodeURIComponent(consultation.id)}`};
  return null;
}
