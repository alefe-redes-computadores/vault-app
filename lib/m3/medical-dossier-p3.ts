/** VAULT CI360 M3 P3 — projeto de leitura para o Modo Médico.
 * Não escreve estado clínico, não infere dose tomada, resultado, diagnóstico ou estoque.
 * Apenas relações por IDs existentes e escopo proprietário+pessoa COMPROVADO.
 */
import { buildClinicalReport360, validClinicalDay, type Report360Section } from '@/lib/clinical-report-360';
import type { HealthInsightContext } from '@/lib/health-insights';
import type { CareFlowEventM2 } from '@/lib/careflow-m2/domain';
import type { BrainV5Alert } from '@/lib/health-intelligence/brain-v5';

export type MedicalSectionP3 = Report360Section | 'careflow' | 'surgeries' | 'exams' | 'withdrawals' | 'prescriptions' | 'treatments';
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
  {id:'treatments',label:'Tratamentos',description:'Cadastro atual e relações explícitas'},
  {id:'documents',label:'Documentos',description:'Somente títulos e metadados permitidos'},
];
const ALLOWED = new Set<MedicalSectionP3>(MEDICAL_SECTIONS_P3.map(s=>s.id));
const BASE = new Set<MedicalSectionP3>(['medications','doses','symptoms','measurements','consultations','documents']);
const safe = (v:unknown,max=700):string => typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,max):'';
const date = (v:unknown):string => {const s=safe(v,30).slice(0,10);return validClinicalDay(s)?s:'';};
const clock = (v:unknown):string|null => typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:null;
const keyOf = (x:unknown):string=>safe(x,180);
const nice = (x:unknown,fallback='Não informado'):string=>safe(x)||fallback;
export type MedicalDossierInputP3={
  context:HealthInsightContext; careflow:readonly CareFlowEventM2[]; ledger?:readonly BrainV5Alert[];
  ownerId:string; personId:string; personName:string; start:string; end:string;
  mode:MedicalModeP3; sections:readonly MedicalSectionP3[]; includeBrain?:boolean; generatedAt?:string;
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
  const careLabels=new Map(cf.map(e=>[e.id,nice(e.payload.title,nice(e.payload.name,'Evento CareFlow'))] as const));
  const relatedLabels=new Map([...careLabels,...consults.filter(c=>c.id).map(c=>[c.id!,`Consulta ${safe(c.especialidade,90)} · ${date(c.data)||'sem data'}`] as const)]);
  const reportSections=sections.filter(s=>BASE.has(s)) as Report360Section[];
  const base=buildClinicalReport360({context,ledger:input.includeBrain?input.ledger??[]:[],ownerId:uid,personId:pid,
    personName:nice(input.personName,'Pessoa ativa'),start,end,sections:reportSections.length?reportSections:['consultations'],mode:input.includeBrain?'brain':'factual'});
  const rows:MedicalRowP3[]=[];
  const add=(r:Omit<MedicalRowP3,'key'>)=>{
    if(!r.sourceId||!r.source||!within(r.date))return;
    rows.push({...r,key:`${r.section}:${r.source}:${r.sourceId}`,title:safe(r.title,160)||'Registro sem título',detail:safe(r.detail,1200),
      relations:[...new Set(r.relations.filter(Boolean))].slice(0,25)});
  };
  for(const row of base.rows){
    if(row.category!=='brain'&&!selected(row.category))continue;
    if(row.category==='brain'&&!input.includeBrain)continue;
    const c=row.source==='consultation'?consulted.get(row.sourceId):undefined;
    const relations:string[]=[];
    const dose=row.source==='dose_log'?doseMap.get(row.sourceId):undefined;
    if(dose){const m=medMap.get(dose.medicamento_id);if(m)relations.push(`Medicamento: ${safe(m.nome,100)}`);}
    if(c){for(const id of c.medicamento_ids??[]){const m=medMap.get(id);if(m)relations.push(`Medicamento vinculado: ${safe(m.nome,100)}`);}
      for(const id of c.tratamento_ids??[]){const t=treatMap.get(id);if(t)relations.push(`Tratamento vinculado: ${safe(t.nome,100)}`);}
    }
    add({section:row.category,date:row.date,time:row.time,title:row.title,detail:row.detail,source:row.source,
      sourceId:row.sourceId,registeredAt:null,provenance:row.category==='brain'?'motor':row.category==='symptoms'||row.category==='consultations'?'declarado':'registrado',relations,
      href:row.category==='consultations'&&c?.id?`/saude/consultas/detalhes?id=${encodeURIComponent(c.id)}`:null});
  }
  if(selected('careflow'))for(const e of cf){
    const declaredDay=date(e.payload.date)||date(e.payload.start);
    const fact=declaredDay||date(e.created_at);
    if(!within(fact))continue;
    const parent=relation('Pedido/plano de origem',e.parent_id,careLabels);
    const related=relation('Registro relacionado',e.related_id,relatedLabels);
    const title=nice(e.payload.title,nice(e.payload.name,{
      exam_order:'Pedido de exames',exam_item:'Exame solicitado',exam_status:'Status declarado',exam_result:'Resultado informado',
      monitor_plan:'Plano de monitoramento',monitor_reading:'Aferição vinculada',monitor_note:'Observação vinculada'}[e.kind]));
    const detail=[declaredDay?'Data clínica declarada':'Data do cadastro; data clínica não informada',safe(e.payload.result),safe(e.payload.state),safe(e.payload.note),safe(e.payload.source)].filter(Boolean).join(' · ');
    add({section:'careflow',date:fact,time:null,title,detail:detail||'Sem complemento registrado.',source:`careflow_${e.kind}`,
      sourceId:e.id,registeredAt:e.created_at,provenance:'declarado',relations:[parent,related].filter((s):s is string=>Boolean(s)),
      href:e.kind.startsWith('exam_')?'/saude/careflow/exames':'/saude/careflow/pressao'});
  }
  if(selected('exams'))for(const e of exams){
    const d=date(e.data);if(!within(d))continue;
    add({section:'exams',date:d,time:clock(e.horario),title:nice(e.nome,'Exame'),detail:
      `Exame cadastrado. ${e.motivo?safe(e.motivo,350):'Motivo não informado'}. Não implica coleta ou laudo concluído.`,
      source:'exame_cadastrado',sourceId:e.id||`${d}:${safe(e.nome,100)}`,registeredAt:e.created_at||null,
      provenance:'declarado',relations:(e.tratamento_ids||[]).filter(id=>treatMap.has(id)).map(id=>`Tratamento: ${safe(treatMap.get(id)?.nome,100)}`),href:'/saude/exames'});
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
  rows.sort((a,b)=>b.date.localeCompare(a.date)||(b.time||'').localeCompare(a.time||'')||a.section.localeCompare(b.section)||a.key.localeCompare(b.key));
  // Uma coincidência de chave legada não autoriza apagar ocorrências históricas.
  const occurrences=new Map<string,number>();
  const uniqueRows=rows.map(r=>{const n=occurrences.get(r.key)||0;occurrences.set(r.key,n+1);return n?{...r,key:`${r.key}::${n}`} :r;});
  const availableCount=uniqueRows.length;
  if(availableCount>6000)throw Error('Dossiê acima do limite de segurança local; reduza o período ou as seções.');
  const summaryLimit=30;
  const visible=input.mode==='summary'?uniqueRows.slice(0,summaryLimit):uniqueRows;
  return {version:3,mode:input.mode,personName:nice(input.personName,'Pessoa ativa'),start,end,
    sections,rows:visible,availableCount,omittedBySummary:availableCount-visible.length,
    generatedAt:input.generatedAt||new Date().toISOString(),
    limitations:[...base.limitations,
      'Os vínculos são exibidos apenas quando seus IDs existem no contexto autorizado; sem vínculo não significa ausência clínica.',
      'Resultados de exames são somente eventos explicitamente registrados, nunca deduzidos por pedido ou OCR.',
      'Fotografias atuais de tratamentos e medicamentos não reconstituem versões históricas de prescrição.',
      'Uma retirada concluída não movimenta nem recalcula o estoque por gerar este documento.',
      'PDF produzido localmente e exportado/arquivado somente após uma ação explícita do usuário.']};
}
