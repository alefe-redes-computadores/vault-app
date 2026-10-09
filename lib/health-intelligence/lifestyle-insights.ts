import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import type { RegistroSaude } from "@/lib/types";

const MINUTE = 60_000, DAY = 86_400_000;
function day(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y,m,d] = value.split("-").map(Number), t = Date.UTC(y,m-1,d), date = new Date(t);
  return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d ? t : null;
}
function mean(values: number[]) { return values.reduce((a,b)=>a+b,0)/values.length; }
function rounded(value: number) { return Math.round(value); }
function instant(value?: string | null) {
  if (!value || !value.includes("T")) return null;
  const t = Date.parse(value); return Number.isFinite(t) ? t : null;
}
function duration(record: RegistroSaude): number | null {
  const value = record.duracao_minutos;
  return typeof value === "number" && Number.isFinite(value) && value>0 && value<=1440 ? value : null;
}
/** Descreve o histórico observado. Não usa limites clínicos nem ausência como zero. */
export function buildLifestyleInsights(context: HealthInsightContext): HealthInsight[] {
  const today = day(context.hoje || "");
  if (today===null || !context.personId) return [];
  const seen = new Set<string>();
  const records = context.registrosSaude.filter(r=> {
    const t=day(r.data);
    if(r.person_id!==context.personId || t===null || t>today || t<today-29*DAY) return false;
    const key=r.id || `${r.tipo}:${r.data}:${r.horario}:${r.valor_numerico}:${r.inicio_em}:${r.fim_em}`;
    if(seen.has(key)) return false; seen.add(key); return true;
  });
  const result: HealthInsight[]=[];
  const base = {
    kind:"pattern" as const, categoria:"historico" as const, urgencia:"baixa" as const,
    gravidadeSeguranca:"informativa" as const, entidadeTipo:"linha_cuidado", link:"/saude/minha-saude",
    periodoDias:30, acaoSegura:"Confira os registros na Linha de cuidado e continue registrando seu contexto.",
    limitacaoSeguranca:"Descreve apenas dados registrados. Não determina causa, diagnóstico, meta clínica ou necessidade de alterar tratamento.",
  };
  // Deduplica o intervalo consolidado de sono, mesmo se veio de relógio e anel.
  const sleepSeen=new Set<string>();
  const sleeps=records.filter(r=> {
    if(r.tipo!=="sono" || duration(r)===null) return false;
    const start=instant(r.inicio_em), end=instant(r.fim_em);
    if(start!==null || end!==null){
      if(start===null || end===null || end<=start || Math.abs((end-start)/MINUTE-duration(r)!)>1) return false;
      const key=`${start}:${end}`; if(sleepSeen.has(key)) return false; sleepSeen.add(key);
    }
    return true;
  });
  // Uma noite por dia: escolhe o maior intervalo, evitando somar cochilos sobrepostos.
  const nights=new Map<string,RegistroSaude>();
  for(const r of sleeps){const previous=nights.get(r.data);if(!previous || duration(r)!>duration(previous)!)nights.set(r.data,r);}
  const recent=[...nights.values()].filter(r=>day(r.data)!>=today-7*DAY && day(r.data)!<today);
  const previous=[...nights.values()].filter(r=>day(r.data)!>=today-14*DAY && day(r.data)!<today-7*DAY);
  if(recent.length>=3 && previous.length>=3){
    const a=mean(recent.map(r=>duration(r)!)),b=mean(previous.map(r=>duration(r)!));
    if(Math.abs(a-b)>=45)result.push({...base,id:"lifestyle-sono-tendencia",titulo:"A duração registrada do sono mudou",mensagem:`A média dos intervalos principais registrados passou de ${rounded(b)} para ${rounded(a)} minutos entre as duas semanas completas. Dias sem registro ficaram fora da comparação.`,
      confianca:recent.length>=5 && previous.length>=5?"media":"baixa",amostra:recent.length+previous.length,periodoDias:14,
      coberturaDias:{observados:recent.length+previous.length,total:14},fontesInternas:["Registros de sono"],
      evidencias:[`${previous.length} noites na semana anterior: ${rounded(b)} min em média`,`${recent.length} noites na semana recente: ${rounded(a)} min em média`,`Diferença observada: ${rounded(a-b)} min`],
      comparacao:{janelaAtual:"Últimos 7 dias completos",janelaAnterior:"7 dias completos anteriores",valorAtual:rounded(a),valorAnterior:rounded(b),variacaoPercentual:rounded((a-b)/b*100),tendencia:a>b?"aumento":"queda"}});
  }
  const doseSeen=new Set<string>();
  const doses=context.doseLogs.filter(d=> {
    if(d.person_id!==context.personId || !d.tomado_em || d.ignorado_em) return false;
    const key=d.id || `${d.medicamento_id}:${d.tomado_em}:${d.dose_kind}`;
    if(doseSeen.has(key))return false;doseSeen.add(key);return instant(d.tomado_em)!==null;
  }).map(d=>({dose:d,time:instant(d.tomado_em)!})).sort((a,b)=>a.time-b.time);
  const timesByMedication = new Map<string,number[]>();
  for(const entry of doses){const values=timesByMedication.get(entry.dose.medicamento_id)||[];values.push(entry.time);timesByMedication.set(entry.dose.medicamento_id,values);}
  for(const med of context.medicamentos){
    if(!med.id || med.person_id!==context.personId)continue;
    const times=timesByMedication.get(med.id);
    if(!times?.length)continue;
    const before:RegistroSaude[]=[], without:RegistroSaude[]=[];
    for(const sleep of nights.values()){
      const start=instant(sleep.inicio_em);
      if(start===null)continue;
      // Somente horário real: nunca substitui tomado_em pelo horário previsto.
      const matches=times.some(time=>time<=start && time>=start-6*60*MINUTE);
      (matches?before:without).push(sleep);
    }
    if(before.length<3 || without.length<3)continue;
    const a=mean(before.map(r=>duration(r)!)),b=mean(without.map(r=>duration(r)!));
    if(Math.abs(a-b)<45)continue;
    result.push({...base,id:`lifestyle-sono-dose-${med.id}`,titulo:`${med.nome}: contexto das tomadas e do sono`,
      mensagem:`Em ${before.length} noites com uma tomada registrada nas 6 horas anteriores ao início do sono, a duração média foi ${rounded(a)} min. Em ${without.length} noites sem uma tomada registrada nessa janela, foi ${rounded(b)} min. É uma comparação temporal; não confirma que o medicamento provocou a diferença.`,
      confianca:"baixa",amostra:before.length+without.length,entidadeTipo:"medicamento",entidadeId:med.id,
      relacoesContextuais:[{tipo:"medicamento",id:med.id}],fontesInternas:["Registros de sono com início e fim","Horários reais de tomadas","Medicamentos"],
      coberturaDias:{observados:before.length+without.length,total:30},
      evidencias:[`Janela descritiva: 6 horas antes do sono, sem limite clínico`,`${before.length} noites com tomada registrada: ${rounded(a)} min`,`${without.length} noites sem tomada registrada na janela: ${rounded(b)} min`,`Ausência de tomada registrada não confirma ausência de uso`],
      acaoSegura:"Confira os horários reais e compartilhe o histórico com o profissional responsável se desejar avaliar essa diferença."});
  }
  // Água e sintomas: compara dias com registros de ambos, sem estimar consumo total.
  const water=new Map<string,number>(),symptoms=new Map<string,number[]>();
  for(const r of records){
    if(r.tipo==="agua" && r.unidade_medida==="ml" && typeof r.valor_numerico==="number" && Number.isFinite(r.valor_numerico) && r.valor_numerico>0 && day(r.data)!<today)water.set(r.data,(water.get(r.data)||0)+r.valor_numerico);
    if(r.categoria==="sintoma" && typeof r.intensidade==="number" && Number.isFinite(r.intensidade) && r.intensidade>=0 && r.intensidade<=10){const v=symptoms.get(r.data)||[];v.push(r.intensidade);symptoms.set(r.data,v);}
  }
  const pairs=[...water].filter(([date])=>symptoms.has(date)).map(([date,ml])=>({date,ml,intensity:mean(symptoms.get(date)!)})).sort((a,b)=>a.ml-b.ml);
  if(pairs.length>=8){
    const split=Math.floor(pairs.length/2), low=pairs.slice(0,split),high=pairs.slice(split);
    const a=mean(low.map(x=>x.intensity)),b=mean(high.map(x=>x.intensity)),lo=mean(low.map(x=>x.ml)),hi=mean(high.map(x=>x.ml));
    if(hi-lo>=250 && Math.abs(a-b)>=1)result.push({...base,id:"lifestyle-agua-sintomas",titulo:"Água registrada e intensidade dos sintomas",mensagem:`Nos dias com menos água registrada, a intensidade média dos sintomas registrados foi ${a.toFixed(1)}/10; nos dias com mais água registrada, ${b.toFixed(1)}/10. Essa coincidência não mede hidratação real nem demonstra causa.`,confianca:"baixa",amostra:pairs.length,
      coberturaDias:{observados:pairs.length,total:30},fontesInternas:["Registros de água em ml","Intensidade dos sintomas"],
      evidencias:[`${low.length} dias: média de ${rounded(lo)} ml registrados`,`${high.length} dias: média de ${rounded(hi)} ml registrados`,`Somente dias completos com água e sintomas registrados; tipos diferentes de sintomas podem influenciar a comparação`]});
  }
  return result;
}
