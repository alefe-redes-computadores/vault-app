import type { DoseLog } from "@/lib/types";

/** V228: only explicitly registered slots; no inferred medication adherence. */
export type DoseDay = {
  date: string;
  taken: number;
  ignored: number;
  unconfirmed: number;
  conflicts: number;
  sos: number;
  extra: number;
  pendingSync: number;
};
export type DoseMonthResult = {
  days: DoseDay[];
  total: Omit<DoseDay, "date">;
  documentedDays: number;
  decisions: number;
  takenOfDecisions: number | null;
};
const DAY = 86_400_000;
function parseDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, date] = value.split("-").map(Number);
  const at = Date.UTC(year, month - 1, date);
  const d = new Date(at);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === date ? at : null;
}
function dayKey(ms: number): string { return new Date(ms).toISOString().slice(0,10); }
function validHour(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
  if (!match || +match[1] > 23 || +match[2] > 59) return null;
  return `${match[1].padStart(2,"0")}:${match[2]}`;
}
const zeros = (): Omit<DoseDay,"date"> => ({taken:0,ignored:0,unconfirmed:0,conflicts:0,sos:0,extra:0,pendingSync:0});
const empty = (date: string): DoseDay => ({date,...zeros()});
function status(records: DoseLog[]): "taken"|"ignored"|"unconfirmed"|"conflicts" {
  const taken = records.some(x => Boolean(x.tomado_em));
  const ignored = records.some(x => Boolean(x.ignorado_em));
  // Contradictory duplicate logs are not clinical confirmations.
  if (taken && ignored) return "conflicts";
  if (!taken && !ignored) return "unconfirmed";
  return taken ? "taken" : "ignored";
}
export function buildDoseMonthMetrics(input:{logs:DoseLog[];personId:string;userId:string;today:string;days?:number}): DoseMonthResult {
  const none: DoseMonthResult = {days:[],total:zeros(),documentedDays:0,decisions:0,takenOfDecisions:null};
  const end = parseDate(input.today);
  if (!input.personId?.trim() || !input.userId?.trim() || end === null) return none;
  const length = input.days === undefined ? 30 : Math.min(90,Math.max(1,Math.floor(input.days)));
  const dates = Array.from({length}, (_,i)=>dayKey(end - DAY * (length-1-i)));
  const rows = new Map(dates.map(date=>[date,empty(date)]));
  const slots = new Map<string,DoseLog[]>();
  const seen = new Set<string>();
  for (const log of input.logs) {
    if (log.person_id !== input.personId || log.user_id !== input.userId || !rows.has(log.data)) continue;
    if (parseDate(log.data) === null) continue;
    const hour = validHour(log.horario);
    if (!hour || !log.medicamento_id?.trim()) continue;
    const kind = log.dose_kind || "scheduled";
    if (kind !== "scheduled" && kind !== "planned" && kind !== "sos" && kind !== "extra") continue;
    // Source duplicate is not another event; SOS/extra distinct IDs remain distinct events.
    const duplicateKey = log.id || `${log.medicamento_id}|${log.data}|${hour}|${kind}|${log.tomado_em || ""}|${log.ignorado_em || ""}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);
    if (kind === "sos" || kind === "extra") {
      if (log.tomado_em) {
        const row = rows.get(log.data)!;
        row[kind] += 1;
        if (log.synced === false) row.pendingSync += 1;
      }
      continue;
    }
    const key = `${log.data}|${log.medicamento_id}|${hour}`;
    const group = slots.get(key) || [];
    group.push(log);
    slots.set(key,group);
  }
  for (const [key, group] of slots) {
    const date = key.split("|")[0];
    const row = rows.get(date)!;
    row[status(group)] += 1;
    if (group.some(x=>x.synced === false)) row.pendingSync += 1;
  }
  const days = [...rows.values()];
  const total = zeros();
  for (const day of days) for (const field of ["taken","ignored","unconfirmed","conflicts","sos","extra","pendingSync"] as const) total[field] += day[field];
  const decisions = total.taken + total.ignored;
  const documentedDays = days.filter(day=>day.taken+day.ignored+day.unconfirmed+day.conflicts+day.sos+day.extra>0).length;
  return {days,total,documentedDays,decisions,takenOfDecisions:decisions?Math.round(100*total.taken/decisions):null};
}
