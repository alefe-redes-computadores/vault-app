import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import type { DoseLog } from "@/lib/types";

// VAULT_BEHAVIOR_V101: duas semanas completas, apenas eventos explícitos da pessoa.
// Ausência de registro nunca significa dose perdida; SOS/extra não vira dose programada.
function civil(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y,m,d] = value.split("-").map(Number), date = new Date(y,m-1,d);
  return date.getFullYear() === y && date.getMonth() === m-1 && date.getDate() === d ? date : null;
}
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function shift(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate()+days); return iso(d); }
function median(values: number[]) { const s=[...values].sort((a,b)=>a-b), n=s.length; return n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2; }
function delay(log: DoseLog): number | null {
  if (!log.tomado_em || log.ignorado_em || !civil(log.data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(log.horario)) return null;
  const actual=new Date(log.tomado_em), scheduled=new Date(`${log.data}T${log.horario}:00`);
  const minutes=(actual.getTime()-scheduled.getTime())/60000;
  // Registros com desvios acima de um dia não sustentam inferência de horário.
  return Number.isFinite(minutes) && Math.abs(minutes)<=1440 ? minutes : null;
}
export function buildBehaviorInsights(context: HealthInsightContext): HealthInsight[] {
  const today=civil(context.hoje || iso(new Date()));
  if (!today || !context.personId) return [];
  const end=iso(today), middle=shift(today,-7), start=shift(today,-14);
  const grouped=new Map<string,DoseLog[]>(), seen=new Set<string>();
  for (const log of context.doseLogs) {
    if (log.person_id!==context.personId || !civil(log.data) || log.data<start || log.data>=end) continue;
    const key=log.id ? `id:${log.id}` : `event:${log.medicamento_id}:${log.data}:${log.horario}:${log.tomado_em||log.ignorado_em||""}:${log.dose_kind||""}`;
    if (seen.has(key)) continue; seen.add(key);
    const rows=grouped.get(log.medicamento_id)||[]; rows.push(log); grouped.set(log.medicamento_id,rows);
  }
  const result:HealthInsight[]=[];
  for (const med of context.medicamentos) {
    if (!med.id || med.person_id!==context.personId || med.status==="descontinuado") continue;
    const rows=grouped.get(med.id)||[], previous=rows.filter(x=>x.data<middle), current=rows.filter(x=>x.data>=middle);
    const scheduled=(x:DoseLog)=>x.dose_kind==="scheduled" || (!x.dose_kind && med.tipo_uso==="continuo");
    const previousDelays=previous.filter(scheduled).map(delay).filter((x):x is number=>x!==null);
    const currentDelays=current.filter(scheduled).map(delay).filter((x):x is number=>x!==null);
    const days=(items:DoseLog[])=>new Set(items.map(x=>x.data)).size;
    const add=(phenomenon:string,title:string,message:string,old:number,value:number,sample:number,coverage:number,unit:string,attention:boolean)=> {
      result.push({ id:`comportamento-v101-${phenomenon}-${med.id}`, kind:"pattern", categoria:"rotina",
        titulo:`${med.nome}: ${title}`, mensagem:message, urgencia:attention?"media":"baixa",
        gravidadeSeguranca:attention?"atencao":"informativa", confianca:sample>=20 && coverage>=10?"alta":"media",
        amostra:sample, periodoDias:14, entidadeTipo:"medicamento", entidadeId:med.id,
        link:`/saude/medicamentos/historico?id=${encodeURIComponent(med.id!)}`,
        evidencias:[`${start} a ${shift(today,-8)}: ${old} ${unit}`,`${middle} a ${shift(today,-1)}: ${value} ${unit}`],
        fontesInternas:["Medicamentos","Registros de doses"], coberturaDias:{observados:coverage,total:14},
        comparacao:{janelaAtual:"Últimos 7 dias completos",janelaAnterior:"7 dias completos anteriores",valorAtual:value,valorAnterior:old,
          variacaoPercentual:phenomenon==="horario" || old===0?null:Math.round((value-old)/old*100),tendencia:value>old?"aumento":value<old?"queda":"estavel"},
        acaoSegura:"Confira os registros e leve esta mudança ao profissional responsável se ela persistir. Mantenha a prescrição vigente.",
        limitacaoSeguranca:"Compara somente registros explícitos em duas semanas completas. Não confirma doses sem registro, não determina causa e não indica alteração de dose." });
    };
    const timedPrevious=previous.filter(x=>scheduled(x)&&delay(x)!==null), timedCurrent=current.filter(x=>scheduled(x)&&delay(x)!==null);
    if (previousDelays.length>=5 && currentDelays.length>=5 && days(timedPrevious)>=3 && days(timedCurrent)>=3) {
      const old=Math.round(median(previousDelays)), value=Math.round(median(currentDelays)), delta=value-old;
      if (Math.abs(delta)>=45) add("horario",delta>0?"as tomadas ficaram mais tarde em relação ao planejado":"as tomadas ficaram mais cedo em relação ao planejado",
        `O desvio mediano em relação ao horário programado passou de ${old} para ${value} minutos. A diferença foi de ${Math.abs(delta)} minutos entre as semanas registradas.`,old,value,previousDelays.length+currentDelays.length,days([...timedPrevious,...timedCurrent]),"minutos de desvio mediano",true);
    }
    const resolved=(x:DoseLog)=>scheduled(x) && Boolean(x.tomado_em)!==Boolean(x.ignorado_em);
    const a=previous.filter(resolved),b=current.filter(resolved);
    if (a.length>=5 && b.length>=5 && days(a)>=3 && days(b)>=3) {
      const old=Math.round(a.filter(x=>x.ignorado_em).length/a.length*100), value=Math.round(b.filter(x=>x.ignorado_em).length/b.length*100);
      if (Math.abs(value-old)>=25) add("ignoradas",value>old?"mais doses foram marcadas como ignoradas":"menos doses foram marcadas como ignoradas",
        `Entre as doses com decisão registrada, a proporção marcada como ignorada passou de ${old}% para ${value}%. Doses sem decisão não entram nesta conta.`,old,value,a.length+b.length,days([...a,...b]),"% de decisões marcadas como ignoradas",value>old);
    }
    const extras=(items:DoseLog[])=>items.filter(x=>x.dose_kind==="extra" && x.tomado_em && !x.ignorado_em);
    const ea=extras(previous),eb=extras(current);
    if (ea.length>=3 && eb.length>=5 && days(ea)>=2 && days(eb)>=3 && eb.length>=ea.length*1.5) {
      add("extras","a frequência de doses extras aumentou",`Foram registradas ${eb.length} doses extras na semana recente e ${ea.length} na anterior. A comparação conta eventos, sem somar quantidades ou misturar a rotina programada.`,ea.length,eb.length,ea.length+eb.length,days([...ea,...eb]),"eventos de dose extra",true);
    }
  }
  return result;
}
