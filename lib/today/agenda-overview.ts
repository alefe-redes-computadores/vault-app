// VAULT M76: presentation-only agenda projection. No persistence or dose/stock authority.
export type VisualAgendaDose = {
  horario: string;
  medicamentoNome?: string;
  tomada: boolean;
  ignorada: boolean;
  isDataConflict?: boolean;
  isAvulsa?: boolean;
  isSintoma?: boolean;
  isExpectedUnconfirmed?: boolean;
};
export type VisualAgendaReminder = { id: string; time: string; title: string };
export type VisualAgendaAppointment = { id?: string; horario?: string | null; tipo: string };
export type VisualAgendaRow = {
  time: string;
  title: string;
  context: string;
  kind: "dose" | "reminder" | "appointment";
  destination: "hoje-doses" | "hoje-agenda" | "hoje-compromissos";
};
export type VisualAgendaOverview = {
  rows: VisualAgendaRow[];
  hiddenCount: number;
  dueDoseCount: number;
  untimedAppointments: number;
  /** First event at or after the provided clock; none is invented. */
  nextUpcoming?: VisualAgendaRow | null;
};
const validTime = (value: unknown): value is string =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const appointmentNames: Record<string, string> = {
  consulta: "Consulta", cirurgia: "Cirurgia", exame: "Exame", retirada: "Retirada",
};
/**
 * Small cross-category preview only; canonical category groups remain untouched.
 * Never invent a timestamp or turn reminders into confirmed events.
 */
export function buildTodayAgendaOverview(input: {
  doses: readonly VisualAgendaDose[];
  reminders: readonly VisualAgendaReminder[];
  appointments: readonly VisualAgendaAppointment[];
  now: string;
}, visibleLimit = 4): VisualAgendaOverview {
  const candidates: Array<VisualAgendaRow & { order: number }> = [];
  let order = 0;
  let untimedAppointments = 0;
  let dueDoseCount = 0;
  for (const dose of input.doses) {
    if (!validTime(dose.horario) || dose.tomada || dose.ignorada || dose.isDataConflict ||
      dose.isAvulsa || dose.isSintoma || dose.isExpectedUnconfirmed) continue;
    if (validTime(input.now) && dose.horario <= input.now) dueDoseCount++;
    candidates.push({ time: dose.horario, title: dose.medicamentoNome || "Medicamento",
      context: validTime(input.now) && dose.horario > input.now ? "Dose prevista" : "Dose a revisar",
      kind: "dose", destination: "hoje-doses", order: order++ });
  }
  for (const reminder of input.reminders) {
    if (!validTime(reminder.time)) continue;
    candidates.push({ time: reminder.time, title: reminder.title || "Lembrete de saúde",
      context: "Lembrete informativo · não comprova realização",
      kind: "reminder", destination: "hoje-agenda", order: order++ });
  }
  for (const item of input.appointments) {
    if (!validTime(item.horario)) { untimedAppointments++; continue; }
    candidates.push({ time: item.horario, title: appointmentNames[item.tipo] || "Compromisso",
      context: "Compromisso · confira a situação",
      kind: "appointment", destination: "hoje-compromissos", order: order++ });
  }
  // Stable sort: equal clock times keep their original source order.
  candidates.sort((a, b) => a.time.localeCompare(b.time) || a.order - b.order);
  const next = validTime(input.now) ? candidates.find(item => item.time >= input.now) : undefined;
  const nextUpcoming: VisualAgendaRow | null = next ? {time:next.time,title:next.title,context:next.context,kind:next.kind,destination:next.destination} : null;
  const limit = Math.max(1, Math.min(8, Math.trunc(Number.isFinite(visibleLimit) ? visibleLimit : 4)));
  return {
    rows: candidates.slice(0, limit).map(({order: _order, ...row}) => row),
    hiddenCount: Math.max(0, candidates.length - limit),
    dueDoseCount,
    untimedAppointments,
    nextUpcoming,
  };
}
