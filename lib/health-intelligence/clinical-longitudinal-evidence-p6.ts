import {classifyDoseRealization} from '../dose-slot-authority';
/** CI360 P6 — observações factuais, somente leitura, sem causalidade ou adesão inferida. */
import type { Consulta,DoseLog,Medicamento,RegistroSaude,Retirada,Renovacao } from "@/lib/types";

type Owner={user_id:string;person_id:string};
export type ClinicalLongitudinalInputP6 = {
 owner:Owner; today:string; days:number;
 doses:readonly DoseLog[]; symptoms:readonly RegistroSaude[];
 consultations:readonly Consulta[];medications:readonly Medicamento[];
 withdrawals:readonly Retirada[];acquisitions:readonly Renovacao[];
};
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const day=(v?:string|null)=>String(v??'').slice(0,10);
const valid=(v:string)=>DAY.test(v) && !Number.isNaN(Date.parse(v+'T12:00:00Z'));
export function clinicalLongitudinalEvidenceP6(input:ClinicalLongitudinalInputP6) {
  const {owner,today}=input;
  const n=Math.max(1,Math.min(365,Math.trunc(Number.isFinite(input.days)?input.days:30)));
  if(!owner.user_id||!owner.person_id||!valid(today))return {scoped:false,periodDays:n,start:null,end:today,taken:0,ignored:0,extra:0,observations:0,consultations:0,withdrawalsCompleted:0,acquisitions:0,medications:0,missingLogState:'unknown' as const,provenance:[] as string[],limitations:['Titular ou data de referência não identificado.']};
  const startDate=new Date(today+'T12:00:00Z');startDate.setUTCDate(startDate.getUTCDate()-(n-1));const start=startDate.toISOString().slice(0,10);
  const inRange=(v?:string|null)=>valid(day(v))&&day(v)>=start&&day(v)<=today;
  const owned=(x:{user_id?:string|null;person_id?:string|null})=>x.user_id===owner.user_id&&x.person_id===owner.person_id;
  const doses=input.doses.filter(x=>owned(x)&&inRange(x.data));
  const taken=doses.filter(x=>classifyDoseRealization(x).state==='taken');
  const ignored=doses.filter(x=>classifyDoseRealization(x).state==='ignored');
  const extra=taken.filter(x=>x.dose_kind==='sos'||x.dose_kind==='extra');
  const observations=input.symptoms.filter(x=>owned(x)&&inRange(x.data));
  const consultations=input.consultations.filter(x=>owned(x)&&inRange(x.data));
  const withdrawalsCompleted=input.withdrawals.filter(x=>owned(x)&&inRange(x.realizada_em||x.data)&&
     (x.status==='realizada'||Boolean(x.realizada_em||x.renovacao_realizada_id)) && x.status!=='cancelada' && x.status!=='nao_realizada');
  const acquisitions=input.acquisitions.filter(x=>owned(x)&&inRange(x.data_aquisicao||x.data)&&Boolean(x.tipo_aquisicao));
  const medications=input.medications.filter(owned);
  const provenance=['DoseLog: confirmações explícitas', 'RegistroSaude: observações declaradas', 'Consulta: status cadastrado', 'Retirada: conclusão explicitamente registrada', 'Renovacao: aquisição cadastrada'];
  const limitations=['Sem registro não significa dose não tomada ou tratamento interrompido.',
    'Comparação descritiva: não atribui causalidade, diagnóstico ou risco individual.',
    'Não é possível calcular doses sem registro sem agenda exata e completa.',
    'Somente eventos do titular e dentro da janela declarada.'];
  return {scoped:true,periodDays:n,start,end:today,taken:taken.length,ignored:ignored.length,extra:extra.length,observations:observations.length,consultations:consultations.length,withdrawalsCompleted:withdrawalsCompleted.length,acquisitions:acquisitions.length,medications:medications.length,missingLogState:'unknown' as const,provenance,limitations};
}
export function temporaryCourseWindowP6(input:{start?:string|null;end?:string|null;today:string}) {
  const start=day(input.start),end=day(input.end),today=day(input.today);
  if(!valid(today)||!valid(start)||!valid(end)||end<start)return {state:'unknown' as const,reason:'Janela do curso sem datas completas e consistentes.'};
  return today<start?{state:'future' as const,reason:'Início programado; dose não confirmada.'}:
    today>end?{state:'after_window' as const,reason:'Janela programada encerrada; histórico e prescrição preservados.'}:
    {state:'in_window' as const,reason:'Dentro da janela programada; não comprova tomada.'};
}
export function clinicalEvidenceCompletenessP6(input:{records:number;scheduledSlots?:number|null}) {
  if(!Number.isFinite(input.scheduledSlots)||input.scheduledSlots==null||input.scheduledSlots<0)return {known:false,missing:null,meaning:'Agenda incompleta: doses sem registro não estimáveis.'};
  const count=Math.max(0,Math.floor(input.scheduledSlots));
  return {known:true,missing:Math.max(0,count-Math.max(0,Math.floor(input.records))),meaning:'Lacuna de registros; não significa dose ignorada.'};
}
