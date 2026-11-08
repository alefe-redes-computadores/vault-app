import type { DoseLog, Medicamento, RegistroSaude } from "@/lib/types";
import type { BrainV5Alert } from "@/lib/health-intelligence/brain-v5";
import { indexConfirmedDoseSafetyEpisodes, type ClinicalDoseSafetyEpisode } from "@/lib/clinical-safety-episodes";

export interface ClinicalMonthDoseRow {
  id: string;
  date: string;
  scheduledTime: string | null;
  confirmedAt: string | null;
  medication: string;
  doseKind: string;
  status: "taken" | "ignored";
  quantity: number | null;
  reason: string | null;
  safety: ClinicalDoseSafetyEpisode | null;
}
export interface ClinicalMonthRecordRow { date: string; title: string; detail: string; }
export interface ClinicalMonthBrainInsight { detectedAt: string; title: string; message: string; severity: string; feedback: string | null; }
export interface ClinicalMonthReport {
  monthKey: string;
  monthLabel: string;
  doses: ClinicalMonthDoseRow[];
  records: ClinicalMonthRecordRow[];
  alerts: ClinicalDoseSafetyEpisode[];
  brainInsights: ClinicalMonthBrainInsight[];
  summary: { taken: number; ignored: number; sos: number; extra: number; daysWithRecords: number };
}
function dateIsValid(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
function validClock(clock: string): string | null { return /^([01]\d|2[0-3]):[0-5]\d$/.test(clock) ? clock : null; }

export function buildClinicalMonthReport({
  monthKey, userId, personId, doseLogs, medications, healthRecords, brainLedger,
}: {
  monthKey: string; userId: string; personId: string;
  doseLogs: readonly DoseLog[]; medications: readonly Medicamento[];
  healthRecords: readonly RegistroSaude[]; brainLedger: readonly BrainV5Alert[];
}): ClinicalMonthReport {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error("Mês do relatório inválido.");
  const ownLogs = doseLogs.filter(log => log.user_id === userId && log.person_id === personId &&
    log.data.startsWith(`${monthKey}-`) && dateIsValid(log.data) && Boolean(log.tomado_em || log.ignorado_em));
  const medMap = new Map<string, string>(medications.filter(med => med.user_id === userId && med.person_id === personId && med.id).map(med => [med.id!, med.nome] as const));
  const safety = indexConfirmedDoseSafetyEpisodes(ownLogs, brainLedger, userId, personId);
  const doses: ClinicalMonthDoseRow[] = ownLogs.map((log): ClinicalMonthDoseRow => ({
    id: log.id || `${log.medicamento_id}:${log.data}:${log.horario}`,
    date: log.data,
    scheduledTime: validClock(log.horario),
    confirmedAt: log.tomado_em || log.ignorado_em || null,
    medication: medMap.get(log.medicamento_id) || "Medicamento sem cadastro acessível",
    doseKind: log.dose_kind || "scheduled",
    status: log.tomado_em ? "taken" : "ignored",
    quantity: typeof log.quantidade === "number" && Number.isFinite(log.quantidade) && log.quantidade > 0 ? log.quantidade : null,
    reason: log.motivo?.trim() || null,
    safety: log.id ? safety.get(log.id) || null : safety.get(log.tomado_em || "") || null,
  })).sort((a, b) => b.date.localeCompare(a.date) || (b.confirmedAt || b.scheduledTime || "").localeCompare(a.confirmedAt || a.scheduledTime || "") || a.id.localeCompare(b.id));
  const records = healthRecords.filter(record => record.user_id === userId && record.person_id === personId &&
    record.data.startsWith(`${monthKey}-`) && dateIsValid(record.data)).map(record => ({
      date: record.data,
      title: record.nome || record.tipo || "Registro de saúde",
      detail: [record.valor_medicao, typeof record.intensidade === "number" ? `Intensidade ${record.intensidade}/10` : "", record.observacoes].filter(Boolean).join(" · "),
    })).sort((a, b) => b.date.localeCompare(a.date));
  const alerts = doses.flatMap(row => row.safety ? [row.safety] : []);
  // Detection is attributed to its stored detection date, never backdated to an event.
  const brainInsights: ClinicalMonthBrainInsight[] = brainLedger.filter(item =>
    item.person_id === personId && !item.insight_id.startsWith("quantidade-confirmada-") &&
    typeof item.first_detected_at === "string" && item.first_detected_at.startsWith(`${monthKey}-`) &&
    dateIsValid(item.first_detected_at.slice(0, 10))
  ).map(item => ({
    detectedAt: item.first_detected_at,
    title: item.snapshot.titulo,
    message: item.snapshot.mensagem,
    severity: item.snapshot.gravidade_seguranca || "informativa",
    feedback: item.feedback || null,
  })).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  const days = new Set([...doses.map(row => row.date), ...records.map(row => row.date)]);
  const [year, month] = monthKey.split("-").map(Number);
  return {
    monthKey,
    monthLabel: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1, 12)),
    doses, records, alerts, brainInsights,
    summary: {
      taken: doses.filter(row => row.status === "taken").length,
      ignored: doses.filter(row => row.status === "ignored").length,
      sos: doses.filter(row => row.status === "taken" && row.doseKind === "sos").length,
      extra: doses.filter(row => row.status === "taken" && row.doseKind === "extra").length,
      daysWithRecords: days.size,
    },
  };
}
