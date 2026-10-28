import type { HealthInsightContext } from "@/lib/health-insights";

export type ConsultationWindowSummary = {
  start: string | null;
  end: string;
  days: number | null;
  healthRecords: number;
  takenDoses: number;
  ignoredDoses: number;
  pendingDoseRecords: number;
  realizedWithdrawals: number;
  medicationUpdates: number;
  evidence: string[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const datePart = (value?: string | null) => String(value || "").slice(0, 10);
const distance = (from: string, to: string) => Math.max(1, Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1);

/**
 * Explicit events since the latest completed consultation. Missing days and
 * missing dose logs are deliberately absent: this summary never infers use,
 * symptoms, adherence or clinical change from silence.
 */
export function buildConsultationWindow(context: HealthInsightContext, today = context.hoje || ""): ConsultationWindowSummary {
  const end = datePart(today);
  if (!DAY.test(end)) {
    return {
      start: null,
      end,
      days: null,
      healthRecords: 0,
      takenDoses: 0,
      ignoredDoses: 0,
      pendingDoseRecords: 0,
      realizedWithdrawals: 0,
      medicationUpdates: 0,
      evidence: ["Data de referência indisponível; nenhum evento foi inferido."],
    };
  }
  const completed = context.consultas
    .filter(item => item.person_id === context.personId && item.status === "realizada" && DAY.test(datePart(item.data)) && datePart(item.data) <= end)
    .sort((a, b) => datePart(b.data).localeCompare(datePart(a.data)))[0];
  const start = completed ? datePart(completed.data) : null;
  const within = (value?: string | null) => {
    const day = datePart(value);
    return DAY.test(day) && day <= end && (!start || day >= start);
  };
  const ownedDoseLogs = context.doseLogs.filter(item => item.person_id === context.personId && within(item.data));
  const takenDoses = ownedDoseLogs.filter(item => Boolean(item.tomado_em)).length;
  const ignoredDoses = ownedDoseLogs.filter(item => !item.tomado_em && Boolean(item.ignorado_em)).length;
  const pendingDoseRecords = ownedDoseLogs.filter(item => !item.tomado_em && !item.ignorado_em && item.dose_kind === "planned").length;
  const healthRecords = context.registrosSaude.filter(item => item.person_id === context.personId && within(item.data)).length;
  const realizedWithdrawals = context.retiradas.filter(item => item.person_id === context.personId && item.status === "realizada" && within(item.realizada_em || item.data)).length;
  const medicationUpdates = context.medicamentos.filter(item => item.person_id === context.personId && within(item.updated_at) && (!start || datePart(item.updated_at) > start)).length;
  const evidence = [
    start ? `Janela desde a consulta realizada em ${start}` : "Sem consulta realizada anterior identificada",
    healthRecords ? `${healthRecords} registro(s) de saúde informado(s)` : "Nenhum registro de saúde informado na janela",
    takenDoses || ignoredDoses ? `${takenDoses} dose(s) tomada(s) e ${ignoredDoses} ignorada(s), explicitamente registradas` : "Sem desfechos de dose registrados na janela",
    pendingDoseRecords ? `${pendingDoseRecords} agendamento(s) explícito(s) ainda sem desfecho` : "Sem agendamento explícito pendente na janela",
    realizedWithdrawals ? `${realizedWithdrawals} retirada(s) registrada(s) como realizada(s)` : "Sem retirada realizada registrada na janela",
    medicationUpdates ? `${medicationUpdates} medicamento(s) atualizado(s) depois da consulta` : "Sem alteração de medicamento registrada depois da consulta",
  ];
  return { start, end, days: start ? distance(start, end) : null, healthRecords, takenDoses, ignoredDoses, pendingDoseRecords, realizedWithdrawals, medicationUpdates, evidence };
}
