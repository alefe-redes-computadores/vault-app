import {classifyDoseRealization} from './dose-slot-authority';
import type { DoseLog, Medicamento, RegistroSaude } from "@/lib/types";
import {formatDoseQuantityB,formatSleepDurationB,originLabelB,metricKindB} from "@/lib/clinical-front-b-pure";

export type ClinicalEvent = {
  id: string;
  date: string;
  time: string;
  kind: "record" | "dose";
  category: "sintoma" | "medicao" | "humor" | "hidratacao" | "dose" | "outro";
  title: string;
  subtitle?: string;
  intensity?: number;
  record?: RegistroSaude;
  dose?: DoseLog;
  medication?: Medicamento;
};

export type ClinicalWeek = { key: string; label: string; events: ClinicalEvent[] };
export type ClinicalDay = { key: string; label: string; events: ClinicalEvent[] };
export type ClinicalMonth = { key: string; label: string; weeks: ClinicalWeek[]; events: ClinicalEvent[] };

const pad = (value: number) => String(value).padStart(2, "0");
export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const currentClinicalMonth = (date = new Date()) => localDateKey(date).slice(0, 7);
export function shiftClinicalMonth(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
export function clinicalMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1, 12));
}
function weekKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return localDateKey(date);
}
function shortDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(year, month - 1, day, 12)).replace(".", "");
}
function recordCategory(record: RegistroSaude): ClinicalEvent["category"] {
  if (record.tipo === "agua" || /agua|hidrata/i.test(record.nome || "")) return "hidratacao";
  if (record.categoria === "sintoma" || record.categoria === "medicao" || record.categoria === "humor") return record.categoria;
  return "outro";
}
/** Civil clock already declared by the source; empty means unknown, never midnight. */
function recordedClock(value: unknown): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(typeof value === "string" ? value.trim() : "");
  return match ? `${match[1]}:${match[2]}` : "";
}
/** Only a timestamp validated by the Macro02 authority reaches this formatter. */
function eventClock(value: string | null): string {
  return value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";
}
/** Display only. Scheduled/cadastral clocks never substitute for a missing confirmation. */
export function clinicalEventClockLabel(event: ClinicalEvent): string {
  const actual = recordedClock(event.time);
  if (actual) return actual;
  const declared = event.kind === "dose" ? recordedClock(event.dose?.horario) : "";
  return declared && (event.dose?.dose_kind === "scheduled" || event.dose?.dose_kind === "planned")
    ? `Sem horário confirmado · Previsto ${declared}`
    : "Sem horário registrado";
}
export function clinicalDoseClockSummary(events: readonly ClinicalEvent[]): string {
  if (events.length === 1) return clinicalEventClockLabel(events[0]);
  const known = events.filter(event => Boolean(recordedClock(event.time))).length;
  const unknown = events.length - known;
  if (!known) return "Sem horários registrados";
  if (!unknown) return `${known} horários registrados`;
  return `${known} com horário · ${unknown} sem horário`;
}
/** Group origin and realization are distinct. Same Macro02 classifier, no inferred outcome. */
export function clinicalDoseGroupStateLabel(events: readonly ClinicalEvent[]): string {
  const kinds = new Set(events.map(event => event.dose?.dose_kind));
  const kind = kinds.size === 1 ? events[0]?.dose?.dose_kind : undefined;
  const origin = kinds.size > 1 ? "Origens distintas" : kind === "sos" ? "SOS" : kind === "extra" ? "Extra" : kind === "planned" ? "Planejada" : kind === "scheduled" ? "Programada" : "Origem não informada";
  const states = events.map(event => classifyDoseRealization(event.dose || {}).state);
  const taken = states.filter(state => state === "taken").length;
  const ignored = states.filter(state => state === "ignored").length;
  const review = states.filter(state => state === "conflict" || state === "unknown").length;
  const pending = states.length - taken - ignored - review;
  const detail = [taken ? `${taken} ${taken === 1 ? "tomada" : "tomadas"}` : "", ignored ? `${ignored} ${ignored === 1 ? "ignorada" : "ignoradas"}` : "", review ? `${review} a conferir` : "", pending ? `${pending} sem confirmação` : ""].filter(Boolean).join(" · ");
  return [origin, detail].filter(Boolean).join(" · ");
}
export function buildClinicalEvents(records: RegistroSaude[], doses: DoseLog[], medications: Medicamento[]): ClinicalEvent[] {
  const medicationMap = new Map(medications.filter(item => item.id).map(item => [item.id!, item]));
  const recordEvents: ClinicalEvent[] = records.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.data || "")).map(item => ({
    id: `record:${item.id || `${item.data}:${item.horario}:${item.nome}`}`,
    date: item.data || "",
    time: recordedClock(item.horario),
    kind: "record",
    category: recordCategory(item),
    title: item.nome || "Registro de saúde",
    subtitle: metricKindB(item.tipo)==="sono" && typeof item.duracao_minutos==="number"
      ? [formatSleepDurationB(item.duracao_minutos),originLabelB(item.source)].filter(Boolean).join(" · ")
      : [item.valor_medicao || (typeof item.intensidade === "number" ? `Intensidade ${item.intensidade}/10` : ""),item.source?originLabelB(item.source):""].filter(Boolean).join(" · "),
    intensity: item.intensidade,
    record: item,
  }));
  const doseEvents: ClinicalEvent[] = doses.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.data || "") && Boolean(item.tomado_em || item.ignorado_em)).map(item => {
    const medication = medicationMap.get(item.medicamento_id);
    const evidence=classifyDoseRealization(item);
    const origin = item.dose_kind === "extra" ? "Dose extra" : item.dose_kind === "sos" ? "Dose SOS" : item.dose_kind==='planned'?"Dose planejada":item.dose_kind==='scheduled'?"Dose programada":"Dose de origem não informada";
    const state=evidence.state==='taken'?"Tomada registrada":evidence.state==='ignored'?"Dose ignorada — informada":"Registro a conferir";
    return { id: `dose:${item.id || `${item.data}:${item.horario}:${item.medicamento_id}`}`, date: item.data || "", time: eventClock(evidence.confirmedAt), kind: "dose", category: "dose", title: medication?.nome || "Referência do medicamento indisponível", subtitle: `${origin} · ${state}${evidence.confirmedAt?` · Instante registrado: ${evidence.confirmedAt}`:""}${evidence.state==='taken' && typeof item.quantidade==="number" ? ` · ${formatDoseQuantityB(item.quantidade)}` : ""}`, dose: item, medication };
  });
  return [...recordEvents, ...doseEvents].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
export function buildClinicalMonth(events: ClinicalEvent[], monthKey: string): ClinicalMonth {
  const selected = events.filter(item => item.date.startsWith(`${monthKey}-`));
  const groups = new Map<string, ClinicalEvent[]>();
  for (const event of selected) groups.set(weekKey(event.date), [...(groups.get(weekKey(event.date)) || []), event]);
  const weeks = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, items]) => {
    const end = new Date(`${key}T12:00:00`); end.setDate(end.getDate() + 6);
    return { key, label: `${shortDate(key)} – ${shortDate(localDateKey(end))}`, events: items };
  });
  return { key: monthKey, label: clinicalMonthLabel(monthKey), weeks, events: selected };
}

export function buildClinicalDays(events: ClinicalEvent[]): ClinicalDay[] {
  const groups = new Map<string, ClinicalEvent[]>();
  for (const event of events) groups.set(event.date, [...(groups.get(event.date) || []), event]);
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, items]) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    const today = localDateKey();
    const label = key === today ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(date).replace(".", "");
    return { key, label, events: items };
  });
}
