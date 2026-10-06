import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
type Medication=HealthInsightContext["medicamentos"][number];
type Dose=HealthInsightContext["doseLogs"][number];
type Profile={substance:string;aliases:string[];minObservedDays:number;interruptionHours:number;source:NonNullable<HealthInsight["fontesExternas"]>[number];withdrawalLabel:string;escalationReview:boolean};

const FDA_BENZO={titulo:"Boxed Warning — benzodiazepínicos: dependência física e reações de retirada",autoridade:"U.S. Food and Drug Administration",url:"https://www.fda.gov/drugs/drug-safety-and-availability/fda-requiring-boxed-warning-updated-improve-safe-use-benzodiazepine-drug-class",revisadoEm:"2026-10-06"};
const DAILYMED_ZOLPIDEM={titulo:"Zolpidem — Dependence and withdrawal",autoridade:"FDA / National Library of Medicine — DailyMed",url:"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1584bad1-7bf4-4805-bdd9-7eb0fac92721",revisadoEm:"2026-10-06"};
const FDA_DESVENLAFAXINE={titulo:"Desvenlafaxina — Discontinuation Syndrome",autoridade:"U.S. Food and Drug Administration",url:"https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/204150s020lbl.pdf",revisadoEm:"2026-10-06"};

const PROFILES:Profile[]=[
 {substance:"clonazepam",aliases:["clonazepam","rivotril"],minObservedDays:7,interruptionHours:48,source:FDA_BENZO,withdrawalLabel:"benzodiazepínico",escalationReview:true},
 {substance:"zolpidem",aliases:["zolpidem"],minObservedDays:7,interruptionHours:48,source:DAILYMED_ZOLPIDEM,withdrawalLabel:"sedativo/hipnótico",escalationReview:true},
 {substance:"desvenlafaxina",aliases:["desvenlafaxina","pristiq"],minObservedDays:10,interruptionHours:48,source:FDA_DESVENLAFAXINE,withdrawalLabel:"SNRI",escalationReview:false},
];
const norm=(v?:string|null)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const at=(d:Dose)=>{const raw=d.tomado_em||(d.data?`${d.data}T${d.horario||"00:00"}`:"");if(!raw)return null;const x=new Date(raw);return Number.isNaN(x.getTime())?null:x};
const taken=(d:Dose)=>Boolean(d.tomado_em);
const qty=(d:Dose)=>typeof d.quantidade==="number"&&d.quantidade>0?d.quantidade:1;
const hours=(a:Date,b:Date)=>Math.abs(a.getTime()-b.getTime())/3_600_000;
const profileFor=(m:Medication)=>{const n=norm(m.nome);return PROFILES.find(p=>p.aliases.some(a=>n===a||n.startsWith(`${a} `)))||null};
const logsFor=(c:HealthInsightContext,id:string)=>c.doseLogs.filter(d=>d.person_id===c.personId&&d.medicamento_id===id&&taken(d)&&at(d)).sort((a,b)=>at(a)!.getTime()-at(b)!.getTime());
const observedDays=(logs:Dose[],from:Date,to:Date)=>new Set(logs.filter(d=>{const t=at(d)!;return t>=from&&t<=to}).map(d=>d.data||at(d)!.toISOString().slice(0,10))).size;
const windowLogs=(logs:Dose[],now:Date,fromDays:number,toDays=0)=>{const from=new Date(now.getTime()-fromDays*86400000),to=new Date(now.getTime()-toDays*86400000);return logs.filter(d=>{const t=at(d)!;return t>=from&&t<to})};

function interruption(c:HealthInsightContext,m:Medication,p:Profile,now:Date):HealthInsight|null{
 if(!m.id||m.status==="descontinuado"||m.tipo_uso==="sos"||m.tipo_uso==="esporadico")return null;
 const logs=logsFor(c,m.id);if(!logs.length)return null;const last=at(logs.at(-1)!)!,gap=hours(last,now);if(gap<p.interruptionHours)return null;
 const days=observedDays(logs,new Date(last.getTime()-21*86400000),last);if(days<p.minObservedDays)return null;
 // Anti-falso-positivo: ausência só é interpretada se o diário continuou ativo.
 const otherAfter=c.doseLogs.filter(d=>d.person_id===c.personId&&d.medicamento_id!==m.id&&taken(d)&&at(d)&&at(d)!>last&&at(d)!<=now);
 if(otherAfter.length<2)return null;
 const gapDays=Math.max(2,Math.floor(gap/24));
 return {id:`longitudinal-interruption-${p.substance}-${m.id}`,kind:"alert",categoria:"rotina",titulo:`${m.nome}: interrupção do padrão merece revisão`,
 mensagem:`O Vault observou uso recorrente antes do último registro e agora há cerca de ${gapDays} dia(s) sem tomada registrada, enquanto outros registros continuaram. Para ${p.withdrawalLabel}, a fonte regulatória descreve risco após interrupção abrupta ou redução rápida. Isto não confirma abstinência nem prova que o medicamento foi interrompido.`,
 urgencia:p.substance==="clonazepam"?"alta":"media",gravidadeSeguranca:p.substance==="clonazepam"?"importante":"atencao",confianca:"media",amostra:logs.length,periodoDias:21,entidadeTipo:"medicamento",entidadeId:m.id,link:`/saude/medicamentos/historico?id=${m.id}`,
 evidencias:[`${days} dia(s) com tomada registrada antes da lacuna`,`Última tomada registrada há aproximadamente ${gapDays} dia(s)`,`${otherAfter.length} registro(s) de outros medicamentos após a última tomada`],
 fontesInternas:["Histórico de doses","Rotina do medicamento","Continuidade de registros no Vault"],fontesExternas:[p.source],
 acaoSegura:"Não reinicie, interrompa, compense ou altere a dose por conta própria. Confira se faltou registrar alguma tomada e, se a interrupção foi real, procure orientação do prescritor ou farmacêutico. Sintomas graves, convulsão, confusão intensa ou piora rápida exigem avaliação urgente.",
 limitacaoSeguranca:"O Vault observa registros, não ingestão fora do aplicativo. Este sinal não diagnostica abstinência, dependência física, vício ou recaída e não define esquema de desmame."};
}
function escalation(c:HealthInsightContext,m:Medication,p:Profile,now:Date):HealthInsight|null{
 if(!p.escalationReview||!m.id||m.status==="descontinuado")return null;
 const logs=logsFor(c,m.id),recent=windowLogs(logs,now,7),baseline=windowLogs(logs,now,28,7);if(recent.length<4||baseline.length<6)return null;
 const recentPerDay=recent.length/7,basePerDay=baseline.length/21,recentQty=recent.reduce((s,d)=>s+qty(d),0)/7,baseQty=baseline.reduce((s,d)=>s+qty(d),0)/21;
 const frequencyRatio=basePerDay>0?recentPerDay/basePerDay:1,quantityRatio=baseQty>0?recentQty/baseQty:1,unplanned=recent.filter(d=>d.dose_kind==="sos"||d.dose_kind==="extra").length;
 const ratio=Math.max(frequencyRatio,quantityRatio);if(!(ratio>=1.5&&(unplanned>0||recent.length>=7)))return null;
 return {id:`longitudinal-escalation-${p.substance}-${m.id}`,kind:"pattern",categoria:"rotina",titulo:`${m.nome}: padrão recente aumentou em relação ao próprio histórico`,
 mensagem:`Nos últimos 7 dias, frequência/quantidade registrada ficou cerca de ${ratio.toFixed(1)}× o ritmo das 3 semanas anteriores. Para este medicamento, aumento sustentado merece revisão clínica. O padrão isolado não demonstra tolerância, dependência ou uso inadequado.`,
 urgencia:ratio>=2?"alta":"media",gravidadeSeguranca:ratio>=2?"importante":"atencao",confianca:baseline.length>=10?"alta":"media",amostra:recent.length+baseline.length,periodoDias:28,entidadeTipo:"medicamento",entidadeId:m.id,link:`/saude/medicamentos/historico?id=${m.id}`,
 evidencias:[`${recent.length} tomada(s) nos últimos 7 dias`,`${baseline.length} tomada(s) na janela anterior de 21 dias`,`${unplanned} dose(s) SOS/extra na janela recente`,`Mudança relativa: ${ratio.toFixed(1)}×`],
 fontesInternas:["Histórico de doses","Doses SOS/extra","Baseline longitudinal da própria pessoa"],fontesExternas:[p.source],
 acaoSegura:"Revise os registros e converse com o prescritor antes de aumentar, reduzir ou interromper a medicação. O Vault não recomenda ajuste de dose.",
 limitacaoSeguranca:"Mudança de frequência ou quantidade pode ter várias explicações. Este padrão é sinal para revisão, não diagnóstico de tolerância, dependência física ou transtorno por uso de substância."};
}
export function buildMedicationLongitudinalRiskInsights(c:HealthInsightContext,now:Date):HealthInsight[]{
 const out:HealthInsight[]=[];for(const m of c.medicamentos.filter(x=>x.person_id===c.personId)){const p=profileFor(m);if(!p)continue;const a=interruption(c,m,p,now),b=escalation(c,m,p,now);if(a)out.push(a);if(b)out.push(b)}return out;
}
