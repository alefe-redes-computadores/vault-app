import { buildDoseSlotIndex, doseSlotIsResolved, resolveDoseSlot } from "@/lib/dose-slot-authority";
import type { DoseLog, Medicamento } from "@/lib/types";

export type PendingBacklogDay = "Hoje" | "Ontem" | "Anterior";

export type PendingBacklogSlot = {
  medicamentoId: string;
  data: string;
  horario: string;
  diaLabel: PendingBacklogDay;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
}

function medicationKnownSince(medication: Medicamento): string | null {
  const candidates = [medication.created_at, medication.estoque_data_referencia]
    .map(value => String(value || "").slice(0, 10))
    .filter(value => DATE_RE.test(value))
    .sort();
  return candidates[0] || null;
}

/**
 * Builds a bounded review queue. Missing logs remain "unreviewed" evidence:
 * this function never calls them missed/non-adherent and never writes data.
 */
export function buildPendingDoseBacklog(input: {
  medications: readonly Medicamento[];
  logs: readonly DoseLog[];
  userId?: string;
  personId?: string;
  today: string;
  currentTime: string;
  lookbackDays?: number;
}): PendingBacklogSlot[] {
  const { medications, logs, userId, personId, today, currentTime } = input;
  const lookbackDays = Math.min(30, Math.max(1, input.lookbackDays ?? 7));
  const firstDate = addDays(today, -(lookbackDays - 1));
  const yesterday = addDays(today, -1);
  const index = buildDoseSlotIndex(logs, { userId, personId });
  const result: PendingBacklogSlot[] = [];

  for (const medication of medications) {
    if (!medication.id || medication.status === "descontinuado" || medication.tipo_uso !== "continuo") continue;
    if (userId && medication.user_id !== userId) continue;
    if (personId && medication.person_id !== personId) continue;

    const knownSince = medicationKnownSince(medication);
    const schedules = Array.from(new Set((medication.estoque_horarios || [])
      .map(value => String(value || "").slice(0, 5))
      .filter(value => TIME_RE.test(value)))).sort();

    for (let date = firstDate; date <= today; date = addDays(date, 1)) {
      // Do not manufacture historical slots before this medication existed locally.
      if (knownSince && date < knownSince) continue;
      for (const horario of schedules) {
        if (date === today && horario > currentTime) continue;
        if (doseSlotIsResolved(resolveDoseSlot(index, medication.id, date, horario))) continue;
        result.push({
          medicamentoId: medication.id,
          data: date,
          horario,
          diaLabel: date === today ? "Hoje" : date === yesterday ? "Ontem" : "Anterior",
        });
      }
    }
  }

  return result.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario) || a.medicamentoId.localeCompare(b.medicamentoId));
}
