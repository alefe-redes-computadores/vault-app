import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";
import { historyRangeStart, validDay, validInstant, type HistoricalDose, type Scope } from "../dose-premium/center-view";
import { civilDoseInstant } from "../dose-premium/review-intent";
import { observedStockContext, observedStockConversion, type ScopedStockRow } from "../dose-premium/stock-context";
import { readStockEvidence } from "../dose-premium/stock-evidence";
import { readDoseUnit } from "../dose-premium/historical-unit";

/**
 * V226 — leitura dos atos explicitamente registrados, não da adesão presumida.
 * Ignorar é uma decisão clínica anotada; uma ausência de DoseLog não é dose ignorada.
 * SOS, extra e planejadas não pertencem ao denominador de doses programadas.
 */
type RecordedOutcome = "taken" | "ignored";
type ScheduledRecord = HealthInsightContext["doseLogs"][number];

const DAY = 86_400_000;
const MIN_DECISIONS = 6;
const MIN_DAYS = 4;
const MIN_IGNORED = 3;
const MIN_IGNORED_DAYS = 3;

function localDateKey(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return value;
}

function noon(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getTime();
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function daypart(time: string): "manha" | "tarde" | "noite" {
  const hour = Number(time.slice(0, 2));
  return hour >= 5 && hour < 12 ? "manha" : hour >= 12 && hour < 18 ? "tarde" : "noite";
}

function resolveOutcome(records: ScheduledRecord[]): RecordedOutcome | null {
  // Duplicidade legada contraditória não vira evidência de adesão nem de omissão.
  const taken = records.some((item) => Boolean(item.tomado_em));
  const ignored = records.some((item) => Boolean(item.ignorado_em));
  if (taken === ignored) return null;
  return taken ? "taken" : "ignored";
}

export function buildRecordedDoseRoutineInsights(context: HealthInsightContext): HealthInsight[] {
  const today = localDateKey(context.hoje);
  if (!today || !context.personId?.trim()) return [];
  const todayNoon = noon(today);
  // Quem possui o medicamento é a referência do proprietário. Sem vínculo verificável,
  // não cruzar contas que eventualmente tenham importado um ID semelhante.
  const ownerId = context.medicamentos.find((med) => med.person_id === context.personId && med.user_id)?.user_id;
  if (!ownerId) return [];
  const knownIds = new Set(context.medicamentos.filter((med) => med.person_id === context.personId && med.user_id === ownerId && Boolean(med.id)).map((med) => med.id));
  const slots = new Map<string, ScheduledRecord[]>();
  for (const log of context.doseLogs) {
    if (log.person_id !== context.personId || log.user_id !== ownerId || !knownIds.has(log.medicamento_id)) continue;
    if (log.dose_kind === "sos" || log.dose_kind === "extra" || log.dose_kind === "planned") continue;
    const day = localDateKey(log.data);
    const time = normalizeTime(log.horario);
    if (!day || !time) continue;
    const age = Math.round((todayNoon - noon(day)) / DAY);
    if (age < 0 || age >= 14) continue;
    const key = `${log.medicamento_id}|${day}|${time}`;
    const group = slots.get(key) || [];
    group.push(log);
    slots.set(key, group);
  }

  const byPart = new Map<ReturnType<typeof daypart>, {taken: number; ignored: number; days: Set<string>; ignoredDays: Set<string>}>();
  for (const [key, records] of slots) {
    const status = resolveOutcome(records);
    if (!status) continue;
    const [, day, time] = key.split("|");
    const part = daypart(time);
    const tally = byPart.get(part) || {taken: 0, ignored: 0, days: new Set<string>(), ignoredDays: new Set<string>()};
    tally[status] += 1;
    tally.days.add(day);
    if (status === "ignored") tally.ignoredDays.add(day);
    byPart.set(part, tally);
  }

  const labels = {manha: "manhã", tarde: "tarde", noite: "noite"};
  const observations: HealthInsight[] = [];
  for (const part of ["manha", "tarde", "noite"] as const) {
    const item = byPart.get(part);
    if (!item) continue;
    const total = item.taken + item.ignored;
    if (total < MIN_DECISIONS || item.days.size < MIN_DAYS || item.ignored < MIN_IGNORED || item.ignoredDays.size < MIN_IGNORED_DAYS) continue;
    observations.push({
      id: `v226-dose-ignored-${part}`,
      kind: "pattern",
      categoria: "rotina",
      titulo: `Doses registradas como ignoradas à ${labels[part]}`,
      mensagem: `Nos últimos 14 dias, ${item.ignored} de ${total} decisões registradas para doses programadas neste período do dia foram marcadas como ignoradas, em ${item.ignoredDays.size} dias distintos. Dias sem registro não foram contados.`,
      urgencia: "baixa",
      confianca: item.days.size >= 7 && total >= 12 ? "alta" : "media",
      amostra: total,
      periodoDias: 14,
      entidadeTipo: "linha_cuidado",
      link: "/saude/registros",
      evidencias: [`${item.taken} tomadas confirmadas`, `${item.ignored} ignoradas explicitamente`, `${item.days.size} dias com decisão registrada`, `${item.ignoredDays.size} dias distintos com registro de ignorada`],
      fontesInternas: ["DoseLogs explícitos", "Cadastro de medicamentos"],
      coberturaDias: {observados: item.days.size, total: 14},
      acaoSegura: "Revise seus horários e anotações com o profissional responsável. Não altere a dose por conta própria.",
      limitacaoSeguranca: "Não estima doses previstas, adesão ou risco clínico: usa somente ações registradas, sem SOS/extra nem dados de outros perfis.",
    });
  }
  return observations;
}

/** Observational projection for the existing Brain, using declared instants and
 * explicit programmed facts only. Current local timezone is the comparison basis;
 * ambiguous/nonexistent civil times are excluded, never guessed. */
export function summarizeRecordedDoseTiming(input:{scope:Scope;today:string;asOf:string;logs:readonly HistoricalDose[];medicationIds:readonly string[];range?:30|7|90}){
  const {scope,today,asOf}=input,range=input.range??30;
  const start=validDay(today)?historyRangeStart(today,range):null;
  const blank={start,end:today,sample:0,denominator:0,meanAbsoluteMinutes:null as number|null,meanEarlyMinutes:null as number|null,meanLateMinutes:null as number|null,earlyCount:0,lateCount:0,source:'DoseLogs explícitos · Brain'};
  if(!scope.user_id||!scope.person_id||!start||!validInstant(asOf))return blank;
  const ids=new Set(input.medicationIds),slots=new Map<string,HistoricalDose[]>(),counts=new Map<string,number>();
  for(const row of input.logs){if(row.user_id!==scope.user_id||row.person_id!==scope.person_id||!ids.has(row.medicamento_id)||!validDay(row.data)||row.data<start||row.data>today||!['scheduled','planned'].includes(row.dose_kind??''))continue;
    if(row.id)counts.set(row.id,(counts.get(row.id)??0)+1);
    const hour=typeof row.horario==='string'?row.horario.slice(0,5):'',key=JSON.stringify([row.medicamento_id,row.data,hour]);
    const group=slots.get(key)??[];group.push(row);slots.set(key,group);
  }
  let denominator=0,absolute=0,early=0,late=0,earlyCount=0,lateCount=0,sample=0;const days=new Set<string>();
  for(const rows of slots.values()){
    denominator+=rows.filter(row=>Boolean(row.tomado_em)).length;
    if(rows.length!==1)continue;const row=rows[0];
    if(!row.id||counts.get(row.id)!==1||!validInstant(row.tomado_em)||row.ignorado_em||Date.parse(row.tomado_em)>Date.parse(asOf))continue;
    try{const planned=civilDoseInstant(row.data,row.horario.slice(0,5),asOf),minutes=(Date.parse(row.tomado_em)-Date.parse(planned))/60000;
      if(!Number.isFinite(minutes)||Math.abs(minutes)>1440)continue;
      sample++;days.add(row.data);absolute+=Math.abs(minutes);if(minutes<0){earlyCount++;early-=minutes;}else if(minutes>0){lateCount++;late+=minutes;}
    }catch{/* no reliable local planned instant */}
  }
  // Descriptive, not a clinical inference. Do not promote one isolated event.
  const sufficient=sample>=3&&days.size>=2;
  const round=(v:number)=>Math.round(v*10)/10;
  return {...blank,sample,denominator,meanAbsoluteMinutes:sufficient?round(absolute/sample):null,meanEarlyMinutes:sufficient&&earlyCount?round(early/earlyCount):null,meanLateMinutes:sufficient&&lateCount?round(late/lateCount):null,earlyCount,lateCount};
}

/** Descriptive estimate of inventory coverage, not a dose schedule or instruction.
 * Only recorded debits in the active count cycle, in their original stock unit.
 * Require seven complete local days with direct evidence; missing/ambiguous days
 * are not zero consumption. No recalculation of historical receipts. */
export type RecordedStockCoverage={medicationId:string;name:string;start:string;end:string;sample:number;observedDays:number;estimatedDays:number;source:string};
export function summarizeRecordedStockCoverage(input:{scope:Scope;today:string;asOf:string;logs:readonly (HistoricalDose&{estoque_movimento?:unknown})[];medications:readonly (ScopedStockRow&{nome:string})[]}):RecordedStockCoverage[]{
 const {scope,today,asOf}=input;
 if(!scope.user_id||!scope.person_id||!validDay(today)||!validInstant(asOf))return [];
 const civil=(instant:string)=>{const d=new Date(instant);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 if(civil(asOf)!==today)return [];
 const yesterday=new Date(today+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1);const end=yesterday.toISOString().slice(0,10),start=historyRangeStart(end,7);
 const inRange=(day:string)=>day>=start&&day<=end;
 const byMed=new Map<string,typeof input.logs[number][]>();
 for(const row of input.logs){if(row.user_id!==scope.user_id||row.person_id!==scope.person_id)continue;const rows=byMed.get(row.medicamento_id)??[];rows.push(row);byMed.set(row.medicamento_id,rows);}
 const medicationCounts=new Map<string,number>();for(const m of input.medications)if(m.id&&m.user_id===scope.user_id&&m.person_id===scope.person_id)medicationCounts.set(m.id,(medicationCounts.get(m.id)??0)+1);
 const output:RecordedStockCoverage[]=[];
 for(const medication of input.medications){if(!medication.id||medication.user_id!==scope.user_id||medication.person_id!==scope.person_id||medicationCounts.get(medication.id)!==1)continue;
  const stock=observedStockContext(medication,{...scope,medicationId:medication.id});
  if(!stock.basis||!stock.unit||stock.balance===null||stock.balance<0)continue;
  let sum=0,sample=0,invalid=false;const days=new Set<string>(),ids=new Set<string>(),slots=new Set<string>();
  for(const row of byMed.get(medication.id)??[]){
   if(!row.tomado_em)continue;
   let evidence;try{evidence=readStockEvidence(row.estoque_movimento);}catch{if(inRange(row.data)||validInstant(row.tomado_em)&&inRange(civil(row.tomado_em)))invalid=true;continue;}
   const actual=validInstant(row.tomado_em)?civil(row.tomado_em):null;
   const receipt=evidence.state==='applied'?evidence.receipt:null;
   const moved=receipt?civil(receipt.appliedAt):null;
   if(!(actual&&inRange(actual))&&!(moved&&inRange(moved))&&!(inRange(row.data)&&!actual))continue;
   // A retroactive entry or later debit correction is not a measured daily consumption sample.
   if(!row.id||ids.has(row.id)||row.ignorado_em||!['scheduled','planned','sos','extra'].includes(row.dose_kind??'')||typeof row.quantidade!=='number'||!Number.isFinite(row.quantidade)||row.quantidade<=0||!actual||!inRange(actual)||!receipt||moved!==actual||!validInstant(row.created_at)||Date.parse(row.created_at)!==Date.parse(receipt.appliedAt)||Date.parse(row.tomado_em)>Date.parse(asOf)||receipt.user_id!==scope.user_id||receipt.person_id!==scope.person_id||receipt.medicationId!==medication.id||receipt.doseId!==row.id||receipt.basis!==stock.basis||receipt.unit!==stock.unit){invalid=true;continue;}
   const unit=readDoseUnit(row);if(unit.state!=='known'||(unit.fields.unidade_dose!==stock.unit&&!(unit.fields.unidade_dose==='drop'&&stock.unit==='ml'&&observedStockConversion(medication,stock)))){invalid=true;continue;}
   if(row.dose_kind==='scheduled'||row.dose_kind==='planned'){const key=JSON.stringify([row.data,row.horario]);if(slots.has(key)){invalid=true;continue;}slots.add(key);}
   ids.add(row.id);days.add(actual);sum+=receipt.amount;sample++;
  }
  if(invalid||days.size!==7||sample<7||!Number.isFinite(sum)||sum<=0)continue;
  const estimatedDays=stock.balance/(sum/7);if(!Number.isFinite(estimatedDays))continue;
  output.push({medicationId:medication.id,name:medication.nome,start,end,sample,observedDays:7,estimatedDays,source:'Saldo local e recibos de débito no ciclo de estoque atual'});
 }
 return output;
}
