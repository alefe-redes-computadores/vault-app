import type { HealthInsight } from "@/lib/health-insights";
import type { MedicationCareOpportunity } from "@/lib/health-intelligence/medication-care-opportunities";

export type HealthSignalPhenomenon = "continuity"|"stock"|"renewal"|"adherence"|"timing"|"sos"|"interaction"|"regulatory"|"identity"|"supply"|"other";
const norm=(value:unknown)=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

export function healthSignalPhenomenon(insight:HealthInsight):HealthSignalPhenomenon{
  if(insight.id.startsWith("fornecimento-"))return "supply";
  // Structured category is more reliable than user-facing prose.
  const category=norm(insight.categoria);
  if(category === "estoque")return "stock";
  if(category === "receita" || category === "renovacao")return "renewal";
  if(category === "fornecimento" || category === "retirada")return "supply";
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

function insightMatchesMedication(insight: HealthInsight, opportunity: MedicationCareOpportunity): boolean {
  const id = opportunity.medicamentoId;
  if (!id) return false;
  // Never infer a medical entity from a name found inside a generated explanation.
  if (insight.entidadeTipo && insight.entidadeTipo !== "medicamento" &&
      !insight.relacoesContextuais?.some(link => link.tipo === "medicamento" && link.id === id)) return false;
  return insight.entidadeId === id || insight.entidadeIds?.includes(id) === true ||
    insight.relacoesContextuais?.some(link => link.tipo === "medicamento" && link.id === id) === true;
}

function carePhenomena(opportunity: MedicationCareOpportunity): Set<HealthSignalPhenomenon> {
  switch (opportunity.careStage) {
    case "acquisition_needed":
    case "stock_review": return new Set(["stock"]);
    case "prescription_needed": return new Set(["renewal", "regulatory"]);
    case "withdrawal_overdue":
    case "withdrawal_planned": return new Set(["supply"]);
    case "acquisition_planned": return new Set(["stock"]);
    default: return new Set();
  }
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
