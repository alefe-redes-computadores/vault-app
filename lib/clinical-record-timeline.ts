import type { DoseLog, Medicamento, RegistroSaude } from "@/lib/types";

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
function eventClock(value: string | undefined, fallback: string | undefined) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(fallback || "") ? fallback! : "00:00";
}
export function buildClinicalEvents(records: RegistroSaude[], doses: DoseLog[], medications: Medicamento[]): ClinicalEvent[] {
  const medicationMap = new Map(medications.filter(item => item.id).map(item => [item.id!, item]));
  const recordEvents: ClinicalEvent[] = records.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.data || "")).map(item => ({
    id: `record:${item.id || `${item.data}:${item.horario}:${item.nome}`}`,
    date: item.data || "",
    time: item.horario || "00:00",
    kind: "record",
    category: recordCategory(item),
    title: item.nome || "Registro de saúde",
    subtitle: item.valor_medicao || (typeof item.intensidade === "number" ? `Intensidade ${item.intensidade}/10` : undefined),
    intensity: item.intensidade,
    record: item,
  }));
  const doseEvents: ClinicalEvent[] = doses.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.data || "") && Boolean(item.tomado_em || item.ignorado_em)).map(item => {
    const medication = medicationMap.get(item.medicamento_id);
    const origin = item.dose_kind === "extra" ? "Dose extra" : item.dose_kind === "sos" ? "Dose SOS" : item.ignorado_em ? "Dose ignorada" : "Dose programada";
    return { id: `dose:${item.id || `${item.data}:${item.horario}:${item.medicamento_id}`}`, date: item.data || "", time: eventClock(item.tomado_em || item.ignorado_em, item.horario), kind: "dose", category: "dose", title: medication?.nome || "Medicamento removido", subtitle: `${origin}${item.quantidade ? ` · ${item.quantidade}` : ""}`, dose: item, medication };
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
