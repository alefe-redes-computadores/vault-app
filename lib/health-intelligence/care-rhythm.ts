/**
 * VAULT V225 — observational, offline-first relationships between recorded
 * sleep, walks, declared mood, symptoms and actual dose events.
 *
 * Never infer missed medication, symptom absence, a diagnosis or causality.
 * Works only with the supplied person-scoped snapshot; no I/O or persistence.
 */
import type { HealthInsight, HealthInsightContext } from "@/lib/health-insights";

export type CareRhythmPeriod = 7 | 30 | 90;
export interface CareRhythmDay {
  date: string;
  sleepMinutes: number | null;
  walkMinutes: number | null;
  mood: "muito_bem" | "bem" | "neutro" | "triste" | "muito_triste" | null;
  symptomRecords: number;
  takenDoses: number;
  sosExtraDoses: number;
}
export interface CareRhythmSummary {
  periodDays: CareRhythmPeriod;
  /** Seven days, including undocumented days (represented by null, never zero). */
  recentDays: CareRhythmDay[];
  sleep: { days: number; averageMinutes: number | null };
  walk: { days: number; recordedMinutes: number };
  mood: { declaredDays: number; positiveDays: number; negativeDays: number };
  symptoms: { documentedDays: number; records: number };
  doses: { taken: number; sosExtra: number; ignored: number };
  overlap: { sleepAndSymptoms: number; walkAndMood: number; sleepAndSosExtra: number };
  dataQuality: { excludedInvalid: number; dayCoverage: number; localUnsynced: number; ownershipConflict: boolean };
  /** Like-for-like comparison: *both* the factor and the outcome were recorded on each day. */
  factorComparisons: CareFactorComparison[];
}
export interface CareFactorComparison {
  id: "sleep-mood" | "walk-mood";
  title: string;
  factorLabel: string;
  outcomeLabel: string;
  thresholdMinutes: number;
  below: { days: number; averageScore: number };
  atLeast: { days: number; averageScore: number };
  difference: number;
  /** Descriptive sample quality, never clinical reliability. */
  confidence: "baixa" | "media";
  limitation: string;
}

type HealthRecord = HealthInsightContext["registrosSaude"][number];
const DAY_MS = 86_400_000;
const MOODS = new Set(["muito_bem", "bem", "neutro", "triste", "muito_triste"]);

function utcDay(input: string | null | undefined): number | null {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [year, month, day] = input.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const result = new Date(utc);
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day ? utc : null;
}
function dateOf(utc: number): string { return new Date(utc).toISOString().slice(0, 10); }
function currentDay(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
function moodOf(record: HealthRecord): CareRhythmDay["mood"] {
  if (record.categoria !== "humor" || record.tipo !== "humor") return null;
  const token = typeof record.contexto === "string" && record.contexto.startsWith("[humor:v1]") ? record.contexto.slice(10) : "";
  return MOODS.has(token) ? token as CareRhythmDay["mood"] : null;
}
function measuredMinutes(record: HealthRecord, kind: "sono" | "caminhada"): number | null {
  if (record.tipo !== kind || record.unidade_medida?.trim().toLowerCase() !== "min") return null;
  const amount = record.duracao_minutos ?? record.valor_numerico;
  return typeof amount === "number" && Number.isInteger(amount) && amount >= 1 && amount <= 1440 ? amount : null;
}
function isSymptom(record: HealthRecord): boolean { return record.categoria === "sintoma"; }

const MOOD_POINTS: Record<NonNullable<CareRhythmDay["mood"]>, number> = {
  muito_triste: 1, triste: 2, neutro: 3, bem: 4, muito_bem: 5,
};
/**
 * Observed-on-both-sides factor comparison, inspired by factor reports but
 * designed not to turn missing walking/sleep/mood into zero or "no factor".
 * 3+ distinct days in both groups are mandatory; no imputation, no prediction.
 */
function compareMoodFactor(days: CareRhythmDay[], type: "sleep" | "walk", thresholdMinutes: number): CareFactorComparison | null {
  const below: number[] = [], atLeast: number[] = [];
  for (const day of days) {
    const minutes = type === "sleep" ? day.sleepMinutes : day.walkMinutes;
    if (minutes === null || day.mood === null) continue;
    const score = MOOD_POINTS[day.mood];
    (minutes < thresholdMinutes ? below : atLeast).push(score);
  }
  if (below.length < 3 || atLeast.length < 3) return null;
  const average = (group:number[]) => Math.round(group.reduce((sum,value)=>sum+value,0)/group.length * 10)/10;
  const a=average(below), b=average(atLeast);
  return {
    id: type === "sleep" ? "sleep-mood" : "walk-mood",
    title: type === "sleep" ? "Sono e humor declarados" : "Caminhada e humor declarados",
    factorLabel: type === "sleep" ? "Sono registrado" : "Caminhada registrada",
    outcomeLabel: "Humor declarado (escala ordinal de 1 a 5)",
    thresholdMinutes,
    below: {days:below.length, averageScore:a},
    atLeast: {days:atLeast.length, averageScore:b},
    difference: Math.round((b-a)*10)/10,
    confidence: below.length >= 7 && atLeast.length >= 7 ? "media" : "baixa",
    limitation: "Compara apenas dias com as duas informações registradas. Diferenças descritivas não demonstram causa, efeito terapêutico ou necessidade de mudar a medicação.",
  };
}

/**
 * The most recent daily sleep/mood record wins. Walks are additive only when
 * their events have unique IDs; duplicates are not added twice.
 */
export function buildCareRhythm(context: HealthInsightContext, periodDays: CareRhythmPeriod = 30, todayISO?: string): CareRhythmSummary {
  const today = utcDay(todayISO || context.hoje || currentDay());
  const empty = (): CareRhythmSummary => ({
    periodDays, recentDays: [], sleep: { days: 0, averageMinutes: null },
    walk: { days: 0, recordedMinutes: 0 }, mood: { declaredDays: 0, positiveDays: 0, negativeDays: 0 },
    symptoms: { documentedDays: 0, records: 0 }, doses: { taken: 0, sosExtra: 0, ignored: 0 },
    overlap: { sleepAndSymptoms: 0, walkAndMood: 0, sleepAndSosExtra: 0 },
    dataQuality: { excludedInvalid: 0, dayCoverage: 0, localUnsynced: 0, ownershipConflict: false },
    factorComparisons: [],
  });
  if (today === null || !context.personId) return empty();
  // The canonical context is already user-scoped. Refuse an accidentally mixed
  // account snapshot instead of attributing another account's records to this person.
  const ownerIds = new Set([
    ...context.registrosSaude.filter(r=>r.person_id===context.personId).map(r=>r.user_id),
    ...context.doseLogs.filter(d=>d.person_id===context.personId).map(d=>d.user_id),
  ].filter((id):id is string=>Boolean(id)));
  if (ownerIds.size > 1) {
    const result=empty();
    result.dataQuality.ownershipConflict=true;
    return result;
  }
  const start = today - (periodDays - 1) * DAY_MS;
  type DayState = CareRhythmDay & { sleepSort: string; moodSort: string };
  const dates = new Map<string, DayState>();
  for (let at = start; at <= today; at += DAY_MS) {
    const date = dateOf(at);
    dates.set(date, { date, sleepMinutes: null, walkMinutes: null, mood: null,
      symptomRecords: 0, takenDoses: 0, sosExtraDoses: 0, sleepSort: "", moodSort: "" });
  }
  const seenRecords = new Set<string>();
  const seenDoses = new Set<string>();
  let excludedInvalid = 0, ignored = 0, localUnsynced=0;
  for (const record of context.registrosSaude) {
    if (record.person_id !== context.personId) continue;
    const at = utcDay(record.data);
    if (at === null) { excludedInvalid++; continue; }
    if (at < start || at > today) continue;
    // Identical immutable events only count once. A separate entry (ID) on the same day counts.
    const key = record.id ? `id:${record.id}` : `row:${record.data}:${record.horario}:${record.categoria}:${record.tipo}:${record.nome}:${record.valor_medicao ?? ""}`;
    if (seenRecords.has(key)) continue;
    seenRecords.add(key);
    if (record.synced === false) localUnsynced++;
    const day = dates.get(record.data)!;
    const order = `${record.data}T${record.horario || "00:00"}|${record.updated_at || ""}|${record.id || ""}`;
    const sleep = measuredMinutes(record, "sono");
    if (sleep !== null && order >= day.sleepSort) { day.sleepMinutes = sleep; day.sleepSort = order; }
    const walk = measuredMinutes(record, "caminhada");
    if (walk !== null) day.walkMinutes = Math.min(1440, (day.walkMinutes ?? 0) + walk);
    const mood = moodOf(record);
    if (mood !== null && order >= day.moodSort) { day.mood = mood; day.moodSort = order; }
    if (isSymptom(record)) day.symptomRecords++;
  }
  // Collapse duplicate scheduled slots before counting. A resolved record wins
  // over an unresolved legacy duplicate; SOS/extra are separate real events.
  const scheduledSlots = new Map<string, HealthInsightContext["doseLogs"][number]>();
  const independent: HealthInsightContext["doseLogs"] = [];
  const resolution = (dose: HealthInsightContext["doseLogs"][number]) =>
    dose.tomado_em ? 2 : dose.ignorado_em ? 1 : 0;
  for (const dose of context.doseLogs) {
    if (dose.dose_kind && dose.dose_kind !== "scheduled") { independent.push(dose); continue; }
    const key=`${dose.person_id||""}:${dose.medicamento_id}:${dose.data}:${dose.horario}`;
    const existing=scheduledSlots.get(key);
    if (!existing || resolution(dose) > resolution(existing) ||
      (resolution(dose) === resolution(existing) && (dose.updated_at||"") > (existing.updated_at||""))) {
      scheduledSlots.set(key,dose);
    }
  }
  for (const dose of [...scheduledSlots.values(), ...independent]) {
    if (dose.person_id !== context.personId) continue;
    const at = utcDay(dose.data);
    if (at === null) { excludedInvalid++; continue; }
    if (at < start || at > today) continue;
    // Scheduled events are unique per medication/date/time irrespective of a
    // legacy duplicate ID. Genuine SOS and extra events remain separate by ID.
    const origin = dose.dose_kind || "scheduled";
    const key = origin === "scheduled"
      ? `slot:${dose.medicamento_id}:${dose.data}:${dose.horario}`
      : dose.id ? `id:${dose.id}` : `event:${dose.medicamento_id}:${dose.data}:${dose.horario}:${origin}`;
    if (seenDoses.has(key)) continue;
    seenDoses.add(key);
    if (dose.synced === false) localUnsynced++;
    const day = dates.get(dose.data)!;
    if (dose.tomado_em && dose.dose_kind !== "planned") {
      day.takenDoses++;
      if (dose.dose_kind === "sos" || dose.dose_kind === "extra") day.sosExtraDoses++;
    } else if (dose.ignorado_em && dose.dose_kind !== "planned") ignored++;
  }
  const days = [...dates.values()];
  const slept = days.filter(d => d.sleepMinutes !== null);
  const walked = days.filter(d => d.walkMinutes !== null);
  const moods = days.filter(d => d.mood !== null);
  const symptoms = days.filter(d => d.symptomRecords > 0);
  const covered = days.filter(d => d.sleepMinutes !== null || d.walkMinutes !== null || d.mood !== null || d.symptomRecords > 0 || d.takenDoses > 0);
  return {
    periodDays,
    recentDays: days.slice(-7).map(({sleepSort: _sleepSort, moodSort: _moodSort, ...day}) => day),
    sleep: { days: slept.length, averageMinutes: slept.length ? Math.round(slept.reduce((sum,d) => sum+d.sleepMinutes!,0)/slept.length) : null },
    walk: { days: walked.length, recordedMinutes: walked.reduce((sum,d) => sum+d.walkMinutes!,0) },
    mood: { declaredDays: moods.length, positiveDays: moods.filter(d => d.mood === "bem" || d.mood === "muito_bem").length, negativeDays: moods.filter(d => d.mood === "triste" || d.mood === "muito_triste").length },
    symptoms: { documentedDays: symptoms.length, records: symptoms.reduce((sum,d) => sum+d.symptomRecords,0) },
    doses: { taken: days.reduce((sum,d) => sum+d.takenDoses,0), sosExtra: days.reduce((sum,d) => sum+d.sosExtraDoses,0), ignored },
    overlap: {
      sleepAndSymptoms: days.filter(d => d.sleepMinutes !== null && d.symptomRecords > 0).length,
      walkAndMood: days.filter(d => d.walkMinutes !== null && d.mood !== null).length,
      sleepAndSosExtra: days.filter(d => d.sleepMinutes !== null && d.sosExtraDoses > 0).length,
    },
    dataQuality: { excludedInvalid, dayCoverage: covered.length, localUnsynced, ownershipConflict:false },
    factorComparisons: [
      compareMoodFactor(days, "sleep", 420),
      compareMoodFactor(days, "walk", 30),
    ].filter((item):item is CareFactorComparison=>item!==null),
  };
}

export function buildCareRhythmInsights(context: HealthInsightContext): HealthInsight[] {
  const summary = buildCareRhythm(context, 30);
  const results: HealthInsight[] = [];
  const add = (id:string,title:string,message:string,count:number,evidence:string[],sources:string[]) => {
    results.push({ id, kind:"observation", categoria:"rotina", titulo:title, mensagem:message,
      urgencia:"baixa", confianca: count >= 4 ? "media" : "baixa", amostra:count, periodoDias:30,
      entidadeTipo:"linha_cuidado",link:"/saude/registros/relatorio", evidencias:evidence,
      fontesInternas:sources,coberturaDias:{observados:summary.dataQuality.dayCoverage,total:30},
      acaoSegura:"Confira a linha de cuidado e compartilhe o histórico com o profissional responsável.",
      gravidadeSeguranca:"informativa",
      limitacaoSeguranca:"Dias não registrados são desconhecidos. Coincidência no mesmo dia não demonstra causalidade nem justifica modificar medicamentos." });
  };
  if (summary.sleep.days >= 4 && summary.overlap.sleepAndSymptoms >= 2) {
    add("care-rhythm-sleep-symptoms-30","Sono e sintomas registrados nos mesmos dias",
      `Houve registros de sono em ${summary.sleep.days} dia(s) e de sintomas em ${summary.symptoms.documentedDays} dia(s) nos últimos 30 dias. Ambos foram registrados nos mesmos ${summary.overlap.sleepAndSymptoms} dia(s). Não sabemos se os dias sem sintomas documentados foram livres de sintomas.`,
      summary.overlap.sleepAndSymptoms,[`${summary.overlap.sleepAndSymptoms} dia(s) com sono e sintoma documentados`, `${summary.sleep.days} dia(s) com duração de sono válida em minutos`], ["Registros de sono", "Diário de sintomas"]);
  }
  if (summary.walk.days >= 4 && summary.overlap.walkAndMood >= 2) {
    add("care-rhythm-walk-mood-30","Atividade e humor declarados nos mesmos dias",
      `Caminhada foi registrada em ${summary.walk.days} dia(s) e humor foi declarado em ${summary.mood.declaredDays} dia(s). Ambos aparecem nos mesmos ${summary.overlap.walkAndMood} dia(s), sem indicar que a caminhada alterou o humor.`,
      summary.overlap.walkAndMood,[`${summary.overlap.walkAndMood} dia(s) de sobreposição`, "Humor declarado manualmente; ausência não equivale a neutro"],["Caminhadas registradas", "Humor declarado"]);
  }
  if (summary.sleep.days >= 4 && summary.overlap.sleepAndSosExtra >= 2) {
    add("care-rhythm-sleep-sos-30","Sono e doses SOS/extra nos mesmos dias",
      `Em ${summary.overlap.sleepAndSosExtra} dia(s), houve registro de sono e ao menos uma dose SOS ou extra efetivamente registrada. Isso não permite atribuir alterações de sono à medicação.`,
      summary.overlap.sleepAndSosExtra,[`${summary.sleep.days} dia(s) com sono registrado`,`${summary.doses.sosExtra} dose(s) SOS/extra registradas no período`],["Registros de sono","Histórico de doses SOS/extra"]);
  }
  for (const factor of summary.factorComparisons) {
    // This is not an effect estimate; it stays an observation with a low/medium
    // sampling badge, never an alert that could trigger treatment changes.
    results.push({
      id:`care-factor-${factor.id}-${summary.periodDays}`,
      kind:"observation",categoria:"rotina",titulo:factor.title,
      mensagem:`Entre os dias em que ${factor.factorLabel.toLowerCase()} e humor foram informados, o humor médio foi ${factor.below.averageScore}/5 em ${factor.below.days} dia(s) abaixo de ${factor.thresholdMinutes} minutos e ${factor.atLeast.averageScore}/5 em ${factor.atLeast.days} dia(s) com esse tempo ou mais. Isso é uma comparação descritiva, não uma relação de causa e efeito.`,
      urgencia:"baixa",confianca:factor.confidence,amostra:factor.below.days+factor.atLeast.days,periodoDias:summary.periodDays,
      entidadeTipo:"linha_cuidado",link:"/saude/registros/relatorio",
      evidencias:[`Abaixo do limiar: ${factor.below.days} dia(s)`, `No limiar ou acima: ${factor.atLeast.days} dia(s)`, factor.limitation],
      fontesInternas:[factor.factorLabel,"Humor declarado"],
      coberturaDias:{observados:factor.below.days+factor.atLeast.days,total:summary.periodDays},
      acaoSegura:"Leve os registros ao profissional responsável caso queira investigar o padrão.",
      gravidadeSeguranca:"informativa",limitacaoSeguranca:factor.limitation,
    });
  }
  return results;
}
