/** VAULT CI360 M3 P3 — projeto de leitura para o Modo Médico.
 * Não escreve estado clínico, não infere dose tomada, resultado, diagnóstico ou estoque.
 * Apenas relações por IDs existentes e escopo proprietário+pessoa COMPROVADO.
 */
import { buildClinicalReport360, validClinicalDay, type Report360Section } from '@/lib/clinical-report-360';
import type { HealthInsightContext } from '@/lib/health-insights';
import type { CareFlowEventM2 } from '@/lib/careflow-m2/domain';
import type { BrainV5Alert } from '@/lib/health-intelligence/brain-v5';
import type { A4ClinicalFact } from '@/lib/treatment-a4/clinical-bridge';
import { rehabFactsM5, localDayRehabM5 } from '@/lib/rehab-m5/projection';
import type { RehabProgramM5, RehabSessionM5, RehabMilestoneM5, RehabOriginM5 } from '@/lib/rehab-m5/types';
import type { A7Event, A7Team } from '@/lib/surgery-a7/types';
import { currentVaccinationEventsA8 } from '@/lib/vaccination-a8/types';
import type {A8Course,A8Event} from '@/lib/vaccination-a8/types';
import {activeFactsA9,A9_PROCEDURE_LABEL,A9_SENSITIVITY_LABEL} from '@/lib/clinical-a9/types';
import type {A9Procedure,A9Sensitivity} from '@/lib/clinical-a9/types';
import type {A10Fact} from '@/lib/a10/longitudinal';
/** Guardian4 FIX1: adaptador PURO no próprio dossiê.
 * Os contratos M3 P3/P6 executam esta fonte em VM e aceitam somente as autoridades
 * clínicas preexistentes. Não adicionar import de execução aqui, nem modificar os gates.
 * Esta é apresentação, não um writer; 'source', 'sourceId' e IDs ficam canônicos.
 */
const medicalUuidG4=/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
function humanMedicalRelationG4(value:string):string {
 const content=String(value||'').trim();
 if(!content)return '';
 if(/^Identificador relacionado\s*:/i.test(content))return 'Vínculo referenciado; descrição indisponível';
 if(medicalUuidG4.test(content))return /^Consulta vinculada por ID\s*:/i.test(content)
  ? 'Consulta vinculada por identificador; nome indisponível'
  : 'Vínculo por identificador; descrição indisponível';
 return content;
}
/** Resolver somente vínculo authority+id com titularidade idêntica e fato vigente. */
function verifiedMedicalRelationsA10G4(f:A10Fact,all:readonly A10Fact[]):string[] {
 const index=new Map(all.filter(x=>x.userId===f.userId&&x.personId===f.personId&&x.revision==='current')
  .map(x=>[x.key,x] as const));
 const names:string[]=[];const seen=new Set<string>();
 for(const rel of f.relationTargets){
  const key=`${rel.authority}:${rel.id}`;
  if(!rel.id||key===f.key||seen.has(key))continue;
  seen.add(key);
  const target=index.get(key);
  if(!target)continue;
  const title=String(target.title||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,160);
  if(title)names.push(`Registro relacionado: ${title}`);
 }
 return names.slice(0,25);
}

export type MedicalSectionP3 = Report360Section | 'careflow' | 'surgeries' | 'exams' | 'withdrawals' | 'prescriptions' | 'treatments' | 'rehabilitation' | 'vaccinations' | 'procedures_a9' | 'sensitivities_a9' | 'hospitalizations';
export type MedicalModeP3 = 'summary' | 'detailed';
export type MedicalProvenanceP3 = 'registrado' | 'declarado' | 'motor';
export type MedicalRowP3 = {
  key: string; section: MedicalSectionP3 | 'brain'; date: string; time: string | null;
  title: string; detail: string; provenance: MedicalProvenanceP3;
  source: string; sourceId: string; registeredAt: string | null;
  relations: string[]; href: string | null;
};
export type MedicalDossierP3 = {
  version: 3; mode: MedicalModeP3; personName: string;
  start: string; end: string; sections: MedicalSectionP3[];
  rows: MedicalRowP3[]; omittedBySummary: number;
  availableCount: number; generatedAt: string;
  episode?: {consultationId:string; date:string; title:string};
  limitations: string[];
};
export const MEDICAL_SECTIONS_P3: readonly {id:MedicalSectionP3;label:string;description:string}[] = [
  {id:'consultations',label:'Consultas',description:'Status, profissional e vínculos existentes'},
  {id:'careflow',label:'CareFlow e pedidos',description:'Pedido, itens, status, resultado e monitoramento'},
  {id:'medications',label:'Medicamentos',description:'Fotografia atual do cadastro, não receita histórica'},
  {id:'doses',label:'Doses documentadas',description:'Tomadas e ignoradas explicitamente'},
  {id:'symptoms',label:'Sintomas e humor',description:'Relatos, intensidade e data do fato'},
  {id:'measurements',label:'Medições',description:'Unidade e fonte conforme registro'},
  {id:'exams',label:'Exames avulsos',description:'Agendas e registros, sem presumir resultado'},
  {id:'surgeries',label:'Cirurgias',description:'Eventos e status registrados'},
  {id:'withdrawals',label:'Retiradas',description:'Conclusão e ciclo sem recalcular estoque'},
  {id:'prescriptions',label:'Receitas e aquisições',description:'Data da receita versus data da aquisição'},
  {id:'treatments',label:'Tratamentos',description:'Fases versionadas e cadastro atual, sem inferências'},
  {id:'rehabilitation',label:'Reabilitação',description:'Ciclos, sessões e marcos documentados'},
  {id:'hospitalizations',label:'Internações',description:'Episódios, admissões e eventos A5 com fonte'},
  {id:'vaccinations',label:'Vacinação',description:'Aplicações declaradas, planejamento e fontes documentadas'},
  {id:'procedures_a9',label:'Procedimentos não cirúrgicos',description:'Planos, realizações e retificações informadas'},
  {id:'sensitivities_a9',label:'Alergias e reações declaradas',description:'Origem, intensidade e incerteza sem diagnóstico automático'},
  {id:'documents',label:'Documentos',description:'Somente títulos e metadados permitidos'},
];
const ALLOWED = new Set<MedicalSectionP3>(MEDICAL_SECTIONS_P3.map(s=>s.id));
const BASE = new Set<MedicalSectionP3>(['medications','doses','symptoms','measurements','consultations','documents']);
const safe = (v:unknown,max=700):string => typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,max):'';
const date = (v:unknown):string => {const s=safe(v,30).slice(0,10);return validClinicalDay(s)?s:'';};
const clock = (v:unknown):string|null => typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:null;
const keyOf = (x:unknown):string=>safe(x,180);
const nice = (x:unknown,fallback='Não informado'):string=>safe(x)||fallback;
/** P0: formatação somente leitura; date-only não sofre conversão UTC. */
const human=(text:string):string=>text
  .replace(/\bhealth_connect\b/gi,'Health Connect / dispositivo conectado')
  .replace(/\bhealth_record\b/gi,'Registro de saúde')
  .replace(/\bconsultation\b/gi,'Consulta médica')
  .replace(/\bscheduled\b/gi,'Programada')
  .replace(/\besporadico\b/gi,'esporádico')
  .replace(/\bmanual\b/gi,'Avulsa')
  .replace(/\b(20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d))\b/g,(value)=>{
     const instant=new Date(value);return Number.isNaN(instant.getTime())?value:
       new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant);
  });
export type MedicalDossierInputP3={
  context:HealthInsightContext; careflow:readonly CareFlowEventM2[]; ledger?:readonly BrainV5Alert[];
  treatmentFacts?:readonly A4ClinicalFact[];
  longitudinalA10?:readonly A10Fact[];
  hospitalizationLinksA10?:readonly Record<string,unknown>[];
  surgeryEvents?:readonly A7Event[];
  surgeryTeam?:readonly A7Team[];
  vaccination?:{courses:readonly A8Course[];events:readonly A8Event[]};
  clinicalA9?:{procedures:readonly A9Procedure[];sensitivities:readonly A9Sensitivity[]};
  ownerId:string; personId:string; personName:string; start:string; end:string;
  mode:MedicalModeP3; sections:readonly MedicalSectionP3[]; includeBrain?:boolean; generatedAt?:string;
  consultationId?:string;
  rehab?:{programs:readonly RehabProgramM5[];sessions:readonly RehabSessionM5[];
    milestones:readonly RehabMilestoneM5[];origins:readonly RehabOriginM5[]};
};
function isOwner(x:{user_id?:string;person_id?:string},uid:string,pid:string):boolean {
  return x.user_id===uid&&x.person_id===pid;
}
function relation(label:string,sourceId:unknown,ownedLabels:ReadonlyMap<string,string>):string|null {
  const id=keyOf(sourceId);const title=ownedLabels.get(id);return title?`${label}: ${title}`:null;
}
export function buildMedicalDossierP3(input:MedicalDossierInputP3):MedicalDossierP3{
  const {context,ownerId:uid,personId:pid,start,end}=input;
  if(!uid||!pid||context.userId!==uid||context.personId!==pid)throw Error('Escopo divergente: pessoa ou conta não autorizada.');
  if(!validClinicalDay(start)||!validClinicalDay(end)||start>end)throw Error('Período clínico inválido.');
  if(input.mode!=='summary'&&input.mode!=='detailed')throw Error('Formato do relatório inválido.');
  const sections=[...new Set(input.sections)].filter((s):s is MedicalSectionP3=>ALLOWED.has(s));
  if(!sections.length)throw Error('Selecione pelo menos uma seção do Modo Médico.');
  const selected=(s:MedicalSectionP3)=>sections.includes(s);
  const within=(s:string)=>s>=start&&s<=end&&validClinicalDay(s);
  const owned=<T extends {user_id?:string;person_id?:string}>(arr:readonly T[]):T[]=>arr.filter(x=>isOwner(x,uid,pid));
  const meds=owned(context.medicamentos),consults=owned(context.consultas),treatments=owned(context.tratamentos),
    exams=owned(context.exames),surgeries=owned(context.cirurgias),withdrawals=owned(context.retiradas),
    renewals=owned(context.renovacoes),cf=owned(input.careflow);
  const medMap=new Map(meds.filter(m=>m.id).map(m=>[m.id!,m] as const));
  const treatMap=new Map(treatments.filter(t=>t.id).map(t=>[t.id!,t] as const));
  const consulted=new Map(consults.filter(c=>c.id).map(c=>[c.id!,c] as const));
  const renewalMap=new Map(renewals.filter(r=>r.id).map(r=>[r.id!,r] as const));
  const doseMap=new Map(owned(context.doseLogs).filter(d=>d.id).map(d=>[d.id!,d] as const));
  // P3-D1: relações derivadas somente de IDs de registros da MESMA pessoa.
  const symptomMap=new Map(owned(context.registrosSaude).filter(r=>r.id&&r.categoria==='sintoma').map(r=>[r.id!,r] as const));
  const symptomLinks=cf.filter(e=>e.kind==='monitor_note'&&e.payload.link==='consultation_to_existing_symptom'&&
    consulted.has(e.parent_id||'')&&symptomMap.has(e.related_id||''));
  const consultationLinksBySymptom=new Map<string,string[]>();
  for(const link of symptomLinks){
    const id=link.related_id!;const list=consultationLinksBySymptom.get(id)||[];
    if(!list.includes(link.parent_id!))list.push(link.parent_id!);
    consultationLinksBySymptom.set(id,list);
  }
  const consultation=input.consultationId?consulted.get(input.consultationId):undefined;
  if(input.consultationId&&!consultation)throw Error('Consulta não pertence à pessoa e conta ativas.');
  // Apenas relações explícitas; data/médico coincidentes NÃO vinculam eventos.
  const episodeCareIds=new Set<string>();
  if(consultation?.id){
    let grown=true;
    while(grown){grown=false;for(const e of cf){
      if(episodeCareIds.has(e.id))continue;
      if(e.related_id===consultation.id||e.parent_id===consultation.id||(e.parent_id&&episodeCareIds.has(e.parent_id))){
        episodeCareIds.add(e.id);grown=true;
      }
    }}
  }
  const episodeSymptomIds=new Set(symptomLinks.filter(e=>consultation?.id&&e.parent_id===consultation.id).map(e=>e.related_id!));
  const careLabels=new Map(cf.map(e=>[e.id,nice(e.payload.title,nice(e.payload.name,'Evento CareFlow'))] as const));
  const relatedLabels=new Map([...careLabels,...consults.filter(c=>c.id).map(c=>[c.id!,`Consulta ${safe(c.especialidade,90)} · ${date(c.data)||'sem data'}`] as const),
    ...[...symptomMap.values()].map(r=>[r.id!,`Sintoma ${safe(r.nome,90)} · ${date(r.data)||'sem data'}`] as const)]);
  const reportSections=sections.filter(s=>BASE.has(s)) as Report360Section[];
  const base=buildClinicalReport360({context,ledger:input.includeBrain?input.ledger??[]:[],ownerId:uid,personId:pid,
    personName:nice(input.personName,'Pessoa ativa'),start,end,sections:reportSections.length?reportSections:['consultations'],mode:input.includeBrain?'brain':'factual'});
  const rows:MedicalRowP3[]=[];
  const add=(r:Omit<MedicalRowP3,'key'>)=>{
    if(!r.sourceId||!r.source||!within(r.date))return;
    rows.push({...r,key:`${r.section}:${r.source}:${r.sourceId}`,title:human(safe(r.title,160))||'Registro sem título',detail:human(safe(r.detail,1200)),
      relations:[...new Set(r.relations.filter(Boolean).map(humanMedicalRelationG4).filter(Boolean))].slice(0,25)});
  };
  for(const row of base.rows){
    if(row.category!=='brain'&&!selected(row.category))continue;
    if(row.category==='brain'&&!input.includeBrain)continue;
    const c=row.source==='consultation'?consulted.get(row.sourceId):undefined;
    const symptom=row.category==='symptoms'?symptomMap.get(row.sourceId):undefined;
    const relations:string[]=[];
    if(symptom)for(const consultationId of consultationLinksBySymptom.get(row.sourceId)||[]){
      const linked=consulted.get(consultationId);
      if(linked)relations.push(`Consulta relacionada: ${safe(linked.especialidade,90)||'Atendimento'} · ${date(linked.data)||'sem data'}`);
    }
    const dose=row.source==='dose_log'?doseMap.get(row.sourceId):undefined;
    const reading=row.category==='measurements'?owned(context.registrosSaude).find(r=>r.id===row.sourceId):undefined;
    if(dose){const m=medMap.get(dose.medicamento_id);if(m)relations.push(`Medicamento: ${safe(m.nome,100)}`);}
    if(c){for(const id of c.medicamento_ids??[]){const m=medMap.get(id);if(m)relations.push(`Medicamento vinculado: ${safe(m.nome,100)}`);}
      for(const id of c.tratamento_ids??[]){const t=treatMap.get(id);if(t)relations.push(`Tratamento vinculado: ${safe(t.nome,100)}`);}
    }
    const medForDose=dose?medMap.get(dose.medicamento_id):undefined;
    const doseTitle=medForDose?`${safe(medForDose.nome,100)}${safe(medForDose.dosagem,45)?' · '+safe(medForDose.dosagem,45):''}`:row.title;
    add({section:row.category,date:row.date,time:row.time,title:doseTitle,detail:row.detail,source:row.source,
      sourceId:row.sourceId,registeredAt:null,provenance:row.category==='brain'?'motor':row.category==='symptoms'||row.category==='consultations'?'declarado':'registrado',relations,
      href:dose?.id?`/saude/careflow/fato?tipo=dose&id=${encodeURIComponent(dose.id)}`:
       reading?.id?`/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(reading.id)}`:
       row.category==='consultations'&&c?.id?`/saude/consultas/detalhes?id=${encodeURIComponent(c.id)}`:
        symptom?.id?`/saude/careflow/sintomas#careflow-sintoma-${encodeURIComponent(symptom.id)}`:null});
  }
  // Algumas versões antigas salvaram a pressão com categoria divergente. A autoridade
  // continua sendo o registro original: apenas garantimos sua projeção na seção Medições.
  if(selected('measurements'))for(const reading of owned(context.registrosSaude)){
    if(reading.tipo!=='pressao_arterial'||!reading.id||!within(date(reading.data)))continue;
    if(rows.some(row=>row.section==='measurements'&&row.sourceId===reading.id))continue;
    add({section:'measurements',date:date(reading.data),time:clock(reading.horario),title:`Pressão arterial · ${safe(reading.valor_medicao,40)||'valor não informado'}`,
      detail:safe(reading.observacoes,500)||'Medição manual registrada pela pessoa.',source:'registro_saude_pressao',sourceId:reading.id,
      registeredAt:reading.created_at||null,provenance:'registrado',relations:[],href:`/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(reading.id)}`});
  }
  // R6: a aferição canônica já está em Medições; não repetir a mesma medida
  // apenas porque um evento imutável a vinculou ao plano.
  if(selected('careflow'))for(const e of cf){
    if(e.kind==='monitor_reading'&&selected('measurements')&&e.related_id&&
      owned(context.registrosSaude).some(r=>r.id===e.related_id&&r.tipo==='pressao_arterial'&&within(date(r.data))))continue;
    const isSymptomLink=e.kind==='monitor_note'&&e.payload.link==='consultation_to_existing_symptom';
    const symptom=isSymptomLink?symptomMap.get(e.related_id||''):undefined;
    const visit=isSymptomLink?consulted.get(e.parent_id||''):undefined;
    // O relato original continua autoridade; se exibido em Sintomas, não duplicar como outro fato.
    if(isSymptomLink&&symptom&&visit&&selected('symptoms')&&within(date(symptom.data)))continue;
    const declaredDay=symptom?date(symptom.data):date(e.payload.date)||date(e.payload.start);
    const fact=declaredDay||date(e.created_at);
    if(!within(fact))continue;
    const parent=relation(isSymptomLink?'Consulta de origem':'Pedido/plano de origem',e.parent_id,relatedLabels);
    const related=relation(isSymptomLink?'Relato original':'Registro relacionado',e.related_id,relatedLabels);
    const title=isSymptomLink?(symptom&&visit?nice(symptom.nome,'Sintoma relatado'):'Vínculo de sintoma não verificável'):
      nice(e.payload.title,nice(e.payload.name,{
        exam_order:'Pedido de exames',exam_item:'Exame solicitado',exam_status:'Status declarado',exam_result:'Resultado informado',
        monitor_plan:'Plano de monitoramento',monitor_reading:'Aferição vinculada',monitor_note:'Observação vinculada'}[e.kind]));
    const clinicalNote=symptom&&visit?[
      `Relato existente: ${safe(symptom.nome,140)}`,
      typeof symptom.intensidade==='number'?`Intensidade declarada: ${symptom.intensidade}/10`:'Intensidade não informada',
      clock(symptom.horario)?`Hora do fato: ${symptom.horario}`:'Hora não informada',
      safe(symptom.observacoes,500),
      'Vínculo com consulta declarado pela pessoa; não comprova causalidade.'
    ].filter(Boolean).join(' · '):'';
    const detail=isSymptomLink?(clinicalNote||'Referência não resolvida no escopo atual; não inferir conteúdo clínico.'):
      [declaredDay?'Data clínica declarada':'Data do cadastro; data clínica não informada',safe(e.payload.result),safe(e.payload.state),safe(e.payload.note),safe(e.payload.source)].filter(Boolean).join(' · ');
    // Destino exato só para ID validado na pessoa ativa, nunca por nome/data.
    const examItem=e.kind==='exam_item'?e:
      (e.kind==='exam_status'||e.kind==='exam_result')?
        cf.find(x=>x.kind==='exam_item'&&x.id===e.parent_id):undefined;
    const examOrder=e.kind==='exam_order'?e:
      cf.find(x=>x.kind==='exam_order'&&x.id===(examItem?.parent_id||e.parent_id));
    const originalReading=e.related_id?owned(context.registrosSaude).find(x=>x.id===e.related_id):undefined;
    const exactHrefR6=e.kind==='exam_order'?`/saude/careflow/exames#careflow-pedido-${encodeURIComponent(e.id)}`:
      examItem&&examOrder?`/saude/careflow/exames#careflow-exame-${encodeURIComponent(examItem.id)}`:
      e.kind==='monitor_plan'?`/saude/careflow/pressao#careflow-plano-${encodeURIComponent(e.id)}`:
      e.kind==='monitor_reading'&&originalReading?`/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(originalReading.id!)}`:
      isSymptomLink&&symptom?`/saude/careflow/sintomas#careflow-sintoma-${encodeURIComponent(symptom.id!)}`:
      e.kind==='monitor_note'&&originalReading?`/saude/careflow/fato?tipo=registro&id=${encodeURIComponent(originalReading.id!)}`:null;
    add({section:'careflow',date:fact,time:symptom?clock(symptom.horario):clock(e.payload.time),title,detail:detail||'Sem complemento registrado.',source:`careflow_${e.kind}`,
      sourceId:e.id,registeredAt:e.created_at,provenance:'declarado',relations:[parent,related].filter((x):x is string=>Boolean(x)),
      href:exactHrefR6});
  }
  if(selected('exams'))for(const e of exams){
    const d=date(e.data);if(!within(d))continue;
    add({section:'exams',date:d,time:clock(e.horario),title:nice(e.nome,'Exame'),detail:
      `Exame cadastrado. ${e.motivo?safe(e.motivo,350):'Motivo não informado'}. Não implica coleta ou laudo concluído.`,
      source:'exame_cadastrado',sourceId:e.id||`${d}:${safe(e.nome,100)}`,registeredAt:e.created_at||null,
      provenance:'declarado',relations:(e.tratamento_ids||[]).filter(id=>treatMap.has(id)).map(id=>`Tratamento: ${safe(treatMap.get(id)?.nome,100)}`),href:e.id?`/saude/exames/detalhes?id=${encodeURIComponent(e.id)}`:null});
  }
  if(selected('surgeries'))for(const e of surgeries){
    const d=date(e.data);if(!within(d))continue;
    add({section:'surgeries',date:d,time:clock(e.horario),title:nice(e.procedimento,'Procedimento'),
      detail:`Situação registrada: ${nice(e.status)}. ${safe(e.observacoes)||'Sem observações adicionais.'}`,
      source:'cirurgia_cadastrada',sourceId:e.id||`${d}:${safe(e.procedimento,100)}`,registeredAt:e.created_at||null,
      provenance:'declarado',relations:(e.tratamento_ids||[]).filter(id=>treatMap.has(id)).map(id=>`Tratamento: ${safe(treatMap.get(id)?.nome,100)}`),href:'/saude/cirurgias'});
  }
  if(selected('withdrawals'))for(const r of withdrawals){
    const d=date(r.data);if(!within(d))continue;
    const med=medMap.get(r.medicamento_id);
    const state=nice(r.status);
    const qty=r.quantidade_retirada;
    const detail=`Situação registrada: ${state}; quantidade informada: ${typeof qty==='number'&&Number.isFinite(qty)?qty:'desconhecida'} (unidade não inferida). ${r.realizada_em?'Conclusão declarada em '+safe(r.realizada_em):'Sem conclusão registrada nesta linha.'}`;
    const renewal=renewalMap.get(r.renovacao_origem_id||'');
    add({section:'withdrawals',date:d,time:clock(r.horario),title:med?.nome||safe(r.medicamento_nome)||'Retirada',
      detail,source:'retirada',sourceId:r.id||`${d}:${r.medicamento_id}`,registeredAt:r.created_at||null,
      provenance:'declarado',relations:[med?`Medicamento: ${safe(med.nome,100)}`:'',renewal?`Aquisição/receita de origem: ${safe(renewal.medicamento_nome)||safe(med?.nome)||'Registro existente'}`:''].filter(Boolean),href:'/saude/retiradas'});
  }
  if(selected('prescriptions'))for(const r of renewals){
    const d=date(r.data_aquisicao)||date(r.data);if(!within(d))continue;
    const med=medMap.get(r.medicamento_id);
    const detail=`Data da receita: ${date(r.data)||'não informada'}; data de aquisição: ${date(r.data_aquisicao)||'não informada'}. ${r.quantidade!=null&&Number.isFinite(r.quantidade)?`Quantidade declarada: ${r.quantidade}; unidade não inferida.`:'Quantidade não informada.'}`;
    add({section:'prescriptions',date:d,time:null,title:safe(r.medicamento_nome)||med?.nome||'Receita/aquisição',
      detail,source:'renovacao_aquisicao',sourceId:r.id||`${d}:${r.medicamento_id}`,registeredAt:r.created_at||null,
      provenance:'declarado',relations:med?[`Medicamento: ${safe(med.nome,100)}`]:[],href:'/saude/renovacoes'});
  }
  if(selected('treatments'))for(const r of treatments){
    const d=end; // fotografia atual, nunca reconstituir início/histórico por inferência
    add({section:'treatments',date:d,time:null,title:nice(r.nome,'Tratamento'),detail:
      `Cadastro atual: ${nice(r.status)}. Início declarado: ${date(r.data_inicio)||'não informado'}. Não é histórico reconstruído de posologia.`,
      source:'tratamento_atual',sourceId:r.id||`cadastro:${safe(r.nome,100)}`,registeredAt:r.updated_at||null,
      provenance:'registrado',relations:(r.medicamento_ids||[]).filter(id=>medMap.has(id)).map(id=>`Medicamento cadastrado: ${safe(medMap.get(id)?.nome,100)}`),
      href:'/saude/tratamentos'});
  }
  // M5: restore factual rehabilitation records without producing a parallel record writer.
  const rehabFacts=input.rehab?rehabFactsM5({userId:uid,personId:pid,
    programs:input.rehab.programs,sessions:input.rehab.sessions,milestones:input.rehab.milestones}):[];
  if(selected('rehabilitation'))for(const f of rehabFacts){
    const day=/^\d{4}-\d{2}-\d{2}$/.test(f.date)?f.date:localDayRehabM5(f.date);
    if(!within(day))continue;
    const instant=f.date.includes('T')?new Date(f.date):null;
    const time=instant&&Number.isFinite(instant.getTime())?
      instant.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):null;
    add({section:'rehabilitation',date:day,time,title:safe(f.title,180),detail:safe(f.detail,800),
      provenance:'declarado',source:'reabilitacao_'+f.kind,sourceId:f.id,registeredAt:f.date,
      relations:[safe(f.source,150)],href:f.href});
  }
  const episodeRehabIds=new Set(consultation?.id?(input.rehab?.origins||[])
    .filter(o=>o.user_id===uid&&o.person_id===pid&&!o.deleted_at&&o.origin_type==='consulta'&&o.origin_id===consultation.id)
    .map(o=>o.program_id):[]);
  const episodeRehabFacts=new Set(rehabFacts.filter(f=>episodeRehabIds.has(f.programId)).map(f=>f.id));
  // A4: every versioned phase is an independent historical occurrence, not a snapshot.
  if(selected('treatments'))for(const f of input.treatmentFacts||[]){
    if(f.userId!==uid||f.personId!==pid||!within(f.date)||!treatMap.has(f.treatmentId))continue;
    add({section:'treatments',date:f.date,time:null,title:`${f.treatmentName} · ${f.kindLabel}`,
      detail:[f.title,f.sourceLabel,...f.details,f.notes||'',
        'Registro declarado; não confirma prescrição atual, dose tomada ou melhora clínica.'].filter(Boolean).join(' · '),
      source:'a4_treatment_phase',sourceId:f.id,registeredAt:f.recordedAt,provenance:'declarado',
      relations:[f.medicationName?`Medicamento vinculado: ${f.medicationName}`:'',
        f.consultationId&&consulted.has(f.consultationId)?`Consulta vinculada: ${safe(consulted.get(f.consultationId)?.especialidade,100)}`:'',
        f.documentId?'Documento vinculado por ID (conteúdo não incluído)':''].filter(Boolean),href:f.href});
  }
  // A7: surgery and professional records use surgery IDs, never inferred hospitalization IDs.
  if(selected('surgeries')){
    const surgeryIds=new Set(surgeries.flatMap(s=>s.id?[s.id]:[]));
    const stageLabel:Record<string,string>={pre:'Preparação',procedure:'Procedimento',post:'Pós-operatório',return:'Retorno'};
    const sourceLabel:Record<string,string>={self_report:'Relato pessoal',professional_document:'Documento profissional',verified_import:'Importação verificada'};
    for(const e of input.surgeryEvents||[]){
      if(e.user_id!==uid||e.person_id!==pid||e.deleted_at||!surgeryIds.has(e.cirurgia_id))continue;
      const factDay=date(e.occurred_on)||date(e.created_at);if(!within(factDay))continue;
      add({section:'surgeries',date:factDay,time:null,title:`${stageLabel[e.stage]||'Jornada'} · ${safe(e.title,170)}`,
        detail:`${sourceLabel[e.source]||'Origem informada'} · ${safe(e.description,4000)}${!e.occurred_on?' · Data do fato não informada; exibida data de cadastro.':''}${e.corrects_event_id?' · Retificação com referência ao original.':''}`,
        source:'surgery_journey_event_a7',sourceId:e.id,registeredAt:e.created_at,provenance:'declarado',
        relations:['Cirurgia vinculada pelo identificador original'],
        href:`/saude/cirurgias/jornada?id=${encodeURIComponent(e.cirurgia_id)}#a7-event-${encodeURIComponent(e.id)}`});
    }
    for(const t of input.surgeryTeam||[]){
      if(t.user_id!==uid||t.person_id!==pid||t.deleted_at||!surgeryIds.has(t.cirurgia_id))continue;
      const day=date(t.created_at);if(!within(day))continue;
      add({section:'surgeries',date:day,time:null,title:`Equipe do procedimento · ${safe(t.role,120)}`,
        detail:`${sourceLabel[t.source]||'Origem informada'} · Participação vinculada à cirurgia. ${safe(t.note,1200)}`,
        source:'surgery_team_a7',sourceId:t.id,registeredAt:t.created_at,provenance:'declarado',
        relations:['Equipe cirúrgica; não equivale à equipe da internação'],
        href:`/saude/cirurgias/jornada?id=${encodeURIComponent(t.cirurgia_id)}`});
    }
  }
  // A8: same canonical vaccination events as the standalone dossier. No inference from dates or M144 diary.
  if(selected('vaccinations')&&input.vaccination){
    const courses=owned(input.vaccination.courses).filter(c=>!c.deleted_at);
    const names=new Map(courses.map(c=>[c.id,c.vaccine_name]));
    for(const e of currentVaccinationEventsA8(input.vaccination.events,uid,pid)){
      if(e.effective_kind==='void'||!names.has(e.course_id))continue;
      const factDay=e.effective_kind==='dose'?e.administered_on:e.planned_on;
      if(!factDay||!within(factDay))continue;
      const isDose=e.effective_kind==='dose';
      add({section:'vaccinations',date:factDay,time:null,
        title:`${isDose?'Aplicação informada':'Data planejada'} · ${safe(names.get(e.course_id),160)}`,
        detail:[e.dose_number?`Dose ${e.dose_number}`:'',e.lot?`Lote ${e.lot}`:'',e.manufacturer?`Fabricante informado: ${e.manufacturer}`:'',
          e.source==='professional_document'?'Documento profissional apresentado':'Relato próprio',e.note||'',
          isDose?'Aplicação declarada, não validação oficial do esquema.':'Planejamento não confirma vacinação.'].filter(Boolean).join(' · '),
        source:'vaccination_event_a8',sourceId:e.id,registeredAt:e.created_at,provenance:'declarado',
        relations:['Carteira A8 vinculada por ID ao perfil ativo'],href:`/saude/vacinas?curso=${encodeURIComponent(e.course_id)}`});
    }
  }
  // A9: one factual projection shared with PDF. Corrections retained but only current facts displayed.
  if(input.clinicalA9){
    if(selected('procedures_a9'))for(const e of activeFactsA9(input.clinicalA9.procedures,uid,pid)){
      const day=e.planned_on||e.performed_on;if(!day||!within(day))continue;
      add({section:'procedures_a9',date:day,time:null,title:`${A9_PROCEDURE_LABEL[e.effective_status]} · ${safe(e.title,160)}`,
        detail:[e.category==='dressing'?'Curativo':e.category==='ambulatory'?'Procedimento ambulatorial':'Procedimento não cirúrgico',
          e.source==='professional_document'?'Documento profissional informado':'Relato próprio',e.note||'',
          e.effective_status==='planned'?'Planejamento não comprova realização':'Realização informada, sem validação automática'].filter(Boolean).join(' · '),
        source:'procedure_event_a9',sourceId:e.id,registeredAt:e.created_at,provenance:'declarado',
        relations:[e.consultation_id&&consulted.has(e.consultation_id)?`Consulta vinculada por ID: ${e.consultation_id}`:'',
          'Autoridade A9: não é cirurgia, internação ou sessão M5'].filter(Boolean),
        href:`/saude/procedimentos?id=${encodeURIComponent(e.id)}`});
    }
    if(selected('sensitivities_a9'))for(const e of activeFactsA9(input.clinicalA9.sensitivities,uid,pid)){
      if(!within(e.reported_on))continue;
      add({section:'sensitivities_a9',date:e.reported_on,time:null,
        title:`${A9_SENSITIVITY_LABEL[e.sensitivity_type]} · ${safe(e.agent_label,160)}`,
        detail:[e.certainty==='suspected'?'Suspeita/relato — não é diagnóstico':'Documento profissional informado — sem validação VAULT',
          e.severity==='unknown'?'Intensidade não informada':`Intensidade declarada: ${e.severity}`,
          e.source==='professional_document'?'Fonte documental informada':'Relato próprio',e.note||'',
          'Associação temporal não determina causalidade'].filter(Boolean).join(' · '),
        source:'sensitivity_event_a9',sourceId:e.id,registeredAt:e.created_at,provenance:'declarado',
        relations:[e.related_id?'Vínculo declarado por ID, sem causalidade automática':'Sem vínculo relacional declarado'],
        href:`/saude/reacoes?id=${encodeURIComponent(e.id)}`});
    }
  }
  // A10: complement only the canonical gaps; do not duplicate rows already emitted by M3.
  // Same exact MedicalDossierP3 is consumed by preview and official PDF generator.
  if(input.longitudinalA10){
    for(const f of input.longitudinalA10){
      if(f.userId!==uid||f.personId!==pid||f.revision!=='current'||!f.day||!within(f.day))continue;
      const section:MedicalSectionP3|null=f.domain==='hospitalization'?'hospitalizations':
        f.authority==='surgical_intents_a7m5'?'surgeries':
        f.authority==='exam_orders'||f.authority==='exam_order_items'?'exams':null;
      if(!section||!selected(section)||rows.some(r=>r.section===section&&r.sourceId===f.id))continue;
      add({section,date:f.day,time:null,title:f.title,detail:[f.detail,f.status,f.origin].filter(Boolean).join(' · '),
        provenance:'declarado',source:f.authority,sourceId:f.id,registeredAt:null,
        relations:verifiedMedicalRelationsA10G4(f,input.longitudinalA10),href:f.href});
    }
  }
  // Episódio: somente registros com prova por ID; não incluir por mera coincidência de data ou médico.
  const episodeRows=consultation?rows.filter(r=>{
    if(r.section==='consultations')return r.sourceId===consultation.id;
    if(r.section==='careflow')return episodeCareIds.has(r.sourceId);
    if(r.section==='symptoms')return episodeSymptomIds.has(r.sourceId);
    if(r.section==='medications')return Boolean(consultation.medicamento_ids?.includes(r.sourceId));
    if(r.section==='treatments'){
      if(r.source==='a4_treatment_phase'){
        const fact=(input.treatmentFacts||[]).find(f=>f.id===r.sourceId&&f.userId===uid&&f.personId===pid);
        return Boolean(fact&&(fact.consultationId===consultation.id || consultation.tratamento_ids?.includes(fact.treatmentId)));
      }
      return Boolean(consultation.tratamento_ids?.includes(r.sourceId));
    }
    if(r.section==='rehabilitation')return episodeRehabFacts.has(r.sourceId);
    if(r.section==='hospitalizations'){
      const f=input.longitudinalA10?.find(f=>f.userId===uid&&f.personId===pid&&f.id===r.sourceId&&f.authority===r.source);
      if(!f)return false;
      const episodeId=f.authority==='hospitalizations_a5'?f.id:f.authority==='hospitalization_events_a5'?f.relationId:null;
      return Boolean(episodeId&&input.hospitalizationLinksA10?.some(link=>link.user_id===uid&&link.person_id===pid&&
        !link.deleted_at&&link.hospitalization_id===episodeId&&link.entity_type==='consulta'&&link.entity_id===consultation.id));
    }
    if(r.section==='surgeries'&&r.source==='surgical_intents_a7m5')return Boolean(input.longitudinalA10?.some(f=>f.id===r.sourceId&&f.authority===r.source&&
      f.userId===uid&&f.personId===pid&&f.relationTargets.some(link=>link.authority==='consultas'&&link.id===consultation.id)));
    if(r.section==='procedures_a9')return Boolean(input.clinicalA9?.procedures.some(p=>p.id===r.sourceId&&p.user_id===uid&&p.person_id===pid&&p.consultation_id===consultation.id));
    return false;
  }):rows;
  episodeRows.sort((a,b)=>b.date.localeCompare(a.date)||(b.time||'').localeCompare(a.time||'')||a.section.localeCompare(b.section)||a.key.localeCompare(b.key));
  // Uma coincidência de chave legada não autoriza apagar ocorrências históricas.
  const occurrences=new Map<string,number>();
  const uniqueRows=episodeRows.map(r=>{const n=occurrences.get(r.key)||0;occurrences.set(r.key,n+1);return n?{...r,key:`${r.key}::${n}`} :r;});
  const availableCount=uniqueRows.length;
  if(availableCount>6000)throw Error('Dossiê acima do limite de segurança local; reduza o período ou as seções.');
  const summaryLimit=30;
  const visible=input.mode==='summary'?uniqueRows.slice(0,summaryLimit):uniqueRows;
  return {version:3,mode:input.mode,personName:nice(input.personName,'Pessoa ativa'),start,end,
    sections,rows:visible,availableCount,omittedBySummary:availableCount-visible.length,
    episode:consultation?.id?{consultationId:consultation.id,date:date(consultation.data),title:safe(consultation.especialidade,110)||'Consulta'}:undefined,
    generatedAt:input.generatedAt||new Date().toISOString(),
    limitations:[...base.limitations,
      'Os vínculos são exibidos apenas quando seus IDs existem no contexto autorizado; sem vínculo não significa ausência clínica.',
      'Resultados de exames são somente eventos explicitamente registrados, nunca deduzidos por pedido ou OCR.',
      'Fotografias atuais de tratamentos e medicamentos não reconstituem versões históricas de prescrição.',
      'Uma retirada concluída não movimenta nem recalcula o estoque por gerar este documento.',
      'PDF produzido localmente e exportado/arquivado somente após uma ação explícita do usuário.']};
}
