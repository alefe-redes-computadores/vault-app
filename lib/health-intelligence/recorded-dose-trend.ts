/**
 * V223 — longitudinal evidence from explicitly resolved scheduled dose logs.
 * Pure, person/account-scoped, offline-safe: does not infer non-adherence from
 * missing logs, change prescriptions, mutate stock, or enqueue synchronization.
 */
import type { DoseLog } from "@/lib/types";
import { buildDoseSlotIndex, resolveDoseSlot } from "@/lib/dose-slot-authority";
export type RecordedDoseEvidence = DoseLog;

export interface RecordedDoseWindow {
  taken: number;
  skipped: number;
  decided: number;
  observedDays: number;
  takenPercent: number;
}

export interface RecordedDoseTrend {
  current: RecordedDoseWindow;
  previous: RecordedDoseWindow;
  deltaPoints: number;
  direction: "increase" | "decrease";
  confidence: "media" | "alta";
  sample: number;
  daysPerWindow: 14;
}

const DAY_MS = 86_400_000;
function strictDay(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  return check.getUTCFullYear() === year && check.getUTCMonth() + 1 === month && check.getUTCDate() === day ? ms : null;
}

type Decision = { day: string; age: number; taken: boolean; skipped: boolean };

export function compareRecordedDoseWindows(
  logs: readonly RecordedDoseEvidence[],
  userId: string,
  personId: string,
  todayISO: string,
): RecordedDoseTrend | null {
  if (!userId || !personId) return null;
  const reference = strictDay(todayISO);
  if (reference === null) return null;
  const slots = new Map<string, Decision>();
  const index=buildDoseSlotIndex(logs.filter(row=>!row.dose_kind||row.dose_kind==="scheduled"),{userId,personId});
  for (const group of index.values()) {
    const row=group[0]; if(!row)continue;
    const ms = strictDay(row.data);
    if (ms === null) continue;
    const age = Math.round((reference - ms) / DAY_MS);
    if (age < 0 || age >= 28) continue;
    const snapshot=resolveDoseSlot(index,row.medicamento_id,row.data,row.horario);
    const taken=snapshot.state==="taken",skipped=snapshot.state==="ignored";
    if (!taken&&!skipped) continue; // conflict and absence are not clinical evidence.
    const key = `${row.medicamento_id}\u001f${row.data}\u001f${row.horario}`;
    slots.set(key, { day: row.data, age, taken, skipped });
  }
  const summarize = (from: number, to: number): RecordedDoseWindow => {
    const days = new Set<string>();
    let taken = 0;
    let skipped = 0;
    for (const slot of slots.values()) {
      if (slot.age < from || slot.age > to) continue;
      if (slot.taken) taken++;
      if (slot.skipped) skipped++;
      days.add(slot.day);
    }
    const decided = taken + skipped;
    return { taken, skipped, decided, observedDays: days.size,
      takenPercent: decided ? Math.round(taken / decided * 100) : 0 };
  };
  const current = summarize(0, 13);
  const previous = summarize(14, 27);
  // Strict eligibility prevents noisy comparisons from sparse journals.
  if (current.decided < 6 || previous.decided < 6 ||
      current.observedDays < 3 || previous.observedDays < 3) return null;
  const deltaPoints = current.takenPercent - previous.takenPercent;
  if (Math.abs(deltaPoints) < 20) return null;
  return {
    current, previous, deltaPoints,
    direction: deltaPoints > 0 ? "increase" : "decrease",
    confidence: current.decided >= 14 && previous.decided >= 14 &&
      current.observedDays >= 7 && previous.observedDays >= 7 ? "alta" : "media",
    sample: current.decided + previous.decided,
    daysPerWindow: 14,
  };
}
