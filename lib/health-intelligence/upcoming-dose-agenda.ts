import type { HealthInsightContext } from "@/lib/health-insights";
import { buildDoseSlotIndex, resolveDoseSlot } from "@/lib/dose-slot-authority";

export type UpcomingDoseItem = {
  key: string;
  medicationId: string;
  medicationName: string;
  date: string;
  time: string;
  dayOffset: number;
  href: string;
};

export type UpcomingDoseAgenda = {
  today: UpcomingDoseItem[];
  future: UpcomingDoseItem[];
  next: UpcomingDoseItem | null;
  horizonDays: number;
  hiddenAfterHorizon: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
const dayAt = (date: string) => Date.parse(`${date}T12:00:00.000Z`);

/** Persisted pending slots only. Future rows remain planning, never overdue. */
export function buildUpcomingDoseAgenda(
  context: HealthInsightContext,
  horizonDays = 7,
  today = context.hoje || new Date().toISOString().slice(0, 10),
): UpcomingDoseAgenda {
  const safeToday = DATE_RE.test(today) ? today : new Date().toISOString().slice(0, 10);
  const horizon = Math.min(30, Math.max(1, Math.floor(horizonDays)));
  const end = new Date(dayAt(safeToday) + horizon * DAY).toISOString().slice(0, 10);
  const medicationNames = new Map(context.medicamentos.map(item => [item.id || "", item.nome]));
  const index = buildDoseSlotIndex(context.doseLogs, { userId: context.userId, personId: context.personId });
  const visible: UpcomingDoseItem[] = [];
  let hiddenAfterHorizon = 0;

  for (const group of index.values()) {
    const row = group[0];
    if (!row || row.data < safeToday) continue;
    const state = resolveDoseSlot(index, row.medicamento_id, row.data, row.horario).state;
    if (state !== "pending") continue;
    if (row.data > end) { hiddenAfterHorizon += 1; continue; }
    const dayOffset = Math.round((dayAt(row.data) - dayAt(safeToday)) / DAY);
    visible.push({
      key: `${row.medicamento_id}:${row.data}:${row.horario.slice(0, 5)}`,
      medicationId: row.medicamento_id,
      medicationName: medicationNames.get(row.medicamento_id) || "Medicamento",
      date: row.data,
      time: row.horario.slice(0, 5),
      dayOffset,
      href: `/saude/medicamentos/detalhes?id=${encodeURIComponent(row.medicamento_id)}`,
    });
  }
  visible.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.medicationName.localeCompare(b.medicationName, "pt-BR"));
  const todayItems = visible.filter(item => item.dayOffset === 0);
  const future = visible.filter(item => item.dayOffset > 0);
  return { today: todayItems, future, next: visible[0] || null, horizonDays: horizon, hiddenAfterHorizon };
}
