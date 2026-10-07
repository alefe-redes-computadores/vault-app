import type { HealthInsight } from "@/lib/health-insights";
import type { MedicationCareOpportunity } from "@/lib/health-intelligence/medication-care-opportunities";

export type HealthSignalPhenomenon = "continuity"|"stock"|"renewal"|"adherence"|"timing"|"sos"|"interaction"|"regulatory"|"identity"|"other";
const norm=(value:unknown)=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

export function healthSignalPhenomenon(insight:HealthInsight):HealthSignalPhenomenon{
  const text=norm([insight.id,insight.categoria,insight.titulo,insight.mensagem,...(insight.evidencias||[])].join(" "));
  if(/interacao|seroton|sobreposi|combinacao|depressores/.test(text))return "interaction";
  if(/sos|resgate|extra/.test(text))return "sos";
  if(/regulator|receita (amarela|azul|branca)|notificacao|controle especial/.test(text))return "regulatory";
  if(/identidade|principio ativo|nome|catalogo|apresentacao/.test(text))return "identity";
  if(/estoque|dose[s]? restante|sem estoque/.test(text))return "stock";
  if(/renov|receita venc|prescri/.test(text))return "renewal";
  if(/interrup|continuidade|descontinu|tratamento/.test(text))return "continuity";
  if(/horario|atras/.test(text))return "timing";
  if(/adesao|rotina|tomad/.test(text))return "adherence";
  return "other";
}

function insightMatchesMedication(insight:HealthInsight,opportunity:MedicationCareOpportunity):boolean{
  if(insight.entidadeId&&insight.entidadeId===opportunity.medicamentoId)return true;
  if(insight.entidadeIds?.includes(opportunity.medicamentoId))return true;
  const medicationName=norm(opportunity.medicamentoNome); if(!medicationName)return false;
  const insightText=norm([insight.titulo,insight.mensagem,...(insight.evidencias||[])].join(" "));
  return insightText.includes(medicationName);
}

function carePhenomena(opportunity:MedicationCareOpportunity):Set<HealthSignalPhenomenon>{
  const result=new Set<HealthSignalPhenomenon>(["continuity"]);
  if(opportunity.stockDays!==null||opportunity.dosesRemaining!==null||norm(opportunity.title).includes("estoque"))result.add("stock");
  if(opportunity.renewalCount===0||/renov|receita/.test(norm(`${opportunity.title} ${opportunity.message}`)))result.add("renewal");
  return result;
}

// VAULT_INTELLIGENCE_ORCHESTRATION_V96
// Home não repete o MESMO fenômeno da MESMA medicação entre Atenção e Intelligence.
export function suppressOperationalOverlap(insights:HealthInsight[],opportunities:MedicationCareOpportunity[]):HealthInsight[]{
  return insights.filter(insight=>{
    const phenomenon=healthSignalPhenomenon(insight);
    return !opportunities.some(opportunity=>insightMatchesMedication(insight,opportunity)&&carePhenomena(opportunity).has(phenomenon));
  });
}

export function healthSignalSemanticKey(insight:HealthInsight):string{
  const entity=insight.entidadeId||insight.entidadeIds?.[0]||insight.entidadeTipo||"global";
  return [norm(entity),healthSignalPhenomenon(insight),norm(insight.categoria)].join(":");
}
