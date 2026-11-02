import { addDaysToLocalDate } from "@/lib/health-utils";

type MedicationLike = {
  id?: string;
  nome: string;
  estoque_horarios?: string[];
  estoque_data_referencia?: string;
  data_receita?: string;
  created_at?: string;
};

type RenewalLike = {
  medicamento_id?: string;
  data_aquisicao?: string | null;
  data?: string | null;
};

type DoseLogLike = {
  medicamento_id?: string;
  person_id?: string;
  data?: string;
  horario?: string;
};

export type TodayRetroReviewSummary = {
  medicamento: MedicationLike;
  startDate: string | null;
  horarios: string[];
  totalSlots: number;
  confirmedSlots: number;
  pendingSlots: number;
  pendingDates: string[];
  firstPendingDate: string | null;
  confidence: "limited" | "bounded";
};

/**
 * Rebuilds review candidates from the currently known schedule. Missing logs
 * remain unconfirmed evidence. Ausência de confirmação não comprova tomada nem
 * esquecimento: this function never infers that a dose was missed.
 */
export function buildTodayRetroReviewSummary(input: {
  enabled: boolean;
  medicationId: string | null;
  medications: MedicationLike[];
  renewals: RenewalLike[];
  doseLogs: DoseLogLike[];
  personId?: string | null;
  today: string;
}): TodayRetroReviewSummary | null {
  if (!input.enabled || !input.medicationId) return null;
  const medicamento = input.medications.find(item => item.id === input.medicationId);
  if (!medicamento) return null;

  const horarios = Array.from(new Set((medicamento.estoque_horarios ?? [])
    .map(value => String(value || "").trim())
    .filter(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)))).sort();
  const acquisitionDates = input.renewals
    .filter(item => item.medicamento_id === medicamento.id)
    .map(item => String(item.data_aquisicao || item.data || "").slice(0, 10))
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  const createdDate = String(medicamento.created_at || "").slice(0, 10);
  const startDate = acquisitionDates[0] ||
    (/^\d{4}-\d{2}-\d{2}$/.test(createdDate) ? createdDate : null) ||
    medicamento.estoque_data_referencia || medicamento.data_receita || null;
  const empty = (confidence: TodayRetroReviewSummary["confidence"]): TodayRetroReviewSummary => ({
    medicamento, startDate, horarios, totalSlots: 0, confirmedSlots: 0,
    pendingSlots: 0, pendingDates: [], firstPendingDate: null, confidence,
  });
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || horarios.length === 0) {
    return empty("limited");
  }

  const yesterday = addDaysToLocalDate(input.today, -1);
  if (!yesterday || startDate > yesterday) return empty("bounded");
  const logsBySlot = new Set(input.doseLogs
    .filter(log => log.medicamento_id === medicamento.id && log.person_id === input.personId)
    .map(log => `${log.data}|${log.horario}`));
  const pendingDates: string[] = [];
  let cursor = startDate;
  let totalSlots = 0;
  let confirmedSlots = 0;
  let guard = 0;
  while (cursor <= yesterday && guard < 3660) {
    for (const horario of horarios) {
      totalSlots += 1;
      if (logsBySlot.has(`${cursor}|${horario}`)) confirmedSlots += 1;
      else if (!pendingDates.includes(cursor)) pendingDates.push(cursor);
    }
    const nextDate = addDaysToLocalDate(cursor, 1);
    if (!nextDate || nextDate === cursor) break;
    cursor = nextDate;
    guard += 1;
  }
  pendingDates.sort();
  return {
    medicamento, startDate, horarios, totalSlots, confirmedSlots,
    pendingSlots: Math.max(0, totalSlots - confirmedSlots),
    pendingDates, firstPendingDate: pendingDates[0] || null, confidence: "bounded",
  };
}
