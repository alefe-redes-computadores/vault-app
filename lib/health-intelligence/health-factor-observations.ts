import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import { buildHealthFactorTrend } from "@/lib/health-intelligence/health-factor-trends";
/** V228: two fully documented weeks, never fill missing symptom days with zeros. */
export function buildSymptomTrendObservations(context:HealthInsightContext):HealthInsight[]{
 const records=context.registrosSaude;
 // userId is explicit in the canonical context but optional on historical inputs.
 if(!context.userId||!context.personId)return [];
 const trend=buildHealthFactorTrend({records,userId:context.userId,personId:context.personId,today:context.hoje||"",days:14,factor:"sintoma"});
 if(trend.days.length!==14)return [];
 const older=trend.days.slice(0,7).filter(x=>x.value!==null),recent=trend.days.slice(7).filter(x=>x.value!==null);
 if(older.length<3||recent.length<3)return [];
 const avg=(rows:typeof older)=>rows.reduce((sum,r)=>sum+(r.value??0),0)/rows.length;
 const a=avg(recent),b=avg(older),difference=a-b;
 if(Math.abs(difference)<1.5)return [];
 const direction=difference>0?"maior":"menor";
 return [{
  id:"v228-sintomas-duas-semanas",kind:"observation",categoria:"historico",titulo:"Intensidade dos sintomas registrados mudou",
  mensagem:`Nos dias documentados da última semana, a intensidade média foi ${a.toFixed(1)}/10, ${direction} do que os ${b.toFixed(1)}/10 da semana anterior. Apenas dias com sintomas registrados entraram na comparação.`,
  urgencia:"baixa",confianca:older.length>=5&&recent.length>=5?"media":"baixa",amostra:trend.samples,periodoDias:14,
  gravidadeSeguranca:"informativa",entidadeTipo:"linha_cuidado",link:"/saude/minha-saude",
  coberturaDias:{observados:older.length+recent.length,total:14},
  fontesInternas:["Diário de sintomas"],
  evidencias:[`Semana anterior: ${older.length} dias documentados, média ${b.toFixed(1)}/10`,`Semana recente: ${recent.length} dias documentados, média ${a.toFixed(1)}/10`,`Diferença entre dias registrados: ${difference>0?"+":""}${difference.toFixed(1)} ponto(s)`],
  acaoSegura:"Compare seus relatos na Minha saúde e leve o histórico à consulta se julgar útil.",
  limitacaoSeguranca:"Mistura tipos de sintomas registrados; não representa a intensidade de um sintoma específico, não avalia piora clínica, não diagnostica nem sugere alterar tratamentos.",
 }];
}
