/**
 * VAULT M122 — leitura factual da Fênix/Avatar, sem novo motor clínico.
 * Cada referência vem de uma entidade explícita do snapshot já isolado.
 * Datas não registradas permanecem desconhecidas e não viram omissão.
 * Não lê IndexedDB, não usa rede, não muda dados ou gravidade.
 */
import type { HealthInsightContext } from "@/lib/health-insights";

export type AvatarEvidenceDomainIdM122 =
  | "medications" | "treatments" | "doses" | "health_records" | "consultations" | "documents";
export type AvatarEvidencePeriodM122 = 7 | 30;
export type AvatarEvidenceEntryM122 = Readonly<{
  key: string;
  title: string;
  description: string;
  day: string | null;
  href: string;
}>;
export type AvatarEvidenceDomainM122 = Readonly<{
  id: AvatarEvidenceDomainIdM122;
  title: string;
  subtitle: string;
  route: string;
  scope: "current_snapshot" | "recorded_period";
  count: number;
  observedDays: number | null;
  lastRecordedDay: string | null;
  examples: readonly AvatarEvidenceEntryM122[];
  limitation: string;
}>;
export type AvatarEvidenceLensM122 = Readonly<{
  state: "ready" | "unavailable";
  personId: string | null;
  periodDays: AvatarEvidencePeriodM122;
  from: string | null;
  to: string | null;
  documentedDomains: number;
  domains: readonly AvatarEvidenceDomainM122[];
  note: string;
}>;

type OwnedRowM122 = {id?:string;user_id:string;person_id?:string};
const DAY = 86_400_000;
const ROOT = "/saude";
const dateMs = (day: string) => Date.parse(`${day}T12:00:00.000Z`);
export function validAvatarEvidenceDayM122(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const n=dateMs(value);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0,10) === value;
}
const dayOf=(value:unknown):string|null=>{
  if(typeof value!=="string"||(value.length!==10&&value[10]!=="T"))return null;
  const day=value.slice(0,10);
  return validAvatarEvidenceDayM122(day)?day:null;
};
const safeText=(v:unknown,limit=86):string=>typeof v==="string"?v.normalize("NFC").replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u206f]/g," ").replace(/\s+/g," ").trim().slice(0,limit):"";
const owned=<T extends OwnedRowM122>(data:readonly T[]|null|undefined,userId:string,personId:string):T[]=>
  (data??[]).filter(x=>x.user_id===userId&&x.person_id===personId);
const localHref=(base:string,id?:unknown)=>typeof id==="string"&&id.trim()?`${base}?id=${encodeURIComponent(id)}`:base;
const sorted=(rows:AvatarEvidenceEntryM122[]):AvatarEvidenceEntryM122[]=>rows.sort((a,b)=>(b.day??"").localeCompare(a.day??"")||a.key.localeCompare(b.key));
const dayCount=(rows:readonly AvatarEvidenceEntryM122[])=>new Set(rows.map(r=>r.day).filter(Boolean)).size;
const make=(id:AvatarEvidenceDomainIdM122,title:string,subtitle:string,route:string,scope:AvatarEvidenceDomainM122["scope"],rows:AvatarEvidenceEntryM122[],limitation:string):AvatarEvidenceDomainM122=>{
  const ordered=sorted(rows);
  return {id,title,subtitle,route,scope,count:ordered.length,observedDays:scope==="recorded_period"?dayCount(ordered):null,lastRecordedDay:scope==="recorded_period"?ordered.find(r=>r.day)?.day??null:null,examples:ordered.slice(0,3),limitation};
};
const unavailable=(periodDays:AvatarEvidencePeriodM122):AvatarEvidenceLensM122=>({state:"unavailable",personId:null,periodDays,from:null,to:null,documentedDomains:0,domains:[],note:"Contexto da conta ou pessoa ainda não confirmado. Nenhuma evidência de outra identidade é exibida."});

/** Pure, deterministic projection; no writes or cross-person fallback. */
export function buildAvatarEvidenceLensM122(
  context:HealthInsightContext|null|undefined,
  userId:string,
  personId:string,
  today:string,
  periodDays:AvatarEvidencePeriodM122=30,
):AvatarEvidenceLensM122 {
  if(periodDays!==7&&periodDays!==30)return unavailable(30);
  if(!context||!userId||!personId||context.userId!==userId||context.personId!==personId||!validAvatarEvidenceDayM122(today))return unavailable(periodDays);
  const from=new Date(dateMs(today)-(periodDays-1)*DAY).toISOString().slice(0,10);
  const inWindow=(date:unknown):string|null=>{
    const day=dayOf(date);
    return day&&day>=from&&day<=today?day:null;
  };
  const medications=owned(context.medicamentos,userId,personId);
  const treatments=owned(context.tratamentos,userId,personId);
  const medicationById=new Map(medications.filter(m=>m.id).map(m=>[m.id!,m.nome] as const));
  const domains:AvatarEvidenceDomainM122[]=[];
  domains.push(make("medications","Medicamentos","Cadastros atuais",`${ROOT}/medicamentos`,"current_snapshot",
    medications.filter(m=>m.id).map(m=>({key:`med:${m.id}`,title:safeText(m.nome)||"Medicamento cadastrado",description:m.status==="descontinuado"?"Marcado como descontinuado":"Cadastro de medicamento; tomada não presumida",day:null,href:localHref(`${ROOT}/medicamentos/detalhes`,m.id)})),
    "Contagem de cadastros atuais, não de tomadas, prescrições válidas ou medicamentos em uso real."));
  domains.push(make("treatments","Tratamentos","Vínculos registrados",`${ROOT}/tratamentos`,"current_snapshot",
    treatments.filter(t=>t.id).map(t=>({key:`treatment:${t.id}`,title:safeText(t.nome)||"Tratamento cadastrado",description:`Estado cadastrado: ${t.status==="ativo"?"ativo":t.status==="concluido"?"concluído":"suspenso"}. Não confirma resultado clínico.`,day:null,href:localHref(`${ROOT}/tratamentos/detalhes`,t.id)})),
    "Um vínculo explícito pode exigir conferência. Cadastro ou conclusão administrativa não comprova evolução clínica."));
  domains.push(make("doses","Doses","Registros com desfecho",`/hoje`,"recorded_period",
    owned(context.doseLogs,userId,personId).flatMap(log=>{
      const day=inWindow(log.data);
      if(!day||(!log.tomado_em&&!log.ignorado_em))return [];
      const title=safeText(medicationById.get(log.medicamento_id))||"Medicamento do registro";
      const description=log.tomado_em&&log.ignorado_em?"Registro com desfechos conflitantes; conferir":log.tomado_em?"Tomada registrada explicitamente":"Dose ignorada explicitamente";
      return [{key:`dose:${log.id||`${log.medicamento_id}:${day}:${log.horario||""}`}`,title,description,day,
        href:`/hoje?data=${encodeURIComponent(day)}&focus=doses&status=${log.tomado_em?"tomados":"ignorados"}` }];
    }),
    "Amostra apenas de registros confirmados/ignorados no intervalo. Falta de lançamento não equivale a dose perdida."));
  domains.push(make("health_records","Registros de saúde","Sintomas, humor e medidas",`${ROOT}/registros`,"recorded_period",
    owned(context.registrosSaude,userId,personId).flatMap(item=>{
      const day=inWindow(item.data);if(!day)return [];
      return [{key:`health:${item.id||`${day}:${item.tipo}:${item.nome}`}`,title:safeText(item.nome)||safeText(item.tipo)||"Registro de saúde",description:`Categoria registrada: ${safeText(item.categoria,35)||"não informada"}.`,day,href:localHref(`${ROOT}/registros/detalhes`,item.id)}];
    }),
    "Relatos e medidas são registros informados, não análise automática de sintomas nem diagnóstico."));
  domains.push(make("consultations","Consultas","Compromissos cadastrados",`${ROOT}/consultas`,"recorded_period",
    owned(context.consultas,userId,personId).flatMap(item=>{
      const day=inWindow(item.data);if(!day)return [];
      return [{key:`consultation:${item.id||`${day}:${item.especialidade}`}`,title:safeText(item.especialidade)||"Consulta cadastrada",description:`Estado registrado: ${item.status==="realizada"?"realizada":item.status==="cancelada"?"cancelada":"agendada"}.`,day,href:localHref(`${ROOT}/consultas/detalhes`,item.id)}];
    }),
    "Consulta agendada ou cancelada não equivale a atendimento realizado. Datas são as cadastradas."));
  domains.push(make("documents","Documentos","Cadastro no acervo de saúde",`${ROOT}/documentos`,"recorded_period",
    owned(context.documentos,userId,personId).flatMap(item=>{
      if(item.category_id!=="saude")return [];
      const day=inWindow(item.created_at);if(!day)return [];
      return [{key:`document:${item.id||`${day}:${item.title}`}`,title:safeText(item.title)||"Documento de saúde",description:"Data de cadastro no VAULT; não é a data do evento clínico.",day,href:localHref(`${ROOT}/documentos/detalhes`,item.id)}];
    }),
    "Apenas títulos e metadados dos documentos de saúde. Conteúdo e anexos permanecem fora da lente."));
  return {state:"ready",personId,periodDays,from,to:today,documentedDomains:domains.filter(d=>d.count>0).length,domains,
    note:"A Fênix representa cadastros e acontecimentos documentados. A aparência do Avatar não mede saúde; ausência de registro não indica ausência de cuidado. O Brain mantém interpretação independente e evidência própria."};
}
